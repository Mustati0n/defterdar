# Balances

Balance mutable bir tablo değil; void edilmemiş Expense/reimbursable ExpenseSplit ve Settlement olaylarından türetilen projection'dır. `netMinor > 0` alacak, `netMinor < 0` borç, `0` denge anlamına gelir ve tüm pozisyonların toplamı daima sıfırdır. Settlement göndereni `+amountMinor`, alanı `-amountMinor` etkiler; void edilmiş Settlement yok sayılır.

Ledger scope doğrudan Ledger ve bütün alt Plan Expense'larını; Plan scope yalnız seçilen Plan Expense'larını içerir. Gift/Ismarla, payer'ın kendi split'i ve void edilmiş Expense balance üretmez.

Settlement suggestions veritabanına yazılmaz ve ödeme değildir. Borçlular/alacaklılar absolute amount descending, user ID ascending sırasıyla deterministic greedy eşleştirilir; bu debt simplification sağlar ancak global minimum transfer sayısı garantisi vermez. Gerçek `Settlement`, ilgili scope projection'ındaki debtor→creditor yönü ve mevcut maksimum ile Serializable transaction içinde doğrulanır.

`ExpenseSplitOffset` (Borçtan düş) ödeme değildir ve balance'a ikinci kez etki etmez. Hedef Expense hariç projection'da payer→split user suggestion'ı varsa, aktif offset toplamı split tutarı ve bu önceki suggestion ile sınırlanır.
