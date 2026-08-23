import Link from 'next/link';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className={`brand${compact ? ' brand--compact' : ''}`}
      href="/overview"
      aria-label="Defterdar ana sayfa"
    >
      <span className="brand__mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <b>D</b>
      </span>
      <span className="brand__copy">
        <strong>Defterdar</strong>
        <small>ortak hesabın hafızası</small>
      </span>
    </Link>
  );
}
