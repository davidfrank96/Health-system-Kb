CREATE TYPE environment_name AS ENUM ('development','staging','production');
CREATE TYPE staff_role AS ENUM ('viewer','operator','admin');
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issuer text NOT NULL, subject text NOT NULL,
  email varchar(254) NOT NULL, disabled boolean NOT NULL DEFAULT false, UNIQUE (issuer,subject)
);
CREATE TABLE memberships (
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, environment environment_name NOT NULL,
  role staff_role NOT NULL, PRIMARY KEY (user_id,environment)
);
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '8 hours')
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE FUNCTION revoke_staff_sessions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    DELETE FROM public.sessions WHERE user_id=NEW.id;
  ELSE
    IF TG_OP <> 'INSERT' THEN DELETE FROM public.sessions WHERE user_id=OLD.user_id; END IF;
    IF TG_OP <> 'DELETE' THEN DELETE FROM public.sessions WHERE user_id=NEW.user_id; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER membership_change AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW EXECUTE FUNCTION revoke_staff_sessions();
CREATE TRIGGER identity_change AFTER UPDATE OF disabled,issuer,subject ON users
  FOR EACH ROW EXECUTE FUNCTION revoke_staff_sessions();
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $grants$
DECLARE web_role text := current_database() || '_web';
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I',web_role);
  EXECUTE format('GRANT SELECT ON users,memberships TO %I',web_role);
  EXECUTE format('GRANT SELECT, INSERT, DELETE, UPDATE(last_seen) ON sessions TO %I',web_role);
END $grants$;
