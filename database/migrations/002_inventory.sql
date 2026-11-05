CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), environment environment_name NOT NULL,
  name varchar(120) NOT NULL CHECK (btrim(name) <> ''), product varchar(120) NOT NULL CHECK (btrim(product) <> ''),
  owner varchar(120) NOT NULL CHECK (btrim(owner) <> ''), criticality text NOT NULL CHECK (criticality IN ('critical','high','normal','low')),
  evidence_reference varchar(500) NOT NULL, version integer NOT NULL DEFAULT 1 CHECK (version>0),
  UNIQUE(id,environment)
);
CREATE UNIQUE INDEX services_unique_name ON services(environment,lower(name));
CREATE INDEX services_page ON services(environment,id);
CREATE TABLE endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL, environment environment_name NOT NULL,
  url text NOT NULL CHECK (url LIKE 'https://%'), enabled boolean NOT NULL DEFAULT false CHECK (NOT enabled),
  FOREIGN KEY (service_id,environment) REFERENCES services(id,environment), UNIQUE(service_id,url)
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL DEFAULT now(),
  actor uuid REFERENCES users, environment environment_name, action text NOT NULL, target uuid,
  request_key varchar(128), digest char(64), result jsonb, UNIQUE(actor,action,request_key)
);
DO $grants$
DECLARE web_role text := current_database() || '_web';
BEGIN
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON services TO %I',web_role);
  EXECUTE format('GRANT INSERT ON audit_events TO %I',web_role);
  EXECUTE format('GRANT SELECT(actor,action,request_key,digest,result) ON audit_events TO %I',web_role);
END $grants$;
