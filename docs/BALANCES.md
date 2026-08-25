# Balances

Balance mutable tablo değildir. Voided olmayan reimbursable ExpenseSplit ve
Settlement olaylarından türetilir. `netMinor > 0` alacak, `< 0` ödeme, `0` kapalı
hesap anlamına gelir; toplam her zaman sıfırdır.

Ledger projection Ledger ve bağlı Plan kayıtlarını kapsar. Plan projection,
Plan bağımsız veya bağlı olsun yalnız o Plan'ın Expense ve Settlement'larını
kapsar. Gift, payer'ın kendi split'i, Income ve voided olaylar Balance üretmez.

Settlement suggestion persistent ödeme değildir. Gerçek Settlement debtor →
creditor yönü ve maksimum mevcut borçla Serializable transaction içinde
doğrulanır. Standalone endpoint `POST /plans/:planId/settlements` participant,
lifecycle, creator/involved-party yetkisi ve overpayment koruması uygular.

`ExpenseSplitOffset` (Borçtan düş) ödeme değildir ve projection'a ikinci kez
eklenmez. Hedef Expense hariç aynı finansal scope'taki ters suggestion üzerinden
eligibility hesaplanır. Full/partial create, history, void ve concurrent apply
aynı aggregate limitlerini korur.
