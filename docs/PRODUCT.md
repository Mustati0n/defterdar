# Defterdar Ürün Özeti

Defterdar, kişilerin tek başına veya bir grupla harcamaları, borçları, ödemeleri ve kısa süreli planları takip etmesini sağlayan bir uygulamadır.

## Defter

Defter, sistemin uzun süreli ana çalışma alanıdır. `PERSONAL` bir Defter yalnızca kişisel finans takibi içindir; `SHARED` bir Defter ise üyelerin ortak finansal geçmişini ve yükümlülüklerini düzenler.

Her kullanıcı kayıt sırasında `Kişisel Defterim` adlı, ortamın `DEFAULT_CURRENCY` değeriyle oluşturulan tam bir `PERSONAL` Defter alır. Bu Defter yalnızca sahibinin `OWNER` üyeliğini taşır; davet edilemez, terk edilemez, devredilemez veya arşivlenemez.

Bir kullanıcı istediği kadar `SHARED` Defter oluşturabilir. Oluşturan kullanıcı atomik olarak `OWNER` olur. `OWNER`, `ADMIN` ve `MEMBER` rolleri ortak Defter erişimini sınırlar; üyelik davet bağlantısıyla başlar ve ayrılma/çıkarılma halinde geçmiş korunarak pasifleştirilir. Ortak Defterler silinmek yerine arşivlenir; arşivlenmiş içerik okunabilir ancak yeni üyelik ve yönetim değişikliklerine kapalıdır.

## Plan

Plan, bir Defter'in altında yer alan kısa süreli organizasyondur. Gezi veya etkinlik gibi belirli bir döneme ait kayıtları gruplar. Plan ile Defter ilişkisi açık bir yabancı anahtardır; böylece ileride bir Plan, geçmişi korunarak başka bir Defter'e taşınabilir.

Plan bağımsız veya sahipsiz oluşturulamaz: hızlı kişisel Plan da kullanıcının `PERSONAL` Defteri altında normal bir Plan'dır. Oluşturan kullanıcı başlangıçta otomatik katılımcıdır. Katılımcılar yalnız aktif Defter üyelerinden seçilir; davet/üyelikten ayrılma sonrası geçmiş katılımcı kaydı silinmez.

Plan yaşam döngüsü `ACTIVE`, `COMPLETED`, `ARCHIVED` durumlarıyla yönetilir. Archive geçmişi okunur tutar fakat düzenleme ve katılımcı değişikliklerini kapatır. Plan, yalnız kaynak Defter OWNER'ı tarafından ve hedef Defterde OWNER/ADMIN yetkisi varsa taşınabilir; hedefte aktif üye olmayan katılımcı bulunursa taşıma gerçekleşmez.

Kişisel kullanımda kullanıcı kendi kayıtlarını yönetir. Ortak kullanımda roller, üyelikler ve katılımcılar üzerinden birden fazla kişinin aynı finansal bağlamda çalışması sağlanır. Bir Plan'ın katılımcıları Defter üyelerinin tamamıyla aynı olmak zorunda değildir.
