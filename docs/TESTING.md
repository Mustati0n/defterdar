# Test Stratejisi

- Unit testleri saf domain kurallarını ve tekil servisleri veri tabanından bağımsız doğrular.
- Integration testleri Prisma repository'lerini gerçek ve izole bir PostgreSQL şeması üzerinde doğrular; migration'lar test başlangıcında uygulanır.
- API/e2e testleri derlenmiş NestJS uygulamasını ayrı bir process olarak ayağa kaldırıp Supertest ile HTTP sözleşmesini, validation ve hata biçimini sınar. `/health`, auth, current-user, Defter, üyelik, ownership, invitation ve archive akışları bu seviyede test edilir.
- Web e2e testleri, ürün akışları ortaya çıktığında tarayıcı üzerinden kritik kullanıcı senaryolarını kapsar.

Test verisi üretimdeki veri tabanını hiçbir zaman kullanmaz. Para ve bakiye testlerinde tamsayı minor unit'ler ve invariant tabanlı sınır durumları tercih edilir.

Auth e2e testleri yalnızca `TEST_DATABASE_URL` içindeki yerel `auth_e2e` PostgreSQL şemasını kabul eder. Test suite başlamadan önce bu şema sıfırlanır, migration'lar uygulanır ve suite sonunda şema temizlenir. Host adı localhost/127.0.0.1 veya şema adı `auth_e2e` değilse test güvenli biçimde durur. Testler development `public` şemasını ve production veritabanını kullanmaz.

Ledger e2e suite aynı güvenlik yaklaşımıyla ayrı `ledger_e2e` şemasını kullanır. Register ile PERSONAL Defter backstop'unu, OWNER/ADMIN/MEMBER matrisini, non-member `404` davranışını, soft membership yaşam döngüsünü, ownership transfer invariant'ını, raw token'ın saklanmadığını, email/open davetleri, expiry/revoke/duplicate durumlarını ve eşzamanlı tek-token kabul yarışını gerçek PostgreSQL üzerinde doğrular. Response ve Swagger kontrolleri gizli hash/session alanlarının dışarı çıkmadığını da sınar.

Plan e2e suite ayrı `plan_e2e` şemasında Plan–Ledger hiyerarşisini, creator participant transaction'ını, tarihlerin nihai state doğrulamasını, lifecycle yetkilerini, participant duplicate/aktif üyelik kurallarını, `404` enumeration davranışını ve participant uyumluluğu ile atomik Plan taşımasını doğrular.

Expense coverage, deterministic split calculator ve gerçek PostgreSQL API akışlarında currency snapshot, authorization, Gift reimbursement state, atomic invalid update ve void yaşam döngüsünü doğrular.

Phase 5 coverage settlement balance etkisi, partial/full/overpayment, completed Plan scope'u, idempotent void, resource enumeration ve aynı borca eşzamanlı ödeme yarışını; offset coverage eligibility, partial/concurrent apply, no-double-count, authorization, financial update protection ve Expense void cleanup davranışını gerçek PostgreSQL Serializable transaction'larıyla doğrular.
