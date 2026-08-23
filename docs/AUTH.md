# Authentication

## Password hashing

Parolalar 10–128 karakter aralığında kabul edilir ve Argon2id ile hashlenir. Plain-text parola loglanmaz, saklanmaz veya response'a eklenmez. Parametreler tek bir password service içinde merkezi tutulur.

## Access token

Access token HS256 JWT'dir ve yalnızca kullanıcı kimliğini `sub` claim'i olarak taşır. Varsayılan ömrü 900 saniyedir; `JWT_ACCESS_TTL` ile değiştirilir. İmza secret'ı en az 32 karakter olmalı ve yalnızca environment üzerinden sağlanmalıdır.

## Refresh token ve session

Refresh token 256-bit cryptographically secure random opaque değerdir. Raw değer yalnızca oluşturulduğu response'ta görünür. PostgreSQL'deki AuthSession kaydı token'ın SHA-256 hash'ini, sona erme zamanını ve revoke durumunu tutar. Bir kullanıcı eşzamanlı birden fazla session taşıyabilir.

## Rotation

Başarılı refresh işleminde mevcut session transaction içinde revoke edilir ve yeni refresh token için yeni AuthSession oluşturulur. Koşullu update aynı token'ın eşzamanlı iki kez kullanılmasında yalnızca bir işlemin başarılı olmasını sağlar. Eski, expired, bilinmeyen veya revoke edilmiş token reddedilir.

## Logout

Logout, gönderilen refresh token'ın session'ını revoke eder. Aynı veya bilinmeyen token ile tekrar çağrı idempotent biçimde `204 No Content` döner. Diğer cihaz/session kayıtları etkilenmez.

## Rate limiting ve CORS

Auth controller in-memory rate limit kullanır. Bu çözüm tek API instance'ı içindir; bu fazda Redis veya distributed limiter yoktur. İzin verilen CORS origin'leri virgülle ayrılmış `CORS_ORIGINS` environment değeriyle belirlenir; wildcard kabul edilmez.

## HTTP hardening

Helmet security header'ları tüm response'lara uygulanır; development Swagger uyumluluğu için yalnız CSP devre dışıdır, production'da Helmet default CSP açıktır. JSON/urlencoded body varsayılan `1mb` ile sınırlıdır (`API_BODY_LIMIT`). Beklenen validation/authorization/conflict hataları 400/401/403/404/409; beklenmeyen hata ve Prisma detayları generic 500 response'unun arkasında kalır.
