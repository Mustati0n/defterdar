'use client';

import { CircleAlert, RefreshCw } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="standalone-state" role="alert">
      <CircleAlert />
      <span className="eyebrow">Kayıt burada takıldı</span>
      <h1>Bu sayfa şu anda açılamadı.</h1>
      <p>Bilgilerin güvende. Sayfayı yeniden yüklemeyi deneyebilirsin.</p>
      <button className="button button--primary" type="button" onClick={reset}>
        <RefreshCw /> Tekrar dene
      </button>
    </main>
  );
}
