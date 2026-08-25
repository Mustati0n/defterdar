# Yetkilendirme

## Ledger

| İşlem             | OWNER | ADMIN | MEMBER |
| ----------------- | :---: | :---: | :----: |
| Oku               |   ✓   |   ✓   |   ✓    |
| Metadata düzenle  |   ✓   |   ✓   |   —    |
| Davet yönet       |   ✓   |   ✓   |   —    |
| Rol/ownership     |   ✓   |   —   |   —    |
| Archive/unarchive |   ✓   |   —   |   —    |
| Ayrıl             |  —\*  |   ✓   |   ✓    |

\* OWNER önce ownership transfer etmelidir. Non-member mevcut ve bilinmeyen
resource için aynı `404`; aktif fakat yetkisiz member için `403` kullanılır.

Personal Defter opt-in oluşturulur, yalnız sahibinin OWNER üyeliğini taşır ve
davet/ayrılma/transfer/archive kabul etmez. Database kullanıcı başına en fazla
bir Personal Defter kuralını korur.

## Plan

Ledger-bound Plan erişimi aktif membership ve mevcut role dayanır. MEMBER kendi
oluşturduğu ACTIVE Plan'ı yönetebilir; lifecycle/participant/transfer matrisi
mevcut Ledger yaklaşımını reuse eder.

Standalone Plan creator'ı yönetici, PlanParticipant okuyucudur. Creator davet,
metadata, lifecycle ve link işlemlerini yapar. Email-bound invitation yalnız
eşleşen authenticated user tarafından kabul edilir. Participant olmayan kullanıcı
standalone resource'u `404` görür.

## Finans

- Expense create scope üyesi/participant'a; update/void OWNER, ADMIN, Plan
  creator veya Expense creator'a açıktır.
- Settlement create OWNER/ADMIN, standalone Plan creator veya involved party'ye;
  void yönetici ya da Settlement creator'a açıktır.
- Offset create OWNER/ADMIN/Plan creator, Expense creator veya payer'a; void
  bunlara ek offset creator'a açıktır.
- Income update/void OWNER/ADMIN/Plan creator veya Income creator'a açıktır.
- Attachment read Expense reader'a; reserve/complete/remove yönetici veya
  Expense creator'a açıktır.

ACTIVE/COMPLETED/ARCHIVED lifecycle ve archive kontrolleri her mutation'da
uygulanır. Standalone Activity, Balance ve Analytics Plan access yaklaşımını;
Ledger-bound kaynaklar Ledger authorization yaklaşımını reuse eder.
