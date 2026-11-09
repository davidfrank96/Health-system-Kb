CREATE TABLE metric_definitions (
 name text PRIMARY KEY, unit text NOT NULL, aggregation text NOT NULL,
 UNIQUE(name,unit,aggregation)
);
INSERT INTO metric_definitions VALUES
 ('cpu_utilization','percent','mean'),('memory_utilization','percent','mean'),
 ('memory_available','bytes','mean'),('filesystem_free','bytes','mean'),('disk_utilization','percent','mean'),
 ('load_1','load','mean'),('public_outbound_bandwidth','Mbps','rate'),
 ('app_cpu','percent','mean'),('app_memory','percent','mean'),('app_restarts','count','count'),
 ('database_utilization','percent','mean'),('requests','count','sum'),('failed_requests','count','sum'),
 ('latency','ms','mean'),('observed_availability','percent','mean'),('normalized_ru','percent','max'),('throttled_requests','count','sum');

CREATE TABLE integrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL, environment environment_name NOT NULL,
 provider text NOT NULL CHECK(provider IN ('digitalocean','azure','gcp','firebase','other')),
 name varchar(120) NOT NULL, resource_type varchar(80) NOT NULL, identifier varchar(160) NOT NULL,
 region varchar(80), component varchar(63), instance varchar(63),
 enabled boolean NOT NULL DEFAULT false, version int NOT NULL DEFAULT 1,
 cost_status text NOT NULL DEFAULT 'unverified' CHECK(cost_status IN ('unverified','blocked','verified_no_incremental_cost')),
 review jsonb, permission_reviewed boolean GENERATED ALWAYS AS (COALESCE(review->'permissionReviewed'='true'::jsonb,false)) STORED, expires_at timestamptz, last_success timestamptz, collection_state text NOT NULL DEFAULT 'disabled',
 FOREIGN KEY(service_id,environment) REFERENCES services(id,environment),
 UNIQUE(id,service_id,environment,provider), UNIQUE NULLS NOT DISTINCT(environment,provider,identifier,component,instance),
 CHECK(NOT enabled OR (provider='digitalocean' AND cost_status='verified_no_incremental_cost' AND expires_at IS NOT NULL AND review IS NOT NULL))
);
CREATE TABLE resource_capabilities(resource_id uuid REFERENCES integrations,metric_name text REFERENCES metric_definitions,PRIMARY KEY(resource_id,metric_name));
CREATE TABLE import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor uuid NOT NULL REFERENCES users, environment environment_name NOT NULL,
 digest char(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(actor,environment,digest), UNIQUE(id,actor,environment)
);
CREATE TABLE metric_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid, service_id uuid NOT NULL,environment environment_name NOT NULL,
 provider text NOT NULL CHECK(provider IN ('digitalocean','azure','gcp','firebase','other')),
 metric_name text NOT NULL, unit text NOT NULL, aggregation text NOT NULL,
 value double precision NOT NULL CHECK(value>=0 AND value<'Infinity'::float8 AND (unit<>'percent' OR value<=100) AND (unit<>'count' OR trunc(value)=value)),
 observed_at timestamptz NOT NULL, collected_at timestamptz NOT NULL DEFAULT now(), ingested_at timestamptz NOT NULL DEFAULT now(),
 source_method text NOT NULL CHECK(source_method IN ('manual','csv','provider_api')), source_reference varchar(500) NOT NULL,
 note varchar(1000) NOT NULL, entered_by uuid REFERENCES users, batch_id uuid, supersedes_id uuid UNIQUE, correction_reason varchar(500),
 current_value boolean NOT NULL DEFAULT true,
 FOREIGN KEY(service_id,environment) REFERENCES services(id,environment),
 FOREIGN KEY(resource_id,service_id,environment,provider) REFERENCES integrations(id,service_id,environment,provider),
 FOREIGN KEY(resource_id,metric_name) REFERENCES resource_capabilities,
 FOREIGN KEY(metric_name,unit,aggregation) REFERENCES metric_definitions(name,unit,aggregation),
 FOREIGN KEY(batch_id,entered_by,environment) REFERENCES import_batches(id,actor,environment),
 CHECK((source_method='provider_api' AND resource_id IS NOT NULL AND entered_by IS NULL AND batch_id IS NULL AND supersedes_id IS NULL)
 OR (source_method IN ('csv','manual') AND entered_by IS NOT NULL AND batch_id IS NOT NULL)),
 CHECK((supersedes_id IS NULL)=(correction_reason IS NULL)), CHECK(observed_at<=ingested_at+interval '2 minutes')
);
CREATE UNIQUE INDEX metric_current_identity ON metric_snapshots(service_id,provider,metric_name,resource_id,observed_at,(source_method='provider_api')) NULLS NOT DISTINCT WHERE current_value;
CREATE INDEX metric_history ON metric_snapshots(environment,observed_at DESC,id) WHERE current_value;
CREATE FUNCTION validate_metric_correction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.supersedes_id IS NOT NULL THEN
 UPDATE public.metric_snapshots SET current_value=false WHERE id=NEW.supersedes_id AND current_value AND
 source_method IN ('csv','manual') AND (service_id,provider,metric_name,observed_at)=(NEW.service_id,NEW.provider,NEW.metric_name,NEW.observed_at)
 AND resource_id IS NOT DISTINCT FROM NEW.resource_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid correction' USING ERRCODE='23505'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER metric_correction BEFORE INSERT ON metric_snapshots FOR EACH ROW EXECUTE FUNCTION validate_metric_correction();
CREATE VIEW manual_readings AS SELECT * FROM metric_snapshots WHERE source_method IN ('manual','csv') WITH CASCADED CHECK OPTION;
CREATE VIEW provider_readings AS SELECT * FROM metric_snapshots WHERE source_method='provider_api' WITH CASCADED CHECK OPTION;

CREATE TABLE metric_daily (
 service_id uuid NOT NULL,environment environment_name NOT NULL,provider text NOT NULL,resource_id uuid,metric_name text NOT NULL,
 source_method text NOT NULL,day date NOT NULL, sample_count bigint NOT NULL,total numeric NOT NULL,minimum float8 NOT NULL,maximum float8 NOT NULL,
 UNIQUE NULLS NOT DISTINCT(service_id,provider,resource_id,metric_name,source_method,day)
);
-- Move expired rows and accumulate the same rows exactly once in one transaction.
CREATE FUNCTION retain_metrics() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 WITH expired AS (
 DELETE FROM public.metric_snapshots WHERE id IN (SELECT id FROM public.metric_snapshots WHERE observed_at<now()-interval '30 days' ORDER BY observed_at LIMIT 2000 FOR UPDATE SKIP LOCKED)
 RETURNING *)
 INSERT INTO public.metric_daily
 SELECT service_id,environment,provider,resource_id,metric_name,source_method,(observed_at AT TIME ZONE 'UTC')::date,count(*),sum(value::numeric),min(value),max(value)
 FROM expired WHERE current_value GROUP BY 1,2,3,4,5,6,7
 ON CONFLICT(service_id,provider,resource_id,metric_name,source_method,day) DO UPDATE SET
 sample_count=metric_daily.sample_count+excluded.sample_count,total=metric_daily.total+excluded.total,
 minimum=least(metric_daily.minimum,excluded.minimum),maximum=greatest(metric_daily.maximum,excluded.maximum);
 DELETE FROM public.metric_daily WHERE ctid IN (SELECT ctid FROM public.metric_daily WHERE day < (now() AT TIME ZONE 'UTC')::date - interval '12 months' LIMIT 2000);
END $$;
REVOKE ALL ON FUNCTION retain_metrics() FROM PUBLIC;
CREATE FUNCTION disable_metric_resource(resource uuid,revision int) RETURNS SETOF integer LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 UPDATE public.integrations SET enabled=false,collection_state='disabled',version=version+1 WHERE id=resource AND version=revision RETURNING version;
$$;
REVOKE ALL ON FUNCTION disable_metric_resource(uuid,int) FROM PUBLIC;
DO $grants$
DECLARE w text:=current_database()||'_web'; c text:=current_database()||'_collector';
BEGIN
 EXECUTE format('GRANT SELECT ON metric_definitions, resource_capabilities,metric_snapshots,metric_daily,import_batches TO %I',w);
 EXECUTE format('GRANT SELECT(id,service_id,environment,provider,name,resource_type,identifier,region,enabled,version,cost_status,permission_reviewed,expires_at,last_success,collection_state) ON integrations TO %I',w);
 EXECUTE format('GRANT EXECUTE ON FUNCTION disable_metric_resource(uuid,int) TO %I',w);
 EXECUTE format('GRANT INSERT ON import_batches TO %I',w);
 EXECUTE format('GRANT SELECT,INSERT(resource_id,service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_method,source_reference,note,entered_by,batch_id,supersedes_id,correction_reason) ON manual_readings TO %I',w);
 EXECUTE format('GRANT SELECT ON integrations,resource_capabilities,metric_definitions,provider_readings TO %I',c);
 EXECUTE format('GRANT INSERT(resource_id,service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_method,source_reference,note) ON provider_readings TO %I',c);
 EXECUTE format('GRANT UPDATE(last_success,collection_state) ON integrations TO %I',c);
 EXECUTE format('GRANT EXECUTE ON FUNCTION retain_metrics() TO %I',c);
END $grants$;

CREATE TABLE metric_request_budget (
 resource_id uuid REFERENCES integrations,day date NOT NULL,requests integer NOT NULL,series integer NOT NULL,
 last_request timestamptz NOT NULL, PRIMARY KEY(resource_id,day)
);
CREATE FUNCTION reserve_metric_request(resource uuid,metric text,requested_series int) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE config public.integrations%ROWTYPE;
BEGIN
 PERFORM pg_advisory_xact_lock(1262634318,3);
 SELECT * INTO config FROM public.integrations WHERE id=resource AND enabled AND cost_status='verified_no_incremental_cost' AND expires_at>clock_timestamp() AND collection_state NOT IN ('permission_denied','rate_limited') FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT FROM public.resource_capabilities WHERE resource_id=resource AND metric_name=metric)
 OR requested_series NOT BETWEEN 1 AND 16 OR requested_series IS NULL OR COALESCE((config.review->>'dailyRequests')::int,0) NOT BETWEEN 1 AND 96
 OR COALESCE((config.review->>'dailySeries')::int,0) NOT BETWEEN requested_series AND 1536 THEN RETURN false;END IF;
 IF (SELECT coalesce(sum(requests),0)>=96 OR coalesce(sum(series),0)+requested_series>1536 FROM public.metric_request_budget WHERE day=(now() AT TIME ZONE 'UTC')::date) THEN RETURN false;END IF;
 INSERT INTO public.metric_request_budget VALUES(resource,(now() AT TIME ZONE 'UTC')::date,1,requested_series,clock_timestamp())
 ON CONFLICT(resource_id,day) DO UPDATE SET requests=metric_request_budget.requests+1, series=metric_request_budget.series+excluded.series,last_request=excluded.last_request
 WHERE metric_request_budget.requests<(config.review->>'dailyRequests')::int AND metric_request_budget.series+requested_series<=(config.review->>'dailySeries')::int AND metric_request_budget.last_request<clock_timestamp()-interval '1 second';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION reserve_metric_request(uuid,text,int) FROM PUBLIC;
DO $$ BEGIN EXECUTE format('GRANT EXECUTE ON FUNCTION reserve_metric_request(uuid,text,int) TO %I',current_database()||'_collector');END $$;
