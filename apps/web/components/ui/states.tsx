import { CircleAlert, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';

export function LoadingState({
  label = 'Kayıtlar açılıyor…',
}: {
  label?: string;
}) {
  return (
    <div className="state-panel state-panel--loading" role="status">
      <LoaderCircle className="spin" />
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
    <div className="state-panel state-panel--error" role="alert">
      <CircleAlert />
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
          <RefreshCw /> Tekrar dene
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
        <Inbox />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
