# Defter Yetkilendirmesi

SHARED Defter için aktif üyelik matrisi:

| İşlem             | OWNER | ADMIN | MEMBER |
| ----------------- | :---: | :---: | :----: |
| Oku               |   ✓   |   ✓   |   ✓    |
| Metadata düzenle  |   ✓   |   ✓   |   —    |
| Üyeleri listele   |   ✓   |   ✓   |   ✓    |
| Davet yönet       |   ✓   |   ✓   |   —    |
| Rol değiştir      |   ✓   |   —   |   —    |
| Üye çıkar         |   ✓   |   —   |   —    |
| Ownership devret  |   ✓   |   —   |   —    |
| Archive/unarchive |   ✓   |   —   |   —    |
| Ayrıl             |  —\*  |   ✓   |   ✓    |

\* OWNER önce ownership transfer etmelidir.

Aktif üyeliği olmayan kullanıcı için hem var olan hem bilinmeyen Defter kimliği `404 Not Found` üretir. Aktif üyenin izin verilmeyen işlemi `403 Forbidden` üretir.

Arşivlenmiş SHARED Defterde yalnız okuma, üye listeleme ve OWNER tarafından unarchive işlemi açıktır. Diğer mutation'lar engellenir.

## PERSONAL Defter

PERSONAL Defter aynı authorization katmanını kullanır ve yalnız sahibinin aktif `OWNER` üyeliğini taşır. Adı OWNER tarafından değiştirilebilir. Yeni üye, davet, rol değişikliği, üyelikten ayrılma, ownership transfer, archive veya ikinci PERSONAL Defter oluşturma desteklenmez.

## Plan yetkilendirmesi

Plan yetkisi daima bağlı Ledger üyeliğinden gelir. OWNER ve ADMIN Plan oluşturabilir, okuyabilir, güncelleyebilir, complete/reopen/archive/unarchive yapabilir ve participant yönetebilir. MEMBER Plan oluşturup okuyabilir; yalnız kendi oluşturduğu ACTIVE Plan'ı güncelleyebilir, tamamlayabilir ve participant yönetebilir. MEMBER reopen, archive, unarchive veya Plan taşıyamaz.

Plan taşıma yalnız source Ledger OWNER'ına açıktır ve actor target Ledgerde OWNER ya da ADMIN olmalıdır. Archived Ledger veya archived Plan mutation'ları engeller.

## Expense yetkilendirmesi

Aktif Ledger üyesi Expense oluşturabilir ve okuyabilir. Update/void yalnız OWNER, ADMIN veya Expense creator'a açıktır; payer olmak tek başına bu izni vermez. Non-member Expense kimlikleri `404` ile gizlenir.
