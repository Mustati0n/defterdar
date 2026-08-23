import type { ActivityItem } from './types';

const actions: Record<string, string> = {
  'expense.created': 'bir harcama ekledi',
  'expense.updated': 'bir harcamayı güncelledi',
  'expense.voided': 'bir harcamayı iptal etti',
  'income.created': 'bir gelir ekledi',
  'plan.created': 'bir plan oluşturdu',
  'plan.completed': 'bir planı tamamladı',
  'attachment.added': 'bir receipt ekledi',
  'attachment.removed': 'bir receipt kaldırdı',
  'member.joined': 'deftere katıldı',
};

export function activitySentence(item: ActivityItem): string {
  return (
    actions[item.action] ??
    `${item.entityType.toLocaleLowerCase('tr-TR')} kaydını değiştirdi`
  );
}
