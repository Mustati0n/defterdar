import type { LucideIcon } from 'lucide-react';

export function DetailViewHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: React.ReactNode;
}) {
  return (
    <header className="detail-view-header">
      <span className="detail-view-header__icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="detail-view-header__copy">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {meta ? <div className="detail-view-header__meta">{meta}</div> : null}
    </header>
  );
}
