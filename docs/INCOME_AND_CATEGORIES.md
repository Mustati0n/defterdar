# Income ve Categories

Category Ledger kapsamındadır; `EXPENSE`, `INCOME` veya `BOTH` kind taşır. İsim trim edilir ve aynı Ledger içinde büyük/küçük harf duyarsız benzersizdir. Category hard-delete edilmez; archive edilmiş kategori yeni kayda atanamaz, geçmiş Expense/Income ilişkileri okunmaya devam eder. Create/update/archive yalnız OWNER ve ADMIN'e, listeleme tüm aktif üyelere açıktır.

Income pozitif cashflow kaydıdır; interpersonal Balance'a etki etmez ve Settlement değildir. Tutar minor-unit integer, currency Ledger snapshot'ıdır. Opsiyonel Category aynı Ledger'a ait, aktif ve `INCOME`/`BOTH`; opsiyonel Plan aynı Ledger'a ait ve ACTIVE olmalıdır. OWNER, ADMIN ve creator güncelleyebilir/void edebilir; hard delete yoktur.

Endpointler:

- `POST/GET /ledgers/:ledgerId/categories`
- `PATCH /categories/:categoryId`, `POST /categories/:categoryId/archive`
- `POST/GET /ledgers/:ledgerId/incomes`
- `GET/PATCH /incomes/:incomeId`, `POST /incomes/:incomeId/void`
