# Defterdar Ürün Özeti

Defterdar, kişisel ve ortak finans kayıtlarını uzun süreli Defterler ile kısa
süreli Planlarda düzenler. Product Model V2 hiçbir kullanıcı için sahte veya
gizli bir Personal alan varsaymaz.

## Defter

Defter uzun süreli çalışma alanıdır. Kullanıcı kişisel/ortak ayrımı seçmez;
collaboration aktif üyelikten türetilir. Tek sahipli Defter tek kişilik,
ek üyesi olan Defter ortak Defter olarak sunulur. Yeni kullanıcı sıfır Defterle
başlar; dilediği kadar Defter oluşturabilir ve herhangi birine sonradan arkadaş
davet edebilir.

Defter creator'ı atomik olarak `OWNER` olur. `OWNER`, `ADMIN`, `MEMBER`
rolleri, soft membership yaşam döngüsü, hash-only davetler ve archive-only
geçmiş modeli uygulanır. Davet, ownership transfer ve archive her Defterde
geçerlidir.

## Plan

Plan bir gezi, kutlama veya etkinlik gibi kısa süreli çalışma alanıdır. İki
geçerli kapsamı vardır:

- bağımsız: `ledgerId = null`, creator PlanParticipant olur ve para birimi Plan
  üzerinde tutulur;
- Deftere bağlı: Plan ve finans kayıtları aynı Ledger kapsamındadır.

Bağımsız Plan hash-only, email-bound davetle kayıtlı Defterdar kullanıcılarını
participant yapar. Aktif bağımsız Plan; para birimi aynı, arşivlenmemiş ve bütün
participant'ları aktif üye olan bir Shared Deftere atomik bağlanabilir. Finans
child kayıtları aynı transaction'da taşınır; audit geçmişi yeniden yazılmaz.

Plan lifecycle `ACTIVE`, `COMPLETED`, `ARCHIVED` kullanır. Expense/Income yalnız
ACTIVE; Settlement ACTIVE veya COMPLETED durumda oluşturulur. ARCHIVED yalnız
okunur.

## Finans

Expense gerçek harcama, ExpenseSplit dağılımdır. EQUAL, EXACT, PERCENTAGE ve
SHARES deterministic çalışır. Currency Ledger veya bağımsız Plan'dan snapshot
alınır. Gift/Ismarla spending geçmişinde kalır fakat geri ödeme üretmez.

Balance persistent tablo değildir; Expense/Split, Settlement ve reconciliation
kurallarından zero-sum türetilir. Borçtan düş geçmiş ters yönlü borcu açıkça
eşler ve projection'a ikinci kez etki etmez. Income nakit akışıdır; interpersonal
Balance üretmez. Receipt binary object storage'da, metadata PostgreSQL'dedir.

## Web deneyimi

Global FAB mevcut bağlama göre Expense, Income, Plan ve Defter aksiyonlarını
önden seçer. Adaptive başlıklar uzun sayfalarda araç barına dönüşür; signature
line scroll ilerlemesini gösterir. Page intro ve density, motion, Overview
bölümleri, adaptive header tercihleri kullanıcı bazlı ve SSR-safe saklanır.
Analytics yalnız gerçek Defter ve Plan hedeflerini listeler; para birimleri
birleştirilmez.
