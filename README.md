# Defterdar

Defterdar'ın pnpm monorepo tabanlı Phase 0 teknik temeli. Bu repository NestJS REST API, Next.js web iskeleti, Prisma 7 ve PostgreSQL geliştirme altyapısını içerir.

## Gereksinimler

- Node.js 24 LTS (`.nvmrc`)
- pnpm 11.22.0
- Docker ve Docker Compose

## Kurulum

```bash
cp .env.example .env
# .env içindeki yerel parolayı değiştirin; POSTGRES_PORT ve DATABASE_URL eşleşmelidir.
pnpm install
docker compose up -d
pnpm db:deploy
```

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
