# Defterdar Shared VPS: DEV + STAGING

Bu belge tek Linux VPS üzerinde birbirinden izole iki ortam kurar:

- **DEV:** sık güncellenen remote development ve mobil test ortamı
- **STAGING:** yalnız doğrulanmış `origin/main` commit'lerinden güncellenen ekip ortamı

Bu bir production release değildir. GitHub source of truth olarak kalır; VPS tek
yaşayan kod kopyası olmaz. Önerilen aktarım `git clone` + `git worktree`'dir. ZIP
yalnız fallback'tir.

## Isolation contract

| Kaynak             | DEV                            | STAGING                         |
| ------------------ | ------------------------------ | ------------------------------- |
| Hostname           | `https://dev.<DOMAIN>`         | `https://staging.<DOMAIN>`      |
| Git worktree       | `/srv/defterdar-dev`           | `/srv/defterdar-staging`        |
| Environment file   | `defterdar-dev/.env`           | `defterdar-staging/.env`        |
| Compose project    | `defterdar-dev`                | `defterdar-staging`             |
| Web/API            | `127.0.0.1:3200` / `:3201`     | `127.0.0.1:3000` / `:3001`      |
| PostgreSQL host    | `127.0.0.1:55432`              | `127.0.0.1:5432`                |
| Database           | `defterdar_dev`                | `defterdar_staging`             |
| MinIO API/console  | `127.0.0.1:59000` / `:59001`   | `127.0.0.1:9000` / `:9001`      |
| Bucket             | `defterdar-dev-receipts`       | `defterdar-staging-receipts`    |
| systemd instances  | `defterdar-*@dev.service`      | `defterdar-*@staging.service`   |
| Persistent volumes | Compose project scoped volumes | Separate project scoped volumes |

Compose project naming separates container/network/volume names. Different host
ports, database names, credentials, MinIO data volumes and bucket names prevent
cross-environment access. Application build output is also separated because
each environment has its own Git worktree. A DEV build/restart never addresses
the STAGING Compose project or systemd instance.

`scripts/server/check-isolation.sh` fails if security-sensitive identities,
ports, databases, buckets, endpoints or credentials are shared.

## Architecture

```text
                         Caddy / HTTPS
                 ┌────────────┴────────────┐
        dev.<DOMAIN>               staging.<DOMAIN>
       /api → :3201                /api → :3001
          / → :3200                   / → :3000
             │                            │
  defterdar-api/web@dev       defterdar-api/web@staging
             │                            │
  defterdar-dev Compose       defterdar-staging Compose
  PostgreSQL + MinIO          PostgreSQL + MinIO
  own volumes/database        own volumes/database
```

Nest ve Next host üzerinde Node 24 + systemd ile çalışır. PostgreSQL ve MinIO
`compose.server.yml` ile çalışır. Uygulamayı yalnız container kullanmak adına
aceleyle Dockerize etmek bu foundation'ın kapsamına alınmadı.

## Server requirements

- 64-bit Linux VPS
- Git
- Node.js `24.x` (`.nvmrc`: `24`)
- pnpm `11.22.0` (`packageManager` pin'i)
- Docker Engine ve Docker Compose v2
- `curl` ve `openssl`
- Public HTTPS için Caddy
- Her iki ortam ve off-site backup için yeterli disk

Repository root yetkisi isteyen paket kurulumlarını otomatik yapmaz. Deploy
kullanıcısı için Node örneği:

```bash
nvm install 24
nvm use 24
corepack enable
corepack prepare pnpm@11.22.0 --activate
node --version
pnpm --version
```

## New Server

### 1. Clone once, create two Git worktrees

Repository yalnız bir kez clone edilir. Worktree'ler Git object database'i ve
history'yi paylaşır; source/build dizinleri ise runtime izolasyonu için ayrıdır.

```bash
sudo install -d -o "$USER" -g "$(id -gn)" /srv/defterdar-repo
git clone https://github.com/Mustati0n/defterdar.git /srv/defterdar-repo

git -C /srv/defterdar-repo worktree add --track \
  -b server/dev /srv/defterdar-dev origin/main
git -C /srv/defterdar-repo worktree add --track \
  -b server/staging /srv/defterdar-staging origin/main

git -C /srv/defterdar-repo worktree list
```

`server/staging` mutlaka `origin/main` takip etmelidir. DEV daha sonra bir feature
branch'e geçebilir; STAGING worktree aynı anda etkilenmez.

### 2. Configure separate environment files

```bash
cd /srv/defterdar-dev
cp .env.dev.example .env
cp apps/web/.env.dev.example apps/web/.env.local

cd /srv/defterdar-staging
cp .env.staging.example .env
cp apps/web/.env.staging.example apps/web/.env.local

chmod 600 /srv/defterdar-dev/.env \
  /srv/defterdar-dev/apps/web/.env.local \
  /srv/defterdar-staging/.env \
  /srv/defterdar-staging/apps/web/.env.local
```

Her secret için değer üretin:

```bash
openssl rand -hex 32
```

Kurallar:

- DEV ve STAGING aynı PostgreSQL/JWT/MinIO/S3 secret'ını kullanmaz.
- Her ortamda `POSTGRES_PASSWORD`, `DATABASE_URL` ve `TEST_DATABASE_URL`
  içindeki parola eşleşir.
- Aynı ortamda `MINIO_ROOT_USER` = `S3_ACCESS_KEY_ID` ve
  `MINIO_ROOT_PASSWORD` = `S3_SECRET_ACCESS_KEY` olur.
- DEV ve STAGING değerleri birbirinden farklı olur.
- `CORS_ORIGINS` sırasıyla `https://dev.<DOMAIN>` ve
  `https://staging.<DOMAIN>` olur.
- Secret hiçbir zaman `NEXT_PUBLIC_*` değişkenine konmaz.

Davet linkleri web tarafında `window.location.origin` kullanır. Bu nedenle doğru
hostname üzerinden açılan DEV/STAGING localhost davet linki üretmez; kullanılmayan
`APP_URL`/`WEB_URL` değişkenleri eklenmemiştir.

İki dosyayı secretsız biçimde karşılaştıran kontrol:

```bash
/srv/defterdar-dev/scripts/server/check-isolation.sh \
  /srv/defterdar-dev/.env \
  /srv/defterdar-staging/.env
```

Script secret değerlerini ekrana yazmaz.

### 3. Install dependencies and preflight

```bash
cd /srv/defterdar-dev
pnpm install --frozen-lockfile
./scripts/server/bootstrap.sh dev

cd /srv/defterdar-staging
pnpm install --frozen-lockfile
./scripts/server/bootstrap.sh staging
```

Bootstrap Node/pnpm/Docker/env/placeholder/Compose kontrollerini ve diğer worktree
hazırsa isolation kontrolünü çalıştırır.

### 4. Install instance systemd services

Her iki worktree için aynı instance template kullanılır. Şunları bulun:

```bash
id -un
id -gn
command -v pnpm
dirname "$(command -v node)"
```

`deploy/systemd/defterdar-api@.service.example` ve
`defterdar-web@.service.example` dosyalarında değiştirin:

```text
<DEPLOY_USER>
<DEPLOY_GROUP>
<WORKTREE_ROOT>  → /srv
<PNPM_PATH>
<NODE_BIN_DIR>
```

Sonra template'leri kurun; henüz servisleri başlatmayın:

```bash
sudo cp deploy/systemd/defterdar-api@.service.example \
  /etc/systemd/system/defterdar-api@.service
sudo cp deploy/systemd/defterdar-web@.service.example \
  /etc/systemd/system/defterdar-web@.service
sudo systemctl daemon-reload
```

NVM kullanılıyorsa hem pnpm tam yolu hem Node bin dizini gereklidir.

### 5. First build, migration and start

İlk kurulumda uygulama servisi henüz çalışmadığı için restart/HTTP verify atlanır:

```bash
cd /srv/defterdar-dev
DEFTERDAR_RESTART_MODE=none ./scripts/server/deploy.sh dev

cd /srv/defterdar-staging
DEFTERDAR_RESTART_MODE=none ./scripts/server/deploy.sh staging
```

Server migration yalnız committed Prisma migration'ları uygulayan
`pnpm db:deploy` (`prisma migrate deploy`) kullanır. Server verisinde şunları
kullanmayın:

```text
prisma migrate dev
prisma db push
prisma migrate reset
pnpm db:migrate
```

Servisleri bağımsız instance'lar olarak etkinleştirin:

```bash
sudo systemctl enable --now \
  defterdar-api@dev.service defterdar-web@dev.service
sudo systemctl enable --now \
  defterdar-api@staging.service defterdar-web@staging.service

/srv/defterdar-dev/scripts/server/verify.sh dev
/srv/defterdar-staging/scripts/server/verify.sh staging
```

### 6. Caddy and HTTPS

DNS kayıtlarını VPS'e yönlendirdikten sonra `deploy/Caddyfile.dual.example`
dosyasını `/etc/caddy/Caddyfile` için temel alın ve `<DOMAIN>` değerini değiştirin.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy iki hostname için HTTPS sertifikalarını ayrı yönetir. `/api/*` prefix'ini
strip ederek mevcut Nest `/health`, `/auth`, `/ledgers` route sözleşmesini bozmaz.
Public DEV dahil HTTP kullanılmaz. Localhost ve SSH tunnel erişimi HTTP kalabilir.

## Daily commands

### Deploy DEV

DEV worktree temiz ve branch upstream'i mevcut olmalıdır:

```bash
cd /srv/defterdar-dev
./scripts/server/deploy.sh dev
```

Akış:

```text
dirty-tree guard → git pull --ff-only → frozen install
→ defterdar-dev PostgreSQL/MinIO → lint → build
→ DEV migrate deploy → only @dev restart → DEV verify
```

DEV deploy hiçbir `defterdar-staging` Compose kaynağına veya `@staging`
systemd servisine komut göndermez.

### Verify DEV

```bash
cd /srv/defterdar-dev
./scripts/server/verify.sh dev
curl --fail https://dev.<DOMAIN>/api/health/ready
```

### Promote/deploy STAGING

Önce doğrulanacak değişiklik GitHub `main` dalına merge/push edilmiş olmalıdır.
STAGING script'i worktree upstream'inin `origin/main` olduğunu ve HEAD'in güncel
`origin/main` commit'iyle aynı olduğunu zorunlu tutar.

```bash
cd /srv/defterdar-staging
./scripts/server/deploy.sh staging
```

Akış:

```text
dirty-tree guard → fetch/pull origin/main → frozen install
→ defterdar-staging PostgreSQL/MinIO → lint → full tests → build
→ only after PASS: STAGING migrate deploy
→ only @staging restart → STAGING verify
```

Lint/test/build başarısızsa STAGING migration ve restart çalışmaz.

### Verify STAGING

```bash
cd /srv/defterdar-staging
./scripts/server/verify.sh staging
curl --fail https://staging.<DOMAIN>/api/health/ready
```

## Active remote development

GitHub source of truth olmaya devam eder. VS Code Remote SSH ile yalnız DEV
worktree üzerinde çalışın. Hot reload başlamadan DEV production-like instance'ını
durdurun; STAGING çalışmaya devam eder:

```bash
sudo systemctl stop defterdar-web@dev.service defterdar-api@dev.service
cd /srv/defterdar-dev
git status
git switch -c feature/<short-name>
./scripts/server/remote-dev.sh dev
```

`remote-dev.sh` yalnız `dev` kabul eder ve web/API'yi 3200/3201 üzerinde başlatır.
Caddy WebSocket proxy desteğiyle `https://dev.<DOMAIN>` mobil cihazlardan
hot-reload DEV'e erişebilir. İş bitince:

```bash
git status
pnpm lint
pnpm test
git add <explicit-files>
git commit
git push -u origin feature/<short-name>
```

Hot reload'u durdurup DEV systemd akışına dönün:

```bash
./scripts/server/deploy.sh dev
./scripts/server/verify.sh dev
```

Branch GitHub'a push edilmeden VPS'te kalan değişiklik source of truth sayılmaz.
Deploy script dirty tree üzerinde auto-stash/overwrite yapmaz; fail eder.

## Firewall / network

Public ingress yalnız:

```text
22/tcp  SSH (mümkünse kaynak IP/VPN ile sınırla)
80/tcp  HTTP redirect ve ACME
443/tcp HTTPS
```

Public açmayın:

```text
3000, 3001, 3200, 3201
5432, 55432
9000, 9001, 59000, 59001
```

Compose bütün publish portlarını `127.0.0.1` üzerinde bind eder. UFW örneği
yalnız dokümantasyondur:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

SSH kuralını doğrulamadan firewall'u etkinleştirmek bağlantıyı kesebilir.

## Logs

```bash
journalctl -u defterdar-api@dev.service -f
journalctl -u defterdar-web@dev.service -f
journalctl -u defterdar-api@staging.service -f
journalctl -u defterdar-web@staging.service -f

cd /srv/defterdar-dev
docker compose --env-file .env --project-name defterdar-dev \
  -f compose.server.yml logs --tail=200 postgres minio

cd /srv/defterdar-staging
docker compose --env-file .env --project-name defterdar-staging \
  -f compose.server.yml logs --tail=200 postgres minio
```

Compose `json-file` logları rotation kullanır. Scriptler `.env` içeriğini
yazdırmaz. JWT/token/database URL/S3 secret uygulama loglarına eklenmemelidir.

## Backup and restore

Her profile ayrı backup dizinine yazılır:

```bash
cd /srv/defterdar-dev
DEFTERDAR_BACKUP_DIR=/srv/backups/defterdar ./scripts/server/backup-db.sh dev

cd /srv/defterdar-staging
DEFTERDAR_BACKUP_DIR=/srv/backups/defterdar ./scripts/server/backup-db.sh staging
```

Backup custom `pg_dump` formatında ve `umask 077` ile oluşturulur. Parola command
line'a taşınmaz. Backup'ı aynı VPS diskinde bırakmak yeterli değildir; şifreli
off-site hedef kullanın. Cron otomatik kurulmaz.

Restore profile argümanını ve açık onayı zorunlu tutar:

```bash
sudo systemctl stop defterdar-web@staging.service defterdar-api@staging.service
cd /srv/defterdar-staging
./scripts/server/backup-db.sh staging
./scripts/server/restore-db.sh staging --confirm /absolute/path/to/backup.dump
pnpm db:status
sudo systemctl start defterdar-api@staging.service defterdar-web@staging.service
./scripts/server/verify.sh staging
```

Yanlış profile restore etmeyin. MinIO backup için ilgili Compose project volume'u
offline snapshot alın; DEV ve STAGING volume adlarını `docker volume ls` ile
doğrulamadan işlem yapmayın.

## ZIP fallback

Önerilen yöntem Git clone/worktree'dir. Mecburi source artifact:

```bash
git status --short
git archive --format=zip --output=defterdar-source.zip HEAD
```

Elle arşivde `.env`, `.env.local`, `node_modules`, `.next`, `dist`, `coverage`,
logs, cache, local database/temp dosyaları dışlanır. `.git` olmadan pull/worktree
workflow'u kullanılamaz.

## Troubleshooting

### Isolation failure

İki `.env` içinde raporlanan anahtarı ayırın. Database/bucket/port/credential
paylaşımını bypass etmeyin:

```bash
/srv/defterdar-dev/scripts/server/check-isolation.sh \
  /srv/defterdar-dev/.env /srv/defterdar-staging/.env
```

### Environment mismatch

`deploy.sh dev` yalnız `DEFTERDAR_ENVIRONMENT=dev` ve
`COMPOSE_PROJECT_NAME=defterdar-dev` olan dosyayı kabul eder. Aynı kural STAGING
için geçerlidir. Bu guard yanlış worktree'den yanlış project'e deploy'u önler.

### Service/port conflict

Hot reload öncesinde yalnız `@dev` servislerini durdurun. STAGING servislerine
dokunmayın:

```bash
systemctl status 'defterdar-*@dev.service'
systemctl status 'defterdar-*@staging.service'
ss -lnt | grep -E ':(3000|3001|3200|3201|5432|55432|9000|9001|59000|59001)'
```

### Local SSL error

Next development server TLS sunmaz. Caddy hostname'i için `https://dev.<DOMAIN>`;
SSH tunnel/localhost için `http://localhost:<port>` kullanın.
`https://localhost:3000` benzeri adresler `SSL_ERROR_RX_RECORD_TOO_LONG` üretir.

## Production conversion deferred

Production öncesinde ayrıca gerçek domain/DNS doğrulaması, email delivery,
off-site backup otomasyonu ve restore tatbikatı, monitoring/alerting, capacity
planı, secret manager, security review ve manuel product QA gerekir. DEV veya
STAGING kurulumu bunları yapılmış saymaz.
