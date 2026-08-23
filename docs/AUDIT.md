# Immutable Activity Audit

`ActivityLog` Ledger kapsamlı, append-only audit stream'idir. PostgreSQL trigger'ları UPDATE ve DELETE işlemlerini reddeder; API yalnız read endpoint'i sunar. Finansal mutation ve audit insert aynı Prisma transaction'ında yapılır. Metadata allowlist yaklaşımıyla yazılır; parola, token/hash, storage key veya credential içermez.

Kaydedilen ana olaylar Ledger lifecycle/ownership/role/removal, Plan lifecycle/move, Expense, Settlement, Offset, Income, Category ve Attachment mutation'larıdır. `actorUserId` authenticated actor'ı gösterir; sistem kaynaklı gelecekteki olaylar için nullable tutulur.

`GET /ledgers/:ledgerId/activity?limit=50&cursor=<uuid>` aktif üyelere açıktır, archived Ledger'da okunabilir. Limit en fazla 100'dür. Response `items` ve varsa `nextCursor` taşır.
