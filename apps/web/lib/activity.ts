import type { ActivityItem } from './types';

const actions: Record<string, string> = {
  'expense.created': 'bir harcama ekledi',
  'expense.updated': 'bir harcamayı güncelledi',
  'expense.voided': 'bir harcamayı iptal etti',
  'income.created': 'bir gelir ekledi',
  'plan.created': 'bir plan oluşturdu',
  'plan.completed': 'bir planı tamamladı',
  'attachment.added': 'bir fiş ekledi',
  'attachment.removed': 'bir fiş kaldırdı',
  'member.joined': 'deftere katıldı',
  'settlement.created': 'bir ödemeyi kaydetti',
  'settlement.voided': 'bir ödeme kaydını geri aldı',
  'offset.created': 'bir payı mevcut borçtan düştü',
  'offset.voided': 'bir Borçtan düş işlemini geri aldı',
};

export function activitySentence(item: ActivityItem): string {
  return (
    actions[item.action] ??
    `${item.entityType.toLocaleLowerCase('tr-TR')} kaydını değiştirdi`
  );
}
