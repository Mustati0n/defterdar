# Defterdar

Defterdar pnpm monorepo'su NestJS REST API, Next.js web iskeleti, Prisma 7, PostgreSQL ve S3-compatible receipt storage altyapısını içerir.

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
