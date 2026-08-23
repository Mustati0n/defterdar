# Analytics

`GET /ledgers/:ledgerId/analytics/summary` ve `GET /plans/:planId/analytics/summary` persistent analytics tablosu kullanmadan mevcut Expense, ExpenseSplit ve Income kayıtlarından projection üretir. Opsiyonel `from`/`to` inclusive UTC timestamp'tir ve `from <= to` olmalıdır. Monthly bucket `YYYY-MM` UTC takvim ayıdır.

Response currency, total Expense/Income, net cashflow, counts, category/month grouping, payer (`paidByMember`), split payı (`shareByMember`) ve date filtresinden bağımsız current Balance içerir. Tutarlar decimal minor-unit string'dir.

Kurallar:

- Voided Expense ve Income hariçtir.
- Gift gerçek spending olduğu için Expense, category, paid/share toplamına dahildir.
- Settlement cashflow geliri/harcaması değildir; analytics totaline girmez.
- ExpenseSplitOffset yalnız reconciliation metadata'sıdır; analytics amount üretmez.
- Plan endpoint'i yalnız o Plan'ın Expense/Income kayıtlarını kapsar.
- `paid` payer'ın Expense toplamı, `share` ExpenseSplit toplamıdır; debt/reimbursable anlamına gelmez.
