import type { ActivityItem } from './types';
import { formatMoneyFromMinor } from './format';

const actions: Record<string, string> = {
  'expense.created': 'bir harcama ekledi',
  'expense.updated': 'bir harcamayı güncelledi',
  'expense.voided': 'bir harcamayı iptal etti',
  'income.created': 'bir gelir ekledi',
  'income.updated': 'bir geliri güncelledi',
  'income.voided': 'bir gelir kaydını iptal etti',
  'plan.created': 'bir plan oluşturdu',
  'plan.updated': 'bir planı güncelledi',
  'plan.completed': 'bir planı tamamladı',
  'plan.reopened': 'bir planı yeniden açtı',
  'plan.archived': 'bir planı arşivledi',
  'plan.linked': 'bir planı Deftere bağladı',
  'plan.moved_in': 'bir planı bu Deftere taşıdı',
  'plan.moved_out': 'bir planı başka bir Deftere taşıdı',
  'plan.participant_joined': 'bir plana katıldı',
  'attachment.added': 'bir fiş ekledi',
  'attachment.removed': 'bir fiş kaldırdı',
  'member.joined': 'deftere katıldı',
  'membership.left': 'Defterden ayrıldı',
  'membership.removed': 'bir üyeyi Defterden çıkardı',
  'membership.role_changed': 'bir üyenin yetkisini değiştirdi',
  'ledger.created': 'bir Defter oluşturdu',
  'ledger.updated': 'bir Defteri güncelledi',
  'ledger.archived': 'bir Defteri arşivledi',
  'ledger.unarchived': 'bir Defteri yeniden açtı',
  'ledger.ownership_transferred': 'Defter sahipliğini devretti',
  'category.created': 'bir kategori oluşturdu',
  'category.updated': 'bir kategoriyi güncelledi',
  'category.archived': 'bir kategoriyi arşivledi',
  'settlement.created': 'bir ödemeyi kaydetti',
  'settlement.voided': 'bir ödeme kaydını geri aldı',
  'payment.marked_paid': 'ödemeyi yaptığını bildirdi',
  'payment.confirmed': 'ödemeyi aldığını onayladı',
  'payment.rejected': 'ödemenin gelmediğini bildirdi',
  'payment.cancelled': 'ödeme bildirimini iptal etti',
  'payment.voided': 'onaylanmış ödeme kaydını geri aldı',
  'offset.created': 'bir payı mevcut borçtan düştü',
  'offset.voided': 'bir Borçtan düş işlemini geri aldı',
};

export function activitySentence(item: ActivityItem): string {
  return (
    actions[item.action] ??
    `${item.entityType.toLocaleLowerCase('tr-TR')} kaydını değiştirdi`
  );
}

export function activityAmount(item: ActivityItem): string | null {
  const amountMinor = item.metadata.amountMinor;
  const currency = item.metadata.currency;
  if (
    (typeof amountMinor !== 'number' && typeof amountMinor !== 'string') ||
    typeof currency !== 'string'
  ) {
    return null;
  }

  return formatMoneyFromMinor(amountMinor, currency);
}

export function activityStatus(item: ActivityItem): {
  label: string;
  tone: 'pending' | 'positive' | 'critical' | 'muted';
} | null {
  return (
    {
      'payment.marked_paid': {
        label: 'Onay bekliyor',
        tone: 'pending' as const,
      },
      'payment.confirmed': { label: 'Onaylandı', tone: 'positive' as const },
      'payment.rejected': { label: 'Reddedildi', tone: 'critical' as const },
      'payment.cancelled': { label: 'İptal edildi', tone: 'muted' as const },
      'payment.voided': { label: 'Geri alındı', tone: 'muted' as const },
    }[item.action] ?? null
  );
}

export function formatActivityTime(
  value: string,
  referenceTime: number,
): string {
  const date = new Date(value);
  const reference = new Date(referenceTime);
  const dayKey = (item: Date) =>
    Date.UTC(item.getFullYear(), item.getMonth(), item.getDate());
  const dayDifference = Math.round(
    (dayKey(reference) - dayKey(date)) / (24 * 60 * 60 * 1000),
  );
  const time = date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (dayDifference === 0) return `Bugün, ${time}`;
  if (dayDifference === 1) return `Dün, ${time}`;
  return `${date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  })}, ${time}`;
}
