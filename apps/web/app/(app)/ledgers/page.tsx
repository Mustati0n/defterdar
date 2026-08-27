import { redirect } from 'next/navigation';

export default async function LegacyLedgersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ type: 'ledger' });
  if (params.create) target.set('create', 'ledger');
  redirect(`/workspace?${target.toString()}`);
}
