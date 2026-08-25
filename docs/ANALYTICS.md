# Analytics

`GET /ledgers/:ledgerId/analytics/summary` ve
`GET /plans/:planId/analytics/summary` persistent analytics tablosu olmadan
Expense, ExpenseSplit ve Income'dan projection üretir. Plan endpoint'i bağımsız
Plan için Ledger dependency taşımaz ve currency olarak `Plan.currency` kullanır.

Opsiyonel `from`/`to` inclusive UTC timestamp'tir. Response total expense,
income, net cashflow, counts, category/month/member dağılımı ve tarih filtresinden
bağımsız current Balance içerir. Voided kayıtlar hariç, Gift spending'e dahil;
Settlement ve Offset analytics amount değildir.

Web selector yalnız API'den gelen gerçek kaynakları iki grupta gösterir:
Defterler ve Planlar (standalone + bağlı). Personal Defter yalnız gerçekten
varsa görünür. Son hedef kullanıcı bazlı saklanır; hedef yoksa sahte default
yerine dürüst empty state gösterilir. Farklı currency'ler aggregate edilmez.

Hazır dönemler ve custom tarih kontrolleri adaptive page header içinde kalır.
Completed standalone veya bağlı Plan aynı final-summary davranışını kullanır.
