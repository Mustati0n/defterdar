# Harcamalar

Expense gerçek ödeme olayını, ExpenseSplit kişiler arasındaki dağılımı temsil
eder. Tutarlar minor unit integer'dır; float para hesabı yapılmaz.

## Scope ve create

- `POST /ledgers/:ledgerId/expenses`: Ledger veya bağlı Plan Expense;
- `POST /plans/:planId/expenses`: bağımsız ya da bağlı Plan context;
- standalone: `ledgerId = null`, `planId` required, currency Plan snapshot;
- Ledger-bound: currency Ledger snapshot.

Financial DB check en az bir anlamlı Ledger/Plan scope ister. Standalone Category
kullanmaz; Ledger Category opsiyonel, aktif ve uygun kind olmalıdır.

Payer ve split kullanıcıları scope'ta aktif olmalıdır. Plan Expense için ayrıca
PlanParticipant olmaları ve Plan'ın ACTIVE olması gerekir. EQUAL, EXACT,
PERCENTAGE (10.000 bps) ve SHARES aynı deterministic calculator'ı kullanır.
Gift/Ismarla tüm splitleri; normal Expense payer splitini non-reimbursable yapar.

## Mutation ve güvenlik

Expense + splits aynı transaction'da create/update edilir. `expectedVersion`
stale writer'ı `409` ile engeller; invalid update eski state'i değiştirmez.
Update/void OWNER, ADMIN, Plan creator veya Expense creator'a açıktır; payer tek
başına edit hakkı değildir. Hard delete yoktur, `voidedAt` kullanılır.

Aktif offset finansal alan güncellemesini kilitler; Expense void aynı transaction
içinde offsetleri de void eder. Financial create Idempotency-Key'i operation
scope'a Ledger veya Plan ID'sini dahil eder.

Attachment lifecycle Expense'a bağlı olduğundan standalone'da da aynıdır:
server key, MIME/size allowlist, en fazla beş aktif reservation, presigned
upload/download ve soft remove.
