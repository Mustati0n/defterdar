# Income ve Categories

Category Ledger kapsamındadır; `EXPENSE`, `INCOME` veya `BOTH` kind taşır. İsim
trim edilir ve aynı Ledger içinde büyük/küçük harf duyarsız benzersizdir.
Category hard-delete edilmez; archive edilmiş kategori yeni kayda atanamaz,
geçmiş Expense/Income ilişkileri okunmaya devam eder. Create/update/archive
yalnız OWNER ve ADMIN'e, listeleme tüm aktif üyelere açıktır.

Income pozitif cashflow kaydıdır; interpersonal Balance'a etki etmez ve
Settlement değildir. Tutar minor-unit integer'dır. Ledger-bound Income currency'yi
Ledger'dan, standalone Plan Income ise Plan'dan snapshot alır; client currency
override edemez. Standalone Income `ledgerId = null` ve `planId` ile saklanır.
Category yalnız Ledger-bound scope'ta kullanılabilir; aktif ve `INCOME`/`BOTH`
olmalıdır. Ledger-bound Plan aynı Ledger'a ait ve ACTIVE olmalıdır. Scope yöneticisi
ve creator güncelleyebilir/void edebilir; hard delete yoktur.

Endpointler:

- `POST/GET /ledgers/:ledgerId/categories`
- `PATCH /categories/:categoryId`, `POST /categories/:categoryId/archive`
- `POST/GET /ledgers/:ledgerId/incomes`
- `POST/GET /plans/:planId/incomes`
- `GET/PATCH /incomes/:incomeId`, `POST /incomes/:incomeId/void`
