# Harcamalar

`Expense` gerçek ödeme olayını, `ExpenseSplit` ise bu olayın kişiler arasındaki dağılımını temsil eder. Tutarlar API ve veritabanında minor unit integer olarak saklanır; float para hesabı yapılmaz.

EQUAL, EXACT, PERCENTAGE (10.000 basis point) ve SHARES split yöntemleri desteklenir. EQUAL/PERCENTAGE/SHARES deterministic largest-remainder yöntemiyle, user ID tie-break'i kullanılarak dağıtılır; split toplamı her zaman Expense toplamına eşittir.

Expense para birimini bağlı Ledger'dan snapshot alır. Payer aktif Ledger üyesi olmalıdır; Plan Expense'ta payer ve tüm split kullanıcıları aktif Plan participant olmalıdır. Gift/Ismarla harcamada tüm splitler non-reimbursable'dır; normal harcamada payer'ın kendi split'i non-reimbursable'dır.

Expense silinmez, `voidedAt` ile void edilir. Balance, Settlement ve Borçtan Düş hesaplamaları Phase 5 kapsamındadır.
