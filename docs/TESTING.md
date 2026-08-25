# Test Stratejisi

- Unit testleri saf domain kurallarını ve tekil servisleri veri tabanından bağımsız doğrular.
- Integration testleri Prisma repository'lerini gerçek ve izole bir PostgreSQL şeması üzerinde doğrular; migration'lar test başlangıcında uygulanır.
- API/e2e testleri derlenmiş NestJS uygulamasını ayrı bir process olarak ayağa kaldırıp Supertest ile HTTP sözleşmesini, validation ve hata biçimini sınar. `/health`, auth, current-user, Defter, üyelik, ownership, invitation ve archive akışları bu seviyede test edilir.
- Web e2e testleri, ürün akışları ortaya çıktığında tarayıcı üzerinden kritik kullanıcı senaryolarını kapsar.

Test verisi üretimdeki veri tabanını hiçbir zaman kullanmaz. Para ve bakiye testlerinde tamsayı minor unit'ler ve invariant tabanlı sınır durumları tercih edilir.

Auth e2e testleri yalnızca `TEST_DATABASE_URL` içindeki yerel `auth_e2e` PostgreSQL şemasını kabul eder. Test suite başlamadan önce bu şema sıfırlanır, migration'lar uygulanır ve suite sonunda şema temizlenir. Host adı localhost/127.0.0.1 veya şema adı `auth_e2e` değilse test güvenli biçimde durur. Testler development `public` şemasını ve production veritabanını kullanmaz.

Ledger e2e suite ayrı `ledger_e2e` şemasını kullanır. Registration sonrası sıfır
Ledger, açık opt-in Personal create ve ikinci Personal rejection yanında
OWNER/ADMIN/MEMBER matrisi, soft membership, ownership ve invitation yarışlarını
gerçek PostgreSQL üzerinde doğrular.

Plan e2e suite ayrı `plan_e2e` şemasını her çalışmada drop/create eder ve bütün
migration'ları sıfırdan deploy eder. Bağlı ve standalone create, creator
participant, email-bound hash-only invite/accept, lifecycle, `404` enumeration,
currency/participant/archive link failure'ları ve finans child'larıyla atomik
link davranışını doğrular.

Expense coverage, deterministic split calculator ve gerçek PostgreSQL API akışlarında currency snapshot, authorization, Gift reimbursement state, atomic invalid update ve void yaşam döngüsünü doğrular.

Phase 5 coverage settlement balance etkisi, partial/full/overpayment, completed Plan scope'u, idempotent void, resource enumeration ve aynı borca eşzamanlı ödeme yarışını; offset coverage eligibility, partial/concurrent apply, no-double-count, authorization, financial update protection ve Expense void cleanup davranışını gerçek PostgreSQL Serializable transaction'larıyla doğrular.

Category/Income e2e coverage PERSONAL ve SHARED Ledger, case-insensitive duplicate, kind/scope/archive kuralları, currency snapshot, Plan lifecycle, authorization/resource enumeration, void ve Income sonrası Balance'ın değişmemesini kapsar.

Attachment e2e testleri in-memory `ObjectStorageService` ile presigned lifecycle, MIME/size, read/mutation authorization, soft remove, void protection ve aynı Expense'a concurrent beş reservation invariant'ını doğrular. MinIO yalnız development smoke için gerekir.

Audit e2e coverage cursor pagination, member/non-member visibility, archived Ledger read, beklenen domain action'ları, secret/storage-key sızıntısı ve PostgreSQL immutable UPDATE trigger'ını kapsar.

Consistency e2e coverage aynı anda duplicate Expense create, aynı key/farklı body, Settlement/Offset/Income replay, tek persistent event, stale Expense PATCH ve successful version increment senaryolarını kapsar.

Analytics e2e coverage SHARED/PERSONAL ve Ledger-bound/standalone Plan scope,
UTC range, Gift, void exclusion, category/month/member grouping, Plan isolation,
Settlement/Offset exclusion ve non-member `404` davranışını kapsar.

Web Jest coverage global FAB context/keyboard, adaptive header, unified card
family, Overview 0/1/many, PageIntro resume/replay primitives, user-scoped UI
preferences, flexible analytics target persistence ve standalone finance form/
settlement invalidation davranışlarını içerir. Browser/device checklist otomatik
test sonucu gibi raporlanmaz.

Hardening coverage Helmet header'ı, body-size 413, real PostgreSQL readiness, tüm backend pathlerinin Swagger'da bulunması ve yeni/eski response'larda password/session/token/storage credential alanlarının bulunmamasını doğrular.
