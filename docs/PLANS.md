# Planlar

## Hiyerarşi

```text
Ledger
└── Plan
    └── PlanParticipant
```

Plan yalnız Ledger altında oluşturulur. PERSONAL Ledger altında oluşturulan Plan, hızlı kişisel kullanımın normal Plan karşılığıdır; orphan Plan yoktur.

## Lifecycle

`ACTIVE → COMPLETED → ACTIVE` geçişi complete/reopen endpointleriyle yapılır. Archive, Plan'ı `ARCHIVED` ve `archivedAt` dolu duruma getirir. Unarchive her zaman `ACTIVE` ve `archivedAt: null` sonucunu üretir. Archived Plan okunur fakat metadata ve participant mutation'ları kapalıdır.

## Katılımcılar

Creator Plan oluşturulurken otomatik participant olur. Katılımcı gerçek bir User ve aktif Ledger üyesi olmalıdır; aynı kullanıcı bir Plan'a bir kez eklenebilir. Üyelikten ayrılma tarihsel participant kaydını silmez, fakat kullanıcıyı yeni participant yapmayı veya Plan mutation'ını engeller.

## Yetki ve taşıma

OWNER/ADMIN tüm Plan yönetimini yapar. MEMBER yalnız kendi oluşturduğu ACTIVE Plan'da metadata ve participant yönetimi yapabilir; kendi Planını complete edebilir. Plan taşıma yalnız source OWNER'a açıktır ve target Ledgerde OWNER/ADMIN rolü gerekir. Tüm participant'lar target'ın aktif üyesi değilse taşıma `409 Conflict` ile reddedilir; participant otomatik silinmez.

Plan Expense ve yeni Income yalnız ACTIVE durumda oluşturulur. Settlement ACTIVE ve COMPLETED Plan'da kaydedilebilir; ARCHIVED Plan mutation kabul etmez. Plan Balance ve Analytics yalnız ilgili Plan'ın kayıtlarını kapsar.
