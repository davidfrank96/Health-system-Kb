# Native PostgreSQL development and tests

Use PostgreSQL major **18** for the application, migrations, tests and CI. Development uses persistent `kbean_development`. Each automated native run creates its own `kbean_test` in a separate cluster. Both use separate web and migration logins. Service environment labels inside those databases describe inventory scope and never authorize a connection to production.

## Install on macOS

1. Download the Postgres.app distribution that includes PostgreSQL 18 and move it into Applications. The launcher uses the bundled binaries directly. The default GUI server can stay stopped. [Postgres.app downloads](https://postgresapp.com/downloads.html) · [Command-line tools](https://postgresapp.com/documentation/cli-tools.html)
2. Use Node 22.12 or later in the 22.x line, Corepack, a shell and OpenSSL. The launcher prefers Postgres.app in Applications or the user's Applications folder. An existing native PostgreSQL 18 installation on PATH also works. The previously reported isolation test used Homebrew PostgreSQL 18.3, a fresh private socket and initdb/pg_ctl. Docker was never its database.
3. From the repository root, verify the versions and install the locked packages. Use the matching native PostgreSQL 18 bin directory on Linux.

```sh
# For Postgres.app; omit this export when using another native 18.x installation.
export PATH="/Applications/Postgres.app/Contents/Versions/18/bin:$PATH"
node --version
postgres --version
pg_dump --version
corepack pnpm install --frozen-lockfile
PLAYWRIGHT_SKIP_BROWSER_GC=1 corepack pnpm exec playwright install chromium --only-shell
NEXT_TELEMETRY_DISABLED=1 corepack pnpm build
corepack pnpm local
```

Open the app at the printed loopback address on port 3000. The local issuer offers synthetic admin, operator and viewer identities and rejection fixtures. All roles can read their assigned environment. Only admin can create/edit inventory. The endpoint registry and job remain inactive. Ctrl-C stops the processes. Rebuild after changing application source before running the production-build browser suites or restarting this preview.

## Data, credentials and migrations

The launcher creates the development data directory and random role passwords under ignored `.local/postgres18/` with owner-only permissions. It opens a private, short-lived socket and disables TCP. It creates a login per purpose and applies migrations before starting the app. It passes only web connection settings, OIDC configuration and an ephemeral session key to the app. Fixture accounts from a completed session are disabled. Use synthetic data only.

Most development requires no environment file. For separate native scripts, provide server-side environment variables in the calling process or through a trusted secret loader. The root [example](../../.env.example) lists the names without passwords. Shell tools do not automatically load that file.

| Setting | Accepted local value |
| --- | --- |
| KBEAN_DB_TIER / KBEAN_DB_NAME | development / kbean_development or test / kbean_test |
| KBEAN_DB_HOST / KBEAN_DB_PORT | Absolute Unix socket directory or literal loopback; default port 5432 |
| KBEAN_DB_USER / KBEAN_DB_PASSWORD | kbean_development_web or kbean_test_web and that restricted identity's password |
| KBEAN_MIGRATION_USER / KBEAN_MIGRATION_PASSWORD | Corresponding tier-specific migrator, available only to the owner/migration process |
| KBEAN_MIGRATION_APPROVED | Set to yes in the migration process for the selected local DB |
| APP_ORIGIN / OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET / SESSION_SECRET | Generated for local preview. Session secret is a random 32-byte base64 value. The synthetic issuer requires explicit loopback fixture mode. A future Google configuration requires a separately reviewed HTTPS origin, issuer/subject enrollment and identity policy |

The launcher automatically applies the same versioned migrations used by the standalone command. For an existing separately prepared **local** database, arrange the matching roles and grants with its owner first. With the restricted migration environment already set, run:

```sh
KBEAN_MIGRATION_APPROVED=yes corepack pnpm db:migrate
```

The migration login owns the database/schema, and has no cluster administration privileges. The runtime login has only the grants in the SQL migrations. The owner controls CONNECT privileges, bootstrap access and issuer/subject membership. The optional offline `db:approve <subject> <email> <environment> <role>` command records an explicitly approved Google identity; normal local work uses the synthetic issuer. No credentials belong in source, client code or command output. Connection validation rejects production tiers and remote hosts. DigitalOcean App Platform and Managed PostgreSQL remain future deployment targets.

## Run, reset and recover

```sh
corepack pnpm test:unit
corepack pnpm test:e2e           # no database required; build the app first
corepack pnpm test:integration   # isolated native test DB, migrations and constraints
corepack pnpm test:e2e:db        # fresh test DB + real app + synthetic signed OIDC
corepack pnpm test:db            # database integrations and authenticated browser suites together
```

Each native test run creates a new cluster under a private temporary directory, exercises the populated v1 → v2 upgrade, reapplies the migrations and restores a dump into `kbean_test_restore`. On exit it stops that exact cluster and removes the temporary directory. Repeating the command is the test reset. Development data and other PostgreSQL instances are outside that process.

For an intentional **development reset**, stop the local launcher first. From the repository root, move the entire development directory to an owner-only backup path and start again. This preserves the previous data and matching credentials for recovery.

```sh
mv .local/postgres18 ".local/postgres18-backup-$(date +%Y%m%d-%H%M%S)"
corepack pnpm local
```

To recover, stop the app, move the new directory aside and move the saved directory back to `.local/postgres18`. If an unclean shutdown leaves a launcher lock, check `pg_ctl -D "$PWD/.local/postgres18/data" status` and confirm no launcher is using that directory. Stop only that owned cluster with `pg_ctl -D "$PWD/.local/postgres18/data" -m fast -w stop` if necessary, then remove the **empty** lock directory with `rmdir .local/postgres18/launcher.lock`. Never point reset or restore operations at a shared or production database.

The [PR workflow](../../.github/workflows/quality.yml) supplies an isolated PostgreSQL 18 service on the hosted runner's loopback interface with synthetic bootstrap credentials. The launcher verifies server major 18, refuses a pre-existing test database, creates restricted identities, and runs the same migration, integration and authenticated app tests. The dump/restore check runs in the native branch. GitHub disposes of the CI service after the job. Local development has no Docker or Compose dependency.
