# Harcamalar

`Expense` gerçek ödeme olayını, `ExpenseSplit` ise bu olayın kişiler arasındaki dağılımını temsil eder. Tutarlar API ve veritabanında minor unit integer olarak saklanır; float para hesabı yapılmaz.

EQUAL, EXACT, PERCENTAGE (10.000 basis point) ve SHARES split yöntemleri desteklenir. EQUAL/PERCENTAGE/SHARES deterministic largest-remainder yöntemiyle, user ID tie-break'i kullanılarak dağıtılır; split toplamı her zaman Expense toplamına eşittir.

Expense para birimini bağlı Ledger'dan snapshot alır. Payer aktif Ledger üyesi olmalıdır; Plan Expense'ta payer ve tüm split kullanıcıları aktif Plan participant olmalıdır. Gift/Ismarla harcamada tüm splitler non-reimbursable'dır; normal harcamada payer'ın kendi split'i non-reimbursable'dır.

Opsiyonel Category aynı Ledger'a ait, aktif ve `EXPENSE` veya `BOTH` kind olmalıdır. Category değişikliği borç matematiğini değiştirmez ve offset financial-update kilidine dahil değildir.

Expense silinmez, `voidedAt` ile void edilir. Aktif Borçtan düş kaydı finansal alanların (`amountMinor`, payer, Plan, Gift ve split) değiştirilmesini engeller; metadata değişebilir. Expense void işlemi bağlı aktif offset'leri aynı transaction içinde void eder. Split response'u aktif `offsetAppliedMinor` ve `remainingReimbursableMinor` değerlerini taşır.

Her Expense `version` ile optimistic concurrency uygular. PATCH mevcut `expectedVersion` değerini ister; stale update `409` döner, başarılı update version'ı artırır. Create retry'ları opsiyonel `Idempotency-Key` ile deduplicate edilir.
