# Domain Kuralları

1. Yeni User sıfır Ledger ve sıfır Plan ile başlayabilir. Registration otomatik
   Personal Ledger oluşturmaz.
2. User isterse istediği kadar Defter oluşturur. Collaboration kullanıcı
   seçimi değildir; aktif üyelikten türetilir (`activeMemberCount > 1`).
   Tek kişilik Defter sonradan davetle ortak hale gelebilir.
3. Defter creator'ı atomik OWNER olur. Aktif OWNER/member invariant'ları
   database trigger ve partial unique indexlerle korunur.
4. Membership ve finans geçmişi hard delete edilmez; `leftAt`, `archivedAt` ve
   `voidedAt` kullanılır.
5. Non-member mevcut ve rastgele resource aynı `404`; aktif ama yetkisiz member
   `403` alır.
6. Plan `STANDALONE` (`ledgerId = null`, kendi currency'si) veya Ledger-bound
   olabilir. Her Plan'ın creator'ı atomik participant olur.
7. Standalone participant kayıtlı User olmalıdır. Davet normalize email-bound,
   raw token yerine SHA-256 hash saklar; guest accounting yoktur.
8. Standalone Plan yalnız ACTIVE iken, aynı currency'li arşivlenmemiş Shared
   Ledger'a ve tüm participant'lar target aktif member iken bağlanabilir.
9. Link Plan ve bütün child Expense/Income/Settlement scope'unu tek transaction'da
   günceller. Hata partial state bırakmaz. Immutable Activity geçmişi taşınmaz.
10. Plan lifecycle `ACTIVE`, `COMPLETED`, `ARCHIVED` kullanır. Expense/Income
    create ACTIVE; Settlement ACTIVE/COMPLETED durumda açıktır.
11. Para minor-unit safe integer olarak tutulur. Currency her finans olayında
    Ledger veya standalone Plan'dan snapshot alınır; client override edemez.
12. Expense ve ExpenseSplit aynı transaction'da oluşturulur/güncellenir. Split
    toplamı Expense toplamına eşittir; EQUAL/EXACT/PERCENTAGE/SHARES
    deterministic'tir.
13. Standalone financial record `planId` taşır; Ledger-bound record `ledgerId`
    taşır ve opsiyonel Plan'a bağlı olabilir. DB check orphan record'ı engeller.
14. Payer ve split kişiler scope'ta aktif; Plan Expense'ta ayrıca participant
    olmalıdır. Standalone Expense Ledger Category kullanamaz.
15. Gift/Ismarla spending geçmişinde kalır, bütün splitleri non-reimbursable
    yapar. Normal Expense'ta payer'ın kendi split'i non-reimbursable'dır.
16. Expense PATCH version claim eder. Stale/invalid update state'i değiştirmez;
    başarılı financial update splits ile atomiktir.
17. Balance persistent tablo değildir. ExpenseSplit ve Settlement'tan zero-sum
    türetilir. Income, Gift'in non-reimbursable payları ve voided olaylar borç
    üretmez.
18. Settlement gerçek debtor→creditor ödemesidir. Serializable validation
    overpayment ve eşzamanlı aggregate aşımını engeller.
19. Borçtan düş ödeme değildir. Hedef Expense hariç aynı scope projection'ından
    eligibility hesaplar ve Balance/Analytics'e ikinci kez eklenmez.
20. Income pozitif cashflow'dur. Standalone'da Plan currency taşır ve analytics
    üretir; interpersonal Balance üretmez.
21. Receipt binary object storage'dadır. PostgreSQL metadata/server key tutar;
    allowlist MIME, size ve Expense başına beş aktif attachment limiti vardır.
22. ActivityLog append-only'dir. Standalone event `planId`, bağlı event Ledger ve
    uygun olduğunda Plan scope'u taşır. Public update/delete endpoint'i yoktur.
23. Financial POST idempotency operation key'ine Ledger veya Plan scope ID'sini
    dahil eder. Aynı key/farklı body conflict üretir.
24. Analytics voided kayıtları dışlar; Gift'i spending'e dahil eder; Settlement
    ve Offset'i cashflow olarak saymaz. Farklı currency'ler aggregate edilmez.
25. Page intro ve UI preferences backend domain'i değildir; user ID içeren,
    versioned, SSR-safe client keys ile saklanır ve kullanıcılar arasında sızmaz.
