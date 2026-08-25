'use client';

import { useMutation } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';

export default function PlanInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => api.plans.acceptInvitation(token),
    onSuccess: ({ planId }) => router.replace(`/plans/${planId}`),
  });

  return (
    <section className="paper-section invitation-page">
      <CheckCircle2 />
      <span className="eyebrow">Plan daveti</span>
      <h1>Bu Plana katıl.</h1>
      <p>
        Davet e-posta adresinle eşleşirse Plan katılımcıları arasına
        ekleneceksin.
      </p>
      {mutation.isError ? (
        <p role="alert">
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Davet kabul edilemedi.'}
        </p>
      ) : null}
      <button
        className="button button--primary"
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? 'Katılınıyor…' : 'Plan davetini kabul et'}
      </button>
    </section>
  );
}
