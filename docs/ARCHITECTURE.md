# Mimari

```text
Web
 ↓ REST
NestJS API
 ↓
Prisma
 ↓
PostgreSQL

API → presigned URL → S3-compatible object storage
```

`apps/web` ve `apps/api` bağımsız uygulamalardır. Web uygulaması PostgreSQL'e veya Prisma'ya doğrudan bağlanmaz; bütün işlevlere sürümlenebilir REST API sözleşmesi üzerinden erişir.

API, HTTP taşıma ve doğrulama katmanını; Prisma ise veri erişimi ve migration'ları yönetir. PostgreSQL geliştirme ortamında Docker Compose ile çalışır. Swagger arayüzü geliştirme sırasında `/docs` yolunda sunulur.

Monorepo yalnızca derleme araçlarını ve taşıma katmanından bağımsız sözleşmeleri paylaşır. `shared-types` paketi bu amaçla yalnızca saf TypeScript tipleri içerir; Prisma tipleri web uygulamasına aktarılmaz.

## Kimlik doğrulama sınırı

```text
Credentials → AuthService → Argon2id / AuthSession
                         ↓
                  JWT access token
                         ↓
               AccessTokenGuard → Users API
```

Controller'lar parola, token veya session mantığı taşımaz. `AccessTokenGuard`, access token'ı doğrular ve aktif kullanıcıyı request context'ine ekler. Refresh token rotation, eski session'ın revoke edilmesiyle yeni session'ın oluşturulmasını tek PostgreSQL transaction'ında gerçekleştirir.

## Defter ve yetkilendirme sınırı

```text
AccessTokenGuard
      ↓ active user
LedgerAuthorizationService → active membership + ledger state
      ↓
Ledger / Membership / Invitation services
      ↓ transaction + database invariants
PostgreSQL
```

`LedgerAuthorizationService`, üyelik bulunmayan mevcut ve bilinmeyen Defter kimliklerini aynı `404` sonucu ile gizler; üye olup rolü yetersiz kullanıcıya `403` verir. Arşivlenmiş Defter mutation'ları aynı merkezi katmanda engellenir. Controller'lar rol kararlarını tekrar etmez.

SHARED Defter oluşturma, opt-in PERSONAL Defter oluşturma, ownership transfer ve
invitation kabul işlemleri transaction sınırları içindedir. Registration finansal
çalışma alanı yaratmaz. PostgreSQL kısmi unique indexleri her Defter için tek
aktif `OWNER` ve kullanıcı başına en fazla bir `PERSONAL` Defter kuralını korur.
Deferred constraint trigger, `Ledger.ownerId` ile aktif OWNER üyeliğinin
eşleşmesini ve var olan PERSONAL Defterin tek aktif üyeliğe sahip olmasını commit
anında doğrular.

Davet token'ı 256-bit güvenli rastgele veridir. Raw token yalnızca oluşturma response'unda bulunur; PostgreSQL'e deterministik SHA-256 hash yazılır. Kabul işlemi ledger satır kilidi, atomik invitation claim ve aktif üyelik unique invariant'ı ile yarış koşullarına karşı korunur.

## Plan sınırı

`PlanAuthorizationService`, standalone Plan erişimini creator/participant'tan;
bağlı Plan erişimini mevcut `LedgerAuthorizationService` üyeliğinden türetir.
Ayrı generic policy motoru yoktur. Create işlemi Plan ve creator participant'ı
tek transaction'da yazar. Standalone invitation raw token yerine email-bound
hash saklar. Link işlemi Plan, target Ledger ve üyelikleri kilit altında
doğrular; Plan ile Expense/Income/Settlement scope'unu atomik günceller.

Expense yazımı Expense ve ExpenseSplit kayıtlarını aynı PostgreSQL transaction'ında oluşturur veya yeniler. Split calculator database bağımsız ve deterministic'tir; BigInt değerleri API response'unda decimal string olarak sunulur.

## Finansal reconciliation sınırı

`FinancialProjectionService`, nullable Ledger ve required-when-standalone Plan
scope'larını aynı saf `BalanceCalculator` üzerinden zero-sum pozisyonlara
dönüştürür. Ledger projection bağlı alt Planları; Plan projection Ledger'dan
bağımsız olarak yalnız kendi olaylarını kapsar. Settlement validation ve Offset
eligibility aynı projection'ı kullanır. Kritik create işlemleri PostgreSQL
Serializable isolation ve bounded retry ile aggregate limitleri korur.

Category, Ledger kapsamlı referans verisidir. Income ayrı cashflow aggregate'ıdır ve projection katmanına bilinçli olarak dahil edilmez; böylece kişisel gelir takibi interpersonal borçtan ayrılır.

Receipt binary'leri API ve PostgreSQL sınırının dışındadır. `ObjectStorageService` S3/MinIO presigned URL, HEAD ve delete işlemlerini soyutlar; test provider'ı aynı contract'ı in-memory uygular. PostgreSQL yalnız immutable server storage key'i ve dosya metadata'sını tutar.

`ActivityLogService` önemli domain mutation'larına transaction-scoped immutable audit insert ekler. Activity stream event-sourcing veya generic event bus değildir; mevcut aggregate tabloları source of truth olmaya devam eder. PostgreSQL trigger'ları audit satırının sonradan update/delete edilmesini engeller.

`IdempotencyService`, finansal POST retry'larını PostgreSQL unique `(userId, operation, key)` claim'i ve canonical request hash'iyle koordine eder. Expense PATCH compare-and-increment version koşulunu mutation transaction'ında uygular. Redis veya distributed lock yoktur.

Analytics persistent/materialized tablo değildir. Bounded Ledger/Plan ve tarih filtreli PostgreSQL sorguları uygulama katmanında category/month/member projection'larına dönüştürülür; current Balance ortak balance service'inden alınır. Tutarlar API'ye decimal minor-unit string olarak çıkar.

HTTP sınırı environment tabanlı CORS, Helmet, bounded JSON/urlencoded parser, global DTO validation ve güvenli exception filter uygular. `/health` process liveness, `/health/ready` gerçek PostgreSQL sorgusuyla readiness gösterir.
