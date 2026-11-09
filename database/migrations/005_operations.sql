CREATE TABLE qa_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL, environment environment_name NOT NULL,
 source text NOT NULL, run_key varchar(200) NOT NULL, method text NOT NULL CHECK(method IN ('manual','webhook')),
 actor uuid REFERENCES users, source_reference varchar(500) NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz NOT NULL, payload jsonb NOT NULL, digest char(64) NOT NULL,
 FOREIGN KEY(service_id,environment) REFERENCES services(id,environment), UNIQUE(source,run_key), UNIQUE(id,source),
 CHECK((method='manual')=(actor IS NOT NULL)), CHECK(payload->>'status' IN ('passed','failed','cancelled','error'))
);
CREATE INDEX qa_period ON qa_runs(environment,completed_at DESC,id);
CREATE TABLE qa_deliveries(source text NOT NULL,event_id uuid NOT NULL,run_id uuid NOT NULL,digest char(64) NOT NULL,
 PRIMARY KEY(source,event_id),FOREIGN KEY(run_id,source) REFERENCES qa_runs(id,source) ON DELETE CASCADE);
CREATE TABLE incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),service_id uuid NOT NULL,environment environment_name NOT NULL,
 title varchar(200) NOT NULL, severity text NOT NULL CHECK(severity IN ('low','medium','high','critical')),
 owner_name varchar(120) NOT NULL, created_by uuid NOT NULL REFERENCES users, created_at timestamptz NOT NULL DEFAULT now(),
 started_at timestamptz, status text NOT NULL DEFAULT 'investigating' CHECK(status IN ('investigating','identified','monitoring','resolved')),
 updated_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz, version int NOT NULL DEFAULT 1 CHECK(version>0),
 CHECK((status='resolved')=(resolved_at IS NOT NULL)), FOREIGN KEY(service_id,environment) REFERENCES services(id,environment)
);
CREATE TABLE incident_updates (
 incident_id uuid NOT NULL REFERENCES incidents ON DELETE CASCADE,version int NOT NULL,actor uuid NOT NULL REFERENCES users,
 occurred_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),status text NOT NULL,
 message varchar(4000) NOT NULL,evidence jsonb NOT NULL DEFAULT '[]',PRIMARY KEY(incident_id,version)
);
CREATE INDEX incident_period ON incidents(environment,created_at DESC,id);
ALTER TABLE maintenance_windows ADD COLUMN title varchar(200) NOT NULL DEFAULT 'Scheduled maintenance',
 ADD COLUMN reason varchar(1000), ADD COLUMN version int NOT NULL DEFAULT 1,
 ADD COLUMN created_by uuid REFERENCES users, ADD COLUMN cancelled_at timestamptz;
CREATE INDEX maintenance_period ON maintenance_windows(service_id,starts_at,ends_at) WHERE cancelled_at IS NULL;
CREATE FUNCTION guard_window_edit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (OLD.cancelled_at IS NOT NULL OR OLD.starts_at<=clock_timestamp() OR NEW.service_id<>OLD.service_id OR NEW.environment<>OLD.environment)
 THEN RAISE EXCEPTION 'Window locked' USING ERRCODE='23P01'; END IF;
 IF (TG_OP='UPDATE' OR NEW.created_by IS NOT NULL) AND NEW.starts_at<=clock_timestamp() THEN RAISE EXCEPTION 'Historical window' USING ERRCODE='23P01';END IF;
 IF NEW.cancelled_at IS NULL THEN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.service_id::text,4));
 IF EXISTS(SELECT FROM maintenance_windows WHERE service_id=NEW.service_id AND id<>NEW.id AND cancelled_at IS NULL AND starts_at<NEW.ends_at AND ends_at>NEW.starts_at)
 THEN RAISE EXCEPTION 'Overlapping window' USING ERRCODE='23P01'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER maintenance_edit BEFORE INSERT OR UPDATE ON maintenance_windows FOR EACH ROW EXECUTE FUNCTION guard_window_edit();
CREATE OR REPLACE FUNCTION monitor_samples(target uuid, first_day date, last_day date)
RETURNS TABLE(day date,samples text,watermark timestamptz) LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT d::date, string_agg(CASE
  WHEN NOT EXISTS(SELECT 1 FROM jsonb_array_elements(e.enabled_windows) w WHERE (w->>'required')::boolean IS DISTINCT FROM false AND instant>=(w->>'start')::timestamptz AND (w->>'end' IS NULL OR instant<(w->>'end')::timestamptz)) THEN 'N'
  WHEN EXISTS(SELECT 1 FROM maintenance_windows m WHERE m.cancelled_at IS NULL AND m.service_id=e.service_id AND m.environment=e.environment AND instant>=m.starts_at AND instant<m.ends_at) THEN 'M'
  WHEN h.outcome='success' THEN 'S' WHEN h.outcome='failure' THEN 'F' ELSE 'U' END,'' ORDER BY instant), max(h.observed_at)
 FROM endpoints e CROSS JOIN generate_series(first_day::timestamp,last_day::timestamp,interval '1 day') d
 CROSS JOIN LATERAL generate_series(d AT TIME ZONE 'UTC',(d+interval '1 day') AT TIME ZONE 'UTC'-interval '15 minutes',interval '15 minutes') instant
 LEFT JOIN health_checks h ON h.endpoint_id=e.id AND h.scheduled_slot=instant
 WHERE e.id=target AND last_day-first_day BETWEEN 0 AND 92 GROUP BY d
$$;

DO $$ DECLARE w text:=current_database()||'_web';BEGIN
 EXECUTE format('GRANT SELECT,INSERT ON qa_runs,qa_deliveries,incidents,incident_updates TO %I',w);
 EXECUTE format('GRANT UPDATE(status,version,updated_at,resolved_at) ON incidents TO %I',w);
 EXECUTE format('GRANT INSERT(service_id,environment,starts_at,ends_at,approval_reference,title,reason,created_by), UPDATE(starts_at,ends_at,title,reason,version,cancelled_at) ON maintenance_windows TO %I',w);
END $$;

-- Only closed or expired evidence beyond the longest supported historical query is eligible.
CREATE FUNCTION retain_operations() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 DELETE FROM public.qa_runs WHERE id IN (SELECT id FROM public.qa_runs WHERE received_at<now()-interval '367 days' ORDER BY received_at LIMIT 250 FOR UPDATE SKIP LOCKED);
 DELETE FROM public.incidents WHERE id IN (SELECT id FROM public.incidents WHERE status='resolved' AND resolved_at<now()-interval '367 days' AND NOT EXISTS(SELECT FROM public.incident_updates u WHERE u.incident_id=incidents.id AND u.recorded_at>=now()-interval '367 days') ORDER BY resolved_at LIMIT 100 FOR UPDATE SKIP LOCKED);
 DELETE FROM public.maintenance_windows WHERE id IN (SELECT id FROM public.maintenance_windows WHERE ends_at<now()-interval '367 days' ORDER BY ends_at LIMIT 100 FOR UPDATE SKIP LOCKED);
END $$;
REVOKE ALL ON FUNCTION retain_operations() FROM PUBLIC;
DO $$ BEGIN EXECUTE format('GRANT EXECUTE ON FUNCTION retain_operations() TO %I',current_database()||'_collector');END $$;
