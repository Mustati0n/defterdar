# Idempotency ve Optimistic Concurrency

Financial create endpointleri `Idempotency-Key` header'ını destekler: Expense, Settlement, ExpenseSplitOffset ve Income. Key kullanıcı+operation/scope içinde benzersizdir. Request body canonical JSON olarak SHA-256 hash'lenir; raw secret tutulmaz.

Aynı key ve aynı request tamamlandıysa kayıt tekrar oluşturulmaz, saklanan response döner. Aynı key farklı request ile kullanılırsa `409 Conflict` oluşur. Eşzamanlı aynı key isteklerinden biri işlemi sahiplenir, diğerleri bounded olarak sonucu bekler. Başarısız mutation'ın processing kaydı temizlenerek güvenli retry mümkün bırakılır. Kayıtlar 24 saat expiry metadata'sı taşır; otomatik purge bu MVP'nin request path'i dışında operasyonel iştir.

Expense response'u `version` taşır. Her PATCH zorunlu `expectedVersion` ister. Transaction içindeki compare-and-increment başarısızsa `409`; başarılı update version'ı bir artırır. Bu kural metadata ve finansal PATCH için aynıdır ve aktif offset financial-update korumasıyla birlikte uygulanır.
