# Defterdar Server Operations

Defterdar has one canonical source tree and one production runtime:

```text
/srv/defterdar
```

The API and web processes run as the `defterdar` user. PostgreSQL, MinIO, API,
and web listeners are bound to loopback; Caddy is the only public entrypoint.

## Runtime

Root-only secrets live in `.env` and `apps/web/.env.local`; neither is tracked.
Start the data services and validate configuration with:

```bash
cd /srv/defterdar
./scripts/server/bootstrap.sh
```

Systemd services:

```text
defterdar-api.service
defterdar-web.service
```

Their committed unit definitions are under `deploy/systemd/`.

## Deploy and verify

Deploy only a clean, reviewed commit:

```bash
cd /srv/defterdar
./scripts/server/deploy.sh
./scripts/server/verify.sh
```

The deployment installs the lockfile graph, starts PostgreSQL/MinIO, runs lint
and the full test suite, builds all workspaces, applies committed migrations,
restarts the two canonical services, and waits for readiness.

## Database backup and restore

```bash
DEFTERDAR_BACKUP_DIR=/srv/backups/defterdar ./scripts/server/backup-db.sh
sudo systemctl stop defterdar-web.service defterdar-api.service
./scripts/server/restore-db.sh --confirm /absolute/path/to/backup.dump
sudo systemctl start defterdar-api.service defterdar-web.service
./scripts/server/verify.sh
```

Always verify a backup with `pg_restore --list` before a restore. Never commit
runtime environment files or credentials.

## Public access

The active browser-trusted sslip.io HTTPS hostname remains the public fallback.
Caddy does not issue publicly trusted certificates for bare IP addresses; do
not replace the HTTPS route with plain HTTP or a locally trusted certificate.
