# Defterdar

Defterdar pnpm monorepo'su NestJS REST API, Next.js web iskeleti, Prisma 7, PostgreSQL ve S3-compatible receipt storage altyapısını içerir.

Product Model V2; auth/user, opt-in PERSONAL ve SHARED Ledger, bağımsız veya
Ledger-bound Plan, Plan invitation/linking, Expense/split/Gift, derived Balance,
Settlement, Borçtan düş, Category/Income, receipt attachments, immutable audit,
idempotency/version control ve Ledger/Plan analytics API'lerini kapsar. Next.js
web uygulaması context-aware FAB, adaptive header, page intro ve user-scoped UI
preferences içerir. Swagger development ortamında `/docs`, OpenAPI JSON
`/docs-json` yolundadır.

## Gereksinimler

- Node.js 24 LTS (`.nvmrc`)
- pnpm 11.22.0
- Docker ve Docker Compose

## Kurulum

```bash
cp .env.example .env
# .env içindeki PostgreSQL ve MinIO parolalarını değiştirin.
pnpm install
docker compose up -d
pnpm db:deploy
```

Docker Compose PostgreSQL yanında MinIO'yu (`:9000`, console `:9001`) ve receipt bucket'ını başlatır. Presigned upload/download akışı için [attachment dokümanına](./docs/ATTACHMENTS.md) bakın.

## Geliştirme

```bash
pnpm dev       # API ve web
pnpm dev:api   # http://localhost:3001, Swagger: /docs
pnpm dev:web   # http://localhost:3000
```

## Remote development / staging

VPS aktarımında önerilen yöntem ZIP değil GitHub repository'sini bir kez clone
edip DEV ve STAGING için izole Git worktree'leri oluşturmaktır. Her ortam ayrı
env, Compose project, database, MinIO volume/bucket, port ve systemd instance
kullanır. Kurulum ve güvenlik sözleşmesi için
[Server Setup](./docs/SERVER_SETUP.md) belgesini izleyin.

```bash
# DEV worktree
./scripts/server/deploy.sh dev
./scripts/server/verify.sh dev

# STAGING worktree; only current origin/main and full verification
./scripts/server/deploy.sh staging
./scripts/server/verify.sh staging
```

Production-like build sonrası root çalışma komutları:

```bash
pnpm start:api
pnpm start:web
```

Bu hazırlık production release değildir; gerçek domain ve VPS üzerinde deploy
yapılmış sayılmaz.

## Kalite ve veri tabanı

```bash
pnpm lint
pnpm test
pnpm build
pnpm format:check
pnpm db:generate
pnpm db:migrate
pnpm db:status
```

Mimari ve domain sınırları için [`docs`](./docs) dizinine bakın. Web uygulaması veri tabanına doğrudan erişmez.

## Deferred / Future

Native mobile, actual bank transfer/payment provider, cards/wallet, OCR,
push/email delivery, password-reset email delivery, social login, 2FA/passkeys,
recurring expenses, multi-currency FX, guest financial participants,
comments/chat, WebSocket, microservices, Redis, message broker ve Kubernetes
mevcut kapsamın dışındadır.
