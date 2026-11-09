#!/usr/bin/env bash
set -euo pipefail
umask 077
mode=${1:?Expected local, integration, browser, or verify}
shift
case "$mode" in local) tier=development;; integration|browser|verify|monitoring) tier=test;; *) exit 2;; esac
# Prefer Postgres.app; a compatible native distribution on PATH is also supported.
for bindir in "/Applications/Postgres.app/Contents/Versions/18/bin" "$HOME/Applications/Postgres.app/Contents/Versions/18/bin"; do
  if [[ -x "$bindir/initdb" ]]; then export PATH="$bindir:$PATH"; break; fi
done
scratch=$(mktemp -d /tmp/kbean-pg.XXXXXXXX)
state=$scratch
owned_server=false
dev_lock=false
clean(){ env -i PATH="$PATH" LC_ALL=C "$@"; }
cleanup(){
  if [[ "$owned_server" == true && -f "$state/data/postmaster.pid" ]]; then
    clean pg_ctl -D "$state/data" -m fast -w stop || return 1
  fi
  if [[ "$dev_lock" == true ]]; then rmdir "$state/launcher.lock"; fi
  # scratch comes exclusively from mktemp above. Persistent development data is outside it.
  rm -r -- "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ -n "${KBEAN_CI_PG_PORT:-}" ]]; then
  [[ "${GITHUB_ACTIONS:-}" == true && "$tier" == test ]] || exit 2
  dbhost=127.0.0.1; dbport=$KBEAN_CI_PG_PORT
  bootstrap=${KBEAN_CI_BOOTSTRAP_PASSWORD:?Missing CI fixture password}
else
  [[ "$(postgres --version)" =~ PostgreSQL\)\ 18\. ]] || { echo 'PostgreSQL 18 binaries required.' >&2; exit 2; }
  dbhost=$scratch; dbport=5432
  if [[ "$tier" == development ]]; then
    state="$PWD/.local/postgres18"; mkdir -p "$state"
    mkdir "$state/launcher.lock" || { echo 'Development launcher already active; see setup instructions.' >&2; exit 1; }; dev_lock=true
  fi
  if [[ ! -s "$state/bootstrap.pass" ]]; then openssl rand -hex 32 > "$state/bootstrap.pass"; fi
  bootstrap=$(cat "$state/bootstrap.pass")
  if [[ ! -f "$state/data/PG_VERSION" ]]; then
    clean initdb -D "$state/data" -U fixture_owner -A scram-sha-256 --pwfile="$state/bootstrap.pass" --encoding=UTF8 >/dev/null
  fi
  [[ "$(cat "$state/data/PG_VERSION")" == 18 ]] || { echo 'Incompatible PostgreSQL data directory.' >&2; exit 2; }
  if clean pg_ctl -D "$state/data" status >/dev/null; then echo 'Owned development cluster already running.' >&2; exit 1; fi
  owned_server=true
  clean pg_ctl -D "$state/data" -l "$state/postgres.log" -o "-c listen_addresses='' -c unix_socket_directories=$dbhost -p $dbport" -w start
fi
for account in web migrator collector; do
  if [[ ! -s "$state/$account.pass" ]]; then openssl rand -hex 32 > "$state/$account.pass"; fi
done
local_env=("KBEAN_DB_TIER=$tier" "KBEAN_DB_NAME=kbean_$tier" "KBEAN_DB_HOST=$dbhost" "KBEAN_DB_PORT=$dbport"
  "KBEAN_DB_USER=kbean_${tier}_web" "KBEAN_DB_PASSWORD=$(cat "$state/web.pass")"
  "KBEAN_COLLECTOR_USER=kbean_${tier}_collector" "KBEAN_COLLECTOR_PASSWORD=$(cat "$state/collector.pass")"
  "KBEAN_MIGRATION_USER=kbean_${tier}_migrator" "KBEAN_MIGRATION_PASSWORD=$(cat "$state/migrator.pass")")
fixture(){ clean env "${local_env[@]}" NEXT_TELEMETRY_DISABLED=1 "$@"; }
fixture env KBEAN_BOOTSTRAP_PASSWORD="$bootstrap" node database/bootstrap-local.mjs
if [[ "$tier" == test ]]; then
  local_env+=(KBEAN_TEST_APPROVED=yes)
  fixture env KBEAN_MIGRATION_APPROVED=yes node database/migrate.mjs --test-v1
  fixture node tests/support/upgrade.mjs seed
  fixture env KBEAN_MIGRATION_APPROVED=yes node database/migrate.mjs --test-v3
  fixture node tests/support/upgrade.mjs seed-v3
  fixture env KBEAN_MIGRATION_APPROVED=yes node database/migrate.mjs --test-v4
  fixture node tests/support/metric-restore.mjs
fi
fixture env KBEAN_MIGRATION_APPROVED=yes node database/migrate.mjs
if [[ "$tier" == test ]]; then
  fixture env KBEAN_MIGRATION_APPROVED=yes node database/migrate.mjs
  fixture node tests/support/upgrade.mjs verify
  fixture node jobs/check.mjs --maintenance
  if [[ "$owned_server" == true ]]; then
    admin_env=("PGHOST=$dbhost" "PGPORT=$dbport" PGUSER=fixture_owner "PGPASSWORD=$bootstrap")
    clean env "${admin_env[@]}" pg_dump -Fc -d kbean_test -f "$scratch/fixture.dump"
    clean env "${admin_env[@]}" createdb kbean_test_restore
    clean env "${admin_env[@]}" pg_restore --exit-on-error -d kbean_test_restore "$scratch/fixture.dump"
    restored=$(clean env "${admin_env[@]}" psql -XAt -d kbean_test_restore -c "SELECT count(*) FROM users WHERE subject='upgrade-proof'")
    [[ "$restored" == 1 ]] || exit 1
    restored_metric=$(clean env "${admin_env[@]}" psql -XAt -d kbean_test_restore -v ON_ERROR_STOP=1 -c "SELECT value FROM metric_snapshots WHERE source_reference='restore-proof' AND environment='staging' AND source_method='manual'")
    [[ "$restored_metric" == 29 ]] || exit 1
    restored_timeline=$(clean env "${admin_env[@]}" psql -XAt -d kbean_test_restore -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM incident_updates t JOIN incidents i ON i.id=t.incident_id JOIN users u ON u.id=t.actor WHERE i.environment='staging' AND u.subject='upgrade-proof' AND t.message='Synthetic restore marker'")
    [[ "$restored_timeline" == 1 ]] || exit 1
    echo "Native dump restored into independent test database; identity, metric and incident timeline recovered."
  fi
fi
case "$mode" in
  local) fixture node tests/support/local-stack.mjs local;;
  monitoring) fixture node jobs/check.mjs --fixtures;;
  integration) fixture vitest run tests/integration;;
  browser) fixture node tests/support/local-stack.mjs browser "$@";;
  verify) fixture vitest run tests/integration && fixture node tests/support/local-stack.mjs browser;;
esac
