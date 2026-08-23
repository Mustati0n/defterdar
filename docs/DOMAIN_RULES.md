# Domain Kuralları

1. Defter uzun süreli ana çalışma alanıdır ve `PERSONAL` veya `SHARED` türündedir.
2. Plan bir Defter'in alt öğesidir. Plan–Defter bağı açık tutulur; taşınma geçmiş kayıtlar gözetilerek ayrı bir uygulama işlemi olacaktır.
3. Defter üyeliği User ile Defter arasında ayrı bir kayıttır. Aynı kullanıcı aynı Defter'de birden fazla aktif üyelik taşıyamaz.
4. Plan katılımcıları Defter üyelerinin tamamı olmak zorunda değildir. Katılımcı kayıtlı bir kullanıcıyı ya da tek bir misafir adını temsil eder.
5. Para JavaScript floating-point değeriyle tutulmaz. Tutarlar para biriminin minor unit'i olarak güvenli tamsayı biçiminde işlenir (`125,50 TRY = 12550`). Para birimi her finansal olayda açıkça bulunur.
6. `Expense` finansal olaydır; `ExpenseSplit` ise katılımcının bu olaydan doğan payıdır. Bunlar aynı nesne değildir.
7. `Settlement`, bir kişinin diğerine yaptığı gerçek borç ödemesidir; gelir veya harcama olarak modellenmez.
8. “Borçtan düş” geçmiş olayları düzenlemez veya silmez. Yeni ve eski ters yönlü yükümlülükler korunur, net bakiye bu olaylardan hesaplanır.
9. “Ismarlama” geçmişte görünür bir harcama olabilir fakat seçilen kişiler için geri ödeme borcu üretmez. Finans şeması eklenmeden önce bu davranış açık bir alanla temsil edilecektir; belirsiz bir expense type yan etkisine dönüştürülmeyecektir.
10. Bir Expense en fazla 5 attachment alabilir. PostgreSQL yalnızca metadata (`storageKey`, MIME type, boyut) tutar; dosyanın kendisi object storage'da yer alır.
11. Finansal kayıtlarda hard delete varsayılan değildir. Expense ve Settlement gibi olaylar `voidedAt`; çalışma alanları ise gerektiğinde `archivedAt` ile etkisizleştirilir. Değişiklikler audit/activity kaydıyla izlenebilir olmalıdır.
12. Email kimliği trim ve lowercase uygulanarak normalize edilir; normalize edilmiş değer veritabanında unique'tir.
13. Kullanıcı `ACTIVE` veya `DISABLED` durumundadır. Disabled kullanıcı login, refresh veya korumalı endpoint erişimi yapamaz.
14. Bir kullanıcı birden fazla AuthSession taşıyabilir. AuthSession'ın User ilişkisi `RESTRICT` silme davranışındadır; kullanıcı yaşam döngüsü finansal geçmişi cascade ile silemez.
15. Raw refresh token kalıcı olarak saklanmaz. Her başarılı refresh eski session'ı revoke eder ve yeni bir session üretir.
16. Her kullanıcı tam olarak bir `PERSONAL` Defterin sahibidir ve bu Defterde tam olarak bir aktif üyelik bulunur: sahibinin `OWNER` üyeliği. İkinci PERSONAL Defter, davet, ayrılma, ownership transfer ve archive yasaktır.
17. Her Defterde `Ledger.ownerId` ile eşleşen tam olarak bir aktif `OWNER` üyeliği bulunur. SHARED ownership yalnızca ayrı transfer işlemiyle atomik olarak değiştirilir; eski OWNER `ADMIN`, hedef aktif üye `OWNER` olur.
18. `OWNER`, `ADMIN` ve `MEMBER` yetkileri [authorization matrisi](./AUTHORIZATION.md) ile tanımlıdır. Aktif üye olmayan kullanıcıya Defterin varlığı açıklanmaz ve `404` dönülür.
19. Üyelik çıkarma ve ayrılma hard delete yapmaz; `leftAt` ile geçmiş korunur. Aynı kullanıcı ve Defter için en fazla bir aktif üyelik olabilir.
20. SHARED Defter daveti yalnızca `MEMBER` rolü verir. Raw davet token'ı saklanmaz; SHA-256 hash saklanır. Davet süresi dolmuş, revoke edilmiş, kabul edilmiş veya arşivlenmiş Deftere aitse kabul edilemez.
21. Email-bound davetler normalize edilmiş email eşleşmesi ister; emailsiz davetler authenticated herhangi bir kullanıcı tarafından kabul edilebilir.
22. Arşivlenmiş SHARED Defter ve aktif üyeleri okunabilir. Metadata güncelleme, davet oluşturma/kabul, rol değişikliği, üye çıkarma, ayrılma ve ownership transfer engellenir; yalnız OWNER unarchive edebilir.
23. Ownership transfer, üye çıkarma, rol değişikliği ve Defter archive olayları ActivityLog eklendiğinde audit edilmelidir.

Bu fazda Expense, ExpenseSplit, Settlement, Category, Attachment ve ActivityLog tabloları oluşturulmamıştır. Kurallar sonraki şema değişikliklerinin sınırıdır; finans motoru uygulanırken migration ile ekleneceklerdir.
