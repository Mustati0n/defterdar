import { CircleAlert, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';

export function LoadingState({
  label = 'Kayıtlar açılıyor…',
}: {
  label?: string;
}) {
  return (
    <div
      className="state-panel state-panel--loading"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <LoaderCircle className="spin" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  message = 'Bu sayfayı yüklerken bir sorun oluştu.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-panel state-panel--error" role="alert" aria-atomic="true">
      <CircleAlert aria-hidden="true" />
      <div>
        <strong>Kayıt burada takıldı</strong>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <button
          className="button button--quiet button--small"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw aria-hidden="true" /> Tekrar dene
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Inbox aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
