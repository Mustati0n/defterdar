# Planlar

## Kapsam

```text
Standalone Plan                 Ledger-bound Plan
Plan.currency                   Ledger.currency snapshot
ledgerId = null                 ledgerId = Ledger
PlanParticipant                 active Ledger member + PlanParticipant
```

`POST /plans` bağımsız, `POST /ledgers/:ledgerId/plans` bağlı Plan oluşturur.
Creator aynı transaction'da participant olur. Bağımsız Plan list/read işlemleri
creator veya participant'a; bağlı Plan erişimi aktif Ledger üyeliğine açıktır.
Non-member mevcut ve rastgele resource aynı `404` sonucunu verir.

## Davet ve participant

Bağımsız davet normalize email'e bağlıdır. Raw token yalnız create response'unda
bulunur; veritabanında SHA-256 hash tutulur. Kabul authenticated kullanıcının
email'iyle eşleşir ve invitation claim ile participant create atomiktir. Guest
financial participant yoktur.

Bağlı Plan participant'ı aktif Ledger üyesi olmalıdır. Historical participant
kayıtları membership değişiminde topluca silinmez.

## Lifecycle ve finans

`ACTIVE → COMPLETED → ACTIVE`; archive `ARCHIVED` ve `archivedAt` üretir.
Expense/Income yalnız ACTIVE durumda, Settlement ACTIVE veya COMPLETED durumda
kaydedilir. Balance, Activity ve Analytics bağımsız Plan için Ledger'a ihtiyaç
duymaz ve yalnız ilgili Plan kayıtlarını kapsar.

## Deftere bağlama

Yalnız ACTIVE standalone Plan bağlanabilir. Hedef:

- arşivlenmemiş Shared Ledger olmalı;
- Plan ile aynı currency'yi taşımalı;
- bütün participant'ları aktif Ledger member olarak içermeli;
- actor için gerekli yönetim yetkisini sağlamalıdır.

Link transaction Plan, Expense, Income ve Settlement `ledgerId` alanlarını
birlikte günceller. Herhangi bir validation/concurrency hatası `409` üretir ve
partial state bırakmaz. Immutable Activity satırları taşınmaz; link olayı hedef
Ledger'a eklenir, eski standalone eventler Plan scope'ta kalır.
