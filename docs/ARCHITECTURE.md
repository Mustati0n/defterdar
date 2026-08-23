# Mimari

```text
Web
 ↓ REST
NestJS API
 ↓
Prisma
 ↓
PostgreSQL
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
