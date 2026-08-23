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
