import { AlertCircle, RotateCcw } from 'lucide-react';
import { FinancialPosition } from './financial-position';
import {
  pendingApprovalImpactMinor,
  pendingApprovalsFor,
} from './financial-ux';
import type { Settlement } from '@/lib/types';

export function PaymentApprovalSummary({
  settlements,
  currentUserId,
  currency,
  accountHref,
  isLoading,
  isError,
  onRetry,
}: {
  settlements: Settlement[] | undefined;
  currentUserId: string;
  currency: string;
  accountHref: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) return null;

  if (isError) {
    return (
      <aside className="ledger-approval-entry" aria-label="Ödeme onayları">
        <span aria-hidden="true">
          <AlertCircle />
        </span>
        <div>
          <span className="type-detail-label">Ödeme onayları</span>
          <h2>Onaylar kontrol edilemedi</h2>
          <p>Kayıtların güvende. Bağlantıyı yeniden deneyebilirsin.</p>
        </div>
        <button
          className="button button--quiet"
          type="button"
          onClick={onRetry}
        >
          <RotateCcw /> Tekrar dene
        </button>
      </aside>
    );
  }

  const pending = pendingApprovalsFor(settlements ?? [], currentUserId);
  if (!pending.length) return null;

  return (
    <FinancialPosition
      state="PENDING_APPROVAL"
      currency={currency}
      amountMinor={pendingApprovalImpactMinor(pending)}
      pendingCount={pending.length}
      label="Ödeme onayları"
      items={pending.slice(0, 2).map((settlement) => ({
        id: settlement.id,
        label: `${settlement.fromUser.displayName} ödeme bildirdi`,
        amountMinor: settlement.amountMinor,
      }))}
      action={{ href: accountHref, label: 'İncele' }}
    />
  );
}
