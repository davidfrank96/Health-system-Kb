ALTER TABLE endpoints DROP CONSTRAINT endpoints_enabled_check;
ALTER TABLE endpoints DROP CONSTRAINT endpoints_url_check;
ALTER TABLE endpoints ADD CONSTRAINT endpoint_safe_scheme CHECK (url LIKE 'https://%' OR (current_database()='kbean_test' AND environment='development' AND url LIKE 'http://127.0.0.1:%'));
ALTER TABLE endpoints ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
 ADD COLUMN required boolean NOT NULL DEFAULT true,
 ADD COLUMN expected_codes integer[] NOT NULL DEFAULT ARRAY[200] CHECK(cardinality(expected_codes) BETWEEN 1 AND 10 AND 200 <= ALL(expected_codes) AND 599 >= ALL(expected_codes) AND NOT (expected_codes && ARRAY[300,301,302,303,304,305,306,307,308])),
 ADD COLUMN failure_threshold integer NOT NULL DEFAULT 2 CHECK(failure_threshold BETWEEN 2 AND 5),
 ADD COLUMN recovery_threshold integer NOT NULL DEFAULT 2 CHECK(recovery_threshold BETWEEN 2 AND 5),
 ADD COLUMN slow_ms integer NOT NULL DEFAULT 2000 CHECK(slow_ms BETWEEN 500 AND 9000),
 ADD COLUMN clear_ms integer NOT NULL DEFAULT 1000 CHECK(clear_ms BETWEEN 100 AND 8000 AND clear_ms<slow_ms),
 ADD COLUMN approved_url text, ADD COLUMN approval_reference varchar(500),
 ADD COLUMN approved_at timestamptz,
 ADD COLUMN enabled_windows jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(enabled_windows)='array' AND jsonb_array_length(enabled_windows)<=5000),
 ADD COLUMN state jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN latest jsonb,
 ADD CONSTRAINT endpoint_approval CHECK(NOT enabled OR (approved_url IS NOT NULL AND approved_url=url AND approved_at IS NOT NULL AND approval_reference IS NOT NULL)),
 ADD CONSTRAINT endpoint_scope UNIQUE(id,environment);
CREATE FUNCTION endpoint_configuration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text := to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
 IF TG_OP='UPDATE' AND (NEW.service_id<>OLD.service_id OR NEW.environment<>OLD.environment) THEN RAISE EXCEPTION 'scope immutable'; END IF;
 IF TG_OP='UPDATE' AND NEW.url<>OLD.url THEN
   NEW.approved_url=NULL; NEW.approved_at=NULL; NEW.approval_reference=NULL; NEW.enabled=false;
 END IF;
 IF TG_OP='INSERT' AND NEW.enabled THEN NEW.enabled_windows=jsonb_build_array(jsonb_build_object('start',t,'end',NULL,'required',NEW.required));
 ELSIF TG_OP='UPDATE' AND (NEW.enabled<>OLD.enabled OR (NEW.enabled AND NEW.required<>OLD.required)) THEN
   IF OLD.enabled THEN NEW.enabled_windows=jsonb_set(OLD.enabled_windows,ARRAY[(jsonb_array_length(OLD.enabled_windows)-1)::text,'end'],to_jsonb(t)); END IF;
   IF NEW.enabled THEN NEW.enabled_windows=NEW.enabled_windows || jsonb_build_array(jsonb_build_object('start',t,'end',NULL,'required',NEW.required));
   ELSE NEW.enabled_windows=jsonb_set(OLD.enabled_windows,ARRAY[(jsonb_array_length(OLD.enabled_windows)-1)::text,'end'],to_jsonb(t)); END IF;
 END IF;
 IF TG_OP='UPDATE' AND (NEW.version<>OLD.version OR NEW.enabled<>OLD.enabled) THEN
   -- A configuration boundary breaks streaks, but cannot erase an open outage.
   NEW.state=OLD.state || '{"failures":0,"successes":0,"slow":0,"fast":0,"lastSlot":null,"condition":"unknown","gap":true}'::jsonb;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION endpoint_configuration() FROM PUBLIC;
CREATE TRIGGER endpoint_config BEFORE INSERT OR UPDATE ON endpoints FOR EACH ROW EXECUTE FUNCTION endpoint_configuration();
CREATE INDEX endpoint_environment ON endpoints(environment,id);
CREATE TABLE collection_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deployment_environment text NOT NULL CHECK(deployment_environment IN ('development','test')),
 scheduled_slot timestamptz NOT NULL CHECK(mod(extract(epoch FROM scheduled_slot)::numeric,900)=0),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(), finished_at timestamptz,
 status text NOT NULL CHECK(status IN ('running','completed','error')), attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 40),
 error_code text CHECK(error_code IN ('collector','deadline','target_limit')), UNIQUE(deployment_environment,scheduled_slot), UNIQUE(id,scheduled_slot)
);
CREATE TABLE health_checks (
 endpoint_id uuid NOT NULL, environment environment_name NOT NULL, run_id uuid NOT NULL,
 scheduled_slot timestamptz NOT NULL CHECK(mod(extract(epoch FROM scheduled_slot)::numeric,900)=0),
 observed_at timestamptz NOT NULL, collected_at timestamptz NOT NULL, ingested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 outcome text NOT NULL CHECK(outcome IN ('success','failure','unknown')), failure text CHECK(failure IN ('timeout','dns','tls','connection_refused','http_status','network','collector','security_policy','response_limit')),
 http_status integer CHECK(http_status BETWEEN 100 AND 599), latency_ms integer CHECK(latency_ms BETWEEN 0 AND 300000),
 attempts integer NOT NULL CHECK(attempts BETWEEN 0 AND 2), configuration_version integer NOT NULL,
 maintenance boolean NOT NULL DEFAULT false,
 PRIMARY KEY(endpoint_id,scheduled_slot), FOREIGN KEY(run_id,scheduled_slot) REFERENCES collection_runs(id,scheduled_slot), FOREIGN KEY(endpoint_id,environment) REFERENCES endpoints(id,environment),
 CHECK(observed_at <= ingested_at+interval '2 minutes'), CHECK(collected_at>=observed_at),
 CHECK((outcome='success' AND failure IS NULL AND http_status IS NOT NULL) OR outcome<>'success')
);
CREATE INDEX health_history ON health_checks(environment,scheduled_slot DESC);
CREATE TABLE downtime_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), endpoint_id uuid NOT NULL, environment environment_name NOT NULL,
 first_failed_at timestamptz NOT NULL, confirmed_at timestamptz NOT NULL, first_recovery_at timestamptz, resolved_at timestamptz,
 first_failed_slot timestamptz NOT NULL, confirmed_slot timestamptz NOT NULL, recovery_slot timestamptz,
 evidence_gap boolean NOT NULL DEFAULT false,
 FOREIGN KEY(endpoint_id,environment) REFERENCES endpoints(id,environment), CHECK(confirmed_at>=first_failed_at), CHECK(resolved_at IS NULL OR resolved_at>=first_recovery_at)
);
CREATE UNIQUE INDEX one_open_outage ON downtime_events(endpoint_id) WHERE resolved_at IS NULL;
CREATE INDEX downtime_history ON downtime_events(environment,confirmed_at DESC);
CREATE TABLE maintenance_windows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL, environment environment_name NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, approval_reference varchar(500) NOT NULL,
 FOREIGN KEY(service_id,environment) REFERENCES services(id,environment), CHECK(ends_at>starts_at), CHECK(ends_at-starts_at<=interval '30 days')
);
CREATE TABLE daily_summaries (
 endpoint_id uuid NOT NULL, environment environment_name NOT NULL, day date NOT NULL, method integer NOT NULL DEFAULT 1 CHECK(method=1),
 samples char(96) NOT NULL CHECK(samples ~ '^[SFUMN]{96}$'), watermark timestamptz,
 PRIMARY KEY(endpoint_id,day), FOREIGN KEY(endpoint_id,environment) REFERENCES endpoints(id,environment)
);
-- N=not enabled; M=approved maintenance; U=missing or unknown. Evidence remains in health_checks.
CREATE FUNCTION monitor_samples(target uuid, first_day date, last_day date)
RETURNS TABLE(day date,samples text,watermark timestamptz) LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT d::date, string_agg(CASE
  WHEN NOT EXISTS(SELECT 1 FROM jsonb_array_elements(e.enabled_windows) w WHERE (w->>'required')::boolean IS DISTINCT FROM false AND instant>=(w->>'start')::timestamptz AND (w->>'end' IS NULL OR instant<(w->>'end')::timestamptz)) THEN 'N'
  WHEN EXISTS(SELECT 1 FROM maintenance_windows m WHERE m.service_id=e.service_id AND m.environment=e.environment AND instant>=m.starts_at AND instant<m.ends_at) THEN 'M'
  WHEN h.outcome='success' THEN 'S' WHEN h.outcome='failure' THEN 'F' ELSE 'U' END,'' ORDER BY instant), max(h.observed_at)
 FROM endpoints e CROSS JOIN generate_series(first_day::timestamp,last_day::timestamp,interval '1 day') d
 CROSS JOIN LATERAL generate_series(d AT TIME ZONE 'UTC',(d+interval '1 day') AT TIME ZONE 'UTC'-interval '15 minutes',interval '15 minutes') instant
 LEFT JOIN health_checks h ON h.endpoint_id=e.id AND h.scheduled_slot=instant
 WHERE e.id=target AND last_day-first_day BETWEEN 0 AND 92 GROUP BY d
$$;
REVOKE ALL ON FUNCTION monitor_samples(uuid,date,date) FROM PUBLIC;
DO $grants$
DECLARE web_role text := current_database()||'_web'; collector_role text := current_database()||'_collector';
BEGIN
 EXECUTE format('GRANT SELECT ON endpoints,health_checks,collection_runs,downtime_events,daily_summaries,maintenance_windows TO %I',web_role);
 EXECUTE format('GRANT INSERT(service_id,environment,url,required,expected_codes,failure_threshold,recovery_threshold,slow_ms,clear_ms) ON endpoints TO %I',web_role);
 EXECUTE format('GRANT UPDATE(url,enabled,required,expected_codes,failure_threshold,recovery_threshold,slow_ms,clear_ms,version) ON endpoints TO %I',web_role);
 EXECUTE format('GRANT EXECUTE ON FUNCTION monitor_samples(uuid,date,date) TO %I,%I',web_role,collector_role);
 EXECUTE format('GRANT USAGE ON SCHEMA public TO %I',collector_role);
 EXECUTE format('GRANT SELECT ON endpoints,services,health_checks,collection_runs,downtime_events,daily_summaries,maintenance_windows TO %I',collector_role);
 EXECUTE format('GRANT UPDATE(state,latest) ON endpoints TO %I',collector_role);
 EXECUTE format('GRANT INSERT,UPDATE ON collection_runs,downtime_events,daily_summaries TO %I',collector_role);
 EXECUTE format('GRANT INSERT,DELETE ON health_checks TO %I',collector_role);
 EXECUTE format('GRANT DELETE ON collection_runs,downtime_events,daily_summaries TO %I',collector_role);
END $grants$;
