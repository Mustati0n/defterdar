import { BookOpenText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="standalone-state">
      <BookOpenText />
      <span className="eyebrow">Sayfa bulunamadı</span>
      <h1>Aradığın sayfa bu Defterde yok.</h1>
      <p>Bağlantı değişmiş veya kayıt artık erişilebilir olmayabilir.</p>
      <Link className="button button--primary" href="/overview">
        <ArrowLeft /> Genel Bakış&apos;a dön
      </Link>
    </main>
  );
}
