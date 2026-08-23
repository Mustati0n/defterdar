# Receipt Attachments

Expense başına en fazla beş aktif JPEG, PNG veya WebP receipt metadata kaydı tutulur. Binary PostgreSQL'e veya API request body'ye girmez. Varsayılan maksimum 10 MiB'dir ve `ATTACHMENT_MAX_BYTES` ile ayarlanır.

Akış:

1. `POST /expenses/:expenseId/attachments` ile server-generated storage key ve kısa ömürlü upload URL alınır.
2. Client objeyi doğrudan S3-compatible storage'a yükler.
3. `POST /attachments/:attachmentId/complete` HEAD ile boyut/MIME bilgisini doğrular ve kaydı `READY` yapar.
4. `GET /attachments/:attachmentId/url` kısa ömürlü download URL üretir.
5. `DELETE /attachments/:attachmentId` metadata'yı `deletedAt` ile korur ve objeyi best-effort siler.

Storage key filename içermez; UUID tabanlıdır. Upload/remove OWNER, ADMIN veya Expense creator'a; read aktif Ledger üyelerine açıktır. Voided Expense ve archived Ledger yeni upload kabul etmez. Beşli limit Expense satır kilidi altında sayıldığı için concurrent reservation ile aşılamaz.

Development `docker compose up -d` ile MinIO ve `defterdar-receipts` bucket'ını başlatır. API, S3-compatible endpoint ayarlarını `.env.example` üzerinden alır. Test ortamı dış cloud gerektirmeyen in-memory fake kullanır.
