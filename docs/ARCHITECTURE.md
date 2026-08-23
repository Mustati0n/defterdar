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

Defter oluşturma, kayıt sırasında PERSONAL Defter oluşturma, ownership transfer ve invitation kabul işlemleri transaction sınırları içindedir. PostgreSQL kısmi unique indexleri her Defter için tek aktif `OWNER` ve kullanıcı başına tek `PERSONAL` Defter kuralını korur. Deferred constraint trigger, `Ledger.ownerId` ile aktif OWNER üyeliğinin eşleşmesini ve PERSONAL Defterin tek aktif üyeliğe sahip olmasını commit anında doğrular.

Davet token'ı 256-bit güvenli rastgele veridir. Raw token yalnızca oluşturma response'unda bulunur; PostgreSQL'e deterministik SHA-256 hash yazılır. Kabul işlemi ledger satır kilidi, atomik invitation claim ve aktif üyelik unique invariant'ı ile yarış koşullarına karşı korunur.

## Plan sınırı

`PlansService`, Plan erişimini bağlı `LedgerAuthorizationService` üyeliğinden türetir. Ayrı bir Plan ACL tablosu veya policy motoru yoktur. Plan create işlemi Plan ve creator `PlanParticipant` kaydını tek transaction içinde yazar. Taşıma işlemi kaynak/target Ledger satırlarını ve target üyeliklerini transaction içinde doğrular; uyumsuz katılımcı varsa `ledgerId` değişmeden conflict döner.

Expense yazımı Expense ve ExpenseSplit kayıtlarını aynı PostgreSQL transaction'ında oluşturur veya yeniler. Split calculator database bağımsız ve deterministic'tir; BigInt değerleri API response'unda decimal string olarak sunulur.

## Finansal reconciliation sınırı

`FinancialProjectionService`, Expense/Split ve Settlement olaylarını ortak saf `BalanceCalculator` üzerinden zero-sum pozisyonlara dönüştürür. Ledger projection tüm alt Plan olaylarını; Plan projection yalnız kendi olaylarını kapsar. Settlement validation ve ExpenseSplitOffset eligibility aynı projection'ı kullanır. Kritik create işlemleri PostgreSQL Serializable isolation ve en fazla üç denemeli retry ile concurrency altında aggregate limitleri korur. Offset yalnız reconciliation metadata'sıdır ve projection girdisi değildir.

Category, Ledger kapsamlı referans verisidir. Income ayrı cashflow aggregate'ıdır ve projection katmanına bilinçli olarak dahil edilmez; böylece kişisel gelir takibi interpersonal borçtan ayrılır.

Receipt binary'leri API ve PostgreSQL sınırının dışındadır. `ObjectStorageService` S3/MinIO presigned URL, HEAD ve delete işlemlerini soyutlar; test provider'ı aynı contract'ı in-memory uygular. PostgreSQL yalnız immutable server storage key'i ve dosya metadata'sını tutar.

`ActivityLogService` önemli domain mutation'larına transaction-scoped immutable audit insert ekler. Activity stream event-sourcing veya generic event bus değildir; mevcut aggregate tabloları source of truth olmaya devam eder. PostgreSQL trigger'ları audit satırının sonradan update/delete edilmesini engeller.

`IdempotencyService`, finansal POST retry'larını PostgreSQL unique `(userId, operation, key)` claim'i ve canonical request hash'iyle koordine eder. Expense PATCH compare-and-increment version koşulunu mutation transaction'ında uygular. Redis veya distributed lock yoktur.
