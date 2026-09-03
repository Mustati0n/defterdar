import { redirect } from 'next/navigation';

export default async function LegacyPlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ type: 'plan' });
  if (params.create) target.set('create', 'plan');
  if (typeof params.ledgerId === 'string') {
    target.set('ledgerId', params.ledgerId);
  }
  if (params.standalone === '1') target.set('standalone', '1');
  redirect(`/workspace?${target.toString()}`);
}
