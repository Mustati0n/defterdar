# Defterdar Remote Development / Staging Setup

Bu belge yeni bir Linux VPS üzerinde **remote development / staging foundation**
kurar. Production release, gerçek domain kurulumu veya sunucu üzerinde otomatik
firewall değişikliği yapmaz.

Önerilen kaynak aktarımı:

```text
GitHub → git clone → git pull --ff-only
```

ZIP yalnız fallback'tir. GitHub source of truth olarak kalmalıdır; VPS tek yaşayan
kod kopyası olmamalıdır.

## Mimari

```text
Internet :80/:443
       ↓
     Caddy
       ├─ /api/* → 127.0.0.1:3001 (prefix strip) → NestJS
       └─ /*      → 127.0.0.1:3000                → Next.js

127.0.0.1:5432 → PostgreSQL 17 container
127.0.0.1:9000 → MinIO API container
127.0.0.1:9001 → MinIO console container
```

PostgreSQL ve MinIO `compose.server.yml` ile kalıcı volume kullanır. Next ve
Nest, Node 24 üzerinde ayrı systemd servisleridir. Uygulamaları sırf container
olsun diye Docker image'a çevirmek bu staging foundation'ın kapsamına alınmadı.

## Server requirements

- 64-bit Linux VPS; dağıtım ve sürüm kullanıcı tarafından seçilmelidir.
- Git
- Node.js `24.x` (`.nvmrc`: `24`)
- pnpm `11.22.0` (`packageManager` pin'i)
- Docker Engine ve Docker Compose v2 (`docker compose`)
- `curl` ve `openssl`
- Caddy yalnız public HTTPS staging kullanılacaksa
- En az iki kalıcı volume için yeterli disk ve ayrı bir backup hedefi

Ubuntu/Debian, Fedora veya başka bir dağıtım için Docker/Caddy paketlerini kendi
resmi kurulum kaynaklarından yükleyin. Repository root gerektiren paket kurulumunu
otomatikleştirmez. Node runtime bir deploy kullanıcısı altında örneğin şöyle
hazırlanabilir:

```bash
nvm install 24
nvm use 24
corepack enable
corepack prepare pnpm@11.22.0 --activate
node --version
pnpm --version
```

## New Server

### 1. SSH ve repository clone

Deploy kullanıcısına yalnız gereken izinleri verin. Önerilen project path
`/srv/defterdar`'dır; systemd hardening ile home dizinine bağlı kalmaz.

```bash
sudo install -d -o "$USER" -g "$(id -gn)" /srv/defterdar
git clone https://github.com/Mustati0n/defterdar.git /srv/defterdar
cd /srv/defterdar
git checkout main
git status
```

`node_modules`, `.next`, `dist`, local database, `.env`, log ve cache Git ile
taşınmaz. Bunlar sunucuda yeniden oluşturulur.

### 2. Environment

```bash
cp .env.server.example .env
cp apps/web/.env.server.example apps/web/.env.local
chmod 600 .env apps/web/.env.local
```

Secret üretmek için her kullanımda ayrı değer üretin:

```bash
openssl rand -hex 32
```

`.env` içinde en az şunları değiştirin:

- `POSTGRES_PASSWORD` ve `DATABASE_URL` içindeki aynı parola
- `JWT_ACCESS_SECRET`
- Self-hosted MinIO için `MINIO_ROOT_USER` ile `S3_ACCESS_KEY_ID` aynı değer
- Self-hosted MinIO için `MINIO_ROOT_PASSWORD` ile `S3_SECRET_ACCESS_KEY` aynı secret
- `CORS_ORIGINS=https://<gerçek-domain>`

Hex parola kullanmak PostgreSQL URL encoding belirsizliğini önler. Gerçek
secret'ları terminal komut satırına argüman olarak yazmayın; `chmod 600` olan
`.env` dosyasında tutun. Secret'lar hiçbir zaman `NEXT_PUBLIC_*` adına konmaz.

Environment sorumlulukları:

| Kategori       | Değişkenler                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Application    | `NODE_ENV`, `PORT`, `API_HOST`, `API_PORT`, `API_BODY_LIMIT`, `CORS_ORIGINS`                                                |
| Auth           | `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `AUTH_REFRESH_TTL`, `INVITATION_TTL_DAYS`                                            |
| PostgreSQL     | `DATABASE_URL`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`                                        |
| Object storage | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, MinIO değerleri |
| Browser-public | yalnız `apps/web/.env.local` içindeki `NEXT_PUBLIC_API_BASE_URL`                                                            |

Davet linkleri backend'de hostname birleştirmez. Web uygulaması linki
`window.location.origin` üzerinden oluşturur; doğru domain üzerinden açıldığında
localhost linki üretmez. Bu nedenle kullanılmayan `APP_URL`, `WEB_URL` veya
`FRONTEND_URL` değişkenleri eklenmemiştir.

### 3. Preflight ve infrastructure

```bash
./scripts/server/bootstrap.sh
docker compose -f compose.server.yml up -d --wait postgres minio
docker compose -f compose.server.yml run --rm minio-init
docker compose -f compose.server.yml ps
```

Compose portları yalnız `127.0.0.1` üzerinde bind eder. PostgreSQL ve MinIO
volume'ları container recreate sırasında korunur. Local geliştirme için mevcut
`docker-compose.yml` aynen kalır; VPS üzerinde `compose.server.yml` kullanın.

### 4. Install, migration ve build

```bash
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm build
```

Server üzerinde yalnız committed migration'ları çalıştıran Prisma
`migrate deploy` wrapper'ı (`pnpm db:deploy`) kullanılır. Aşağıdakileri staging
verisi üzerinde çalıştırmayın:

```text
prisma migrate dev
prisma db push
prisma migrate reset
pnpm db:migrate
```

Fresh kurulum sözleşmesi `empty PostgreSQL → pnpm db:deploy → app start`tır.

### 5. systemd process management

Önce gerçek değerleri bulun:

```bash
pwd
id -un
id -gn
command -v pnpm
dirname "$(command -v node)"
```

`deploy/systemd/*.service.example` dosyalarını `/etc/systemd/system` altına
kopyalayın ve şu placeholder'ları değiştirin:

```text
<DEPLOY_USER>
<DEPLOY_GROUP>
<PROJECT_DIR>
<PNPM_PATH>
<NODE_BIN_DIR>
```

Sonra:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now defterdar-api.service
sudo systemctl enable --now defterdar-web.service
sudo systemctl status defterdar-api.service defterdar-web.service
```

Root package scriptleri gerçektir:

```bash
pnpm start:api
pnpm start:web
```

Her iki uygulama da reverse proxy arkasında localhost üzerinde dinler. Terminal
kapatıldığında systemd süreçleri çalışmaya devam eder.

### 6. Caddy ve HTTPS

Public staging için DNS A/AAAA kaydını VPS'e yönlendirdikten sonra
`deploy/Caddyfile.example` dosyasını kopyalayıp `<YOUR_DOMAIN>` değerini
değiştirin. Örnek, `/api/*` prefix'ini strip ederek mevcut `/auth`, `/ledgers`,
`/health` gibi Nest route'larını değiştirmeden proxy eder.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy gerçek domain ve erişilebilir 80/443 portları olduğunda HTTPS yönetebilir.
Bilinmeyen bir domain için sertifika talebi çalıştırmayın. Localhost development
HTTP kalır; `https://localhost:3000` kullanmak SSL protocol hatası üretir.

### 7. Verify

```bash
./scripts/server/verify.sh
```

Script PostgreSQL readiness, MinIO health, API `/health`, API `/health/ready`
ve web HTTP response kontrollerini yapar. Public proxy ayrıca manuel kontrol
edilmelidir:

```bash
curl --fail --show-error --location https://<YOUR_DOMAIN>/
curl --fail --show-error https://<YOUR_DOMAIN>/api/health/ready
```

## Update Existing Server

Normal rutin güncelleme, environment ve systemd bir kez hazırlandıktan sonra:

```bash
cd /srv/defterdar
./scripts/server/deploy.sh
```

Script yaptığı adımları yazdırır:

```text
dirty-tree sanity → git pull --ff-only → frozen install
→ Compose infrastructure → migrate deploy → build
→ systemd restart → health verification
```

Uncommitted server değişikliği varsa fail eder; auto-stash veya overwrite yapmaz.
Remote development oturumunda process restart istemiyorsanız:

```bash
DEFTERDAR_RESTART_MODE=none ./scripts/server/deploy.sh
```

Bu mod build'e kadar gider, çalışan uygulamayı restart/verify etmez.

## Development Mode

Remote development yalnız SSH tüneli/VPN gibi kontrollü erişimde önerilir.
Public internete Next/Nest dev server açmayın.

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d
pnpm install
pnpm db:deploy
pnpm dev
```

Yerel bilgisayardan tünel örneği:

```bash
ssh -L 3000:127.0.0.1:3000 \
  -L 3001:127.0.0.1:3001 \
  -L 9001:127.0.0.1:9001 <SSH_USER>@<SERVER_IP>
```

Sonra `http://localhost:3000` kullanın. VS Code Remote SSH ile source doğrudan
sunucuda düzenlenebilir; repository editor/plugin kurulumu yapmaz.

Önerilen geliştirme disiplini:

```text
Mac/remote editor → feature branch → test → commit → push
GitHub source of truth → staging server pull/deploy
```

Server'da düzenleme yapılırsa yine branch, commit ve push kullanılmalıdır.

## Firewall / network

Önerilen public ingress:

```text
22/tcp  SSH (mümkünse kaynak IP ile sınırla)
80/tcp  HTTP / Caddy redirect ve ACME
443/tcp HTTPS
```

Public açılmaması gereken portlar:

```text
3000  Next
3001  Nest
5432  PostgreSQL
9000  MinIO API
9001  MinIO console
```

UFW örneği yalnız dokümantasyondur; sunucuda otomatik uygulanmaz:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

SSH kuralını doğrulamadan firewall'u etkinleştirmek bağlantıyı kesebilir.

## Logs

Application logları systemd journal'a gider:

```bash
journalctl -u defterdar-api.service -f
journalctl -u defterdar-web.service -f
```

Infrastructure logları rotate edilen Docker `json-file` loglarıdır:

```bash
docker compose -f compose.server.yml logs --tail=200 postgres minio
docker compose -f compose.server.yml logs -f minio
```

JWT, invitation token, database URL veya S3 secret'ı debug loglarına eklemeyin.
Mevcut HTTP exception filter response metadata'sını loglamaz; server scriptleri de
`.env` içeriğini yazdırmaz.

## Backup

### PostgreSQL

```bash
DEFTERDAR_BACKUP_DIR=/srv/backups/defterdar \
  ./scripts/server/backup-db.sh
```

Backup custom `pg_dump` formatında, `umask 077` ile oluşturulur. Parola command
line argümanına taşınmaz; container environment'ından okunur. Backup'ı aynı VPS
diskinde bırakmak gerçek koruma değildir; şifreli/off-site hedefe kopyalayın.
Cron otomatik oluşturulmaz.

### MinIO object data

Tutarlı offline volume snapshot için önce API ve MinIO yazımını durdurun:

```bash
sudo systemctl stop defterdar-api.service
docker compose -f compose.server.yml stop minio
mkdir -p /srv/backups/defterdar/minio
docker run --rm \
  -v defterdar_minio_data:/data:ro \
  -v /srv/backups/defterdar/minio:/backup \
  alpine:3.22 sh -c 'tar czf /backup/minio-$(date -u +%Y%m%dT%H%M%SZ).tgz -C /data .'
docker compose -f compose.server.yml start minio
sudo systemctl start defterdar-api.service
```

Volume adı `COMPOSE_PROJECT_NAME` değiştiyse önce `docker volume ls` ile gerçek
adı doğrulayın. Snapshot'ı restore tatbikatı olmadan güvenilir kabul etmeyin.

## Restore

Restore destructive bir bakım işlemidir. Önce mevcut DB backup'ı alın, API/web
servislerini durdurun ve doğru `.env`/Compose project'ini doğrulayın:

```bash
sudo systemctl stop defterdar-web.service defterdar-api.service
./scripts/server/backup-db.sh
./scripts/server/restore-db.sh --confirm /absolute/path/to/defterdar.dump
pnpm db:status
sudo systemctl start defterdar-api.service defterdar-web.service
./scripts/server/verify.sh
```

MinIO restore için boş/hedef volume'u doğruladıktan sonra snapshot'ı offline
olarak açın. Yanlış volume'a restore etmeyin; script bu işlemi otomatik yapmaz.

## ZIP / manual copy fallback

Önerilen yöntem hâlâ Git clone'dur. Mecburi source ZIP için tracked commit'ten
artifact üretmek runtime ve secret dosyalarını otomatik dışarıda bırakır:

```bash
git status --short
git archive --format=zip --output=defterdar-source.zip HEAD
```

Elle arşiv hazırlanırsa mutlaka dışlayın:

```text
.env, .env.local, node_modules, .next, dist, coverage,
logs, *.log, cache, local database/temp files
```

`.git` olmadan server `git pull` workflow'una katılamaz; bu yüzden ZIP ana
deployment yöntemi değildir.

## Troubleshooting

### Preflight placeholder hatası

`.env` ve `apps/web/.env.local` içindeki `replace-with-*` ve `<YOUR_DOMAIN>`
değerlerini gerçek, Git-dışı değerlerle değiştirin.

### Database connection

```bash
docker compose -f compose.server.yml ps
docker compose -f compose.server.yml logs --tail=100 postgres
pnpm db:status
```

`POSTGRES_PASSWORD` değiştirmenin mevcut volume içindeki PostgreSQL kullanıcısını
otomatik değiştirmediğini unutmayın.

### MinIO / attachments

```bash
curl --fail http://127.0.0.1:9000/minio/health/live
docker compose -f compose.server.yml run --rm minio-init
```

`MINIO_ROOT_*` ile `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` self-hosted MinIO
kurulumunda aynı erişimi temsil etmelidir.

### Service start

```bash
systemctl status defterdar-api.service defterdar-web.service
journalctl -u defterdar-api.service -n 100 --no-pager
journalctl -u defterdar-web.service -n 100 --no-pager
```

NVM kullanılan sunucuda systemd yolları interaktif shell'den farklı olabilir;
`command -v pnpm` sonucunu `<PNPM_PATH>`, `dirname "$(command -v node)"`
sonucunu `<NODE_BIN_DIR>` olarak yazın.

### Local SSL error

Next development server TLS sunmaz. `http://localhost:3000` kullanın;
`https://localhost:3000` `SSL_ERROR_RX_RECORD_TOO_LONG` benzeri hata üretir.

## Production conversion deferred

Gerçek production öncesinde ayrıca domain/DNS doğrulaması, SMTP/email delivery,
off-site backup otomasyonu ve restore tatbikatı, monitoring/alerting, capacity
planı, secret manager, security review ve manuel product QA gerekir. Bu görev
bunları yapılmış saymaz.
