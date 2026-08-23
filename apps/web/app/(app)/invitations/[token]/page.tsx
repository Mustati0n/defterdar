'use client';

import { useMutation } from '@tanstack/react-query';
import { BookOpenCheck } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const accept = useMutation({
    mutationFn: () => api.ledgers.acceptInvitation(token),
    onSuccess: ({ ledgerId }) => router.replace(`/ledgers/${ledgerId}`),
  });
  return (
    <section className="paper-section invitation-page">
      <BookOpenCheck />
      <span className="eyebrow">Defter daveti</span>
      <h1>Bu Deftere katılmak ister misin?</h1>
      <p>
        Katıldığında Defterin mevcut kayıtlarını görebilir ve üye yetkilerinle
        yeni kayıt ekleyebilirsin.
      </p>
      {accept.error ? (
        <div className="form-error" role="alert">
          {accept.error instanceof ApiError
            ? accept.error.message
            : 'Davet kabul edilemedi.'}
        </div>
      ) : null}
      <button
        className="button button--primary button--tall"
        type="button"
        disabled={accept.isPending}
        onClick={() => accept.mutate()}
      >
        {accept.isPending ? 'Katılım tamamlanıyor…' : 'Daveti kabul et'}
      </button>
    </section>
  );
}
