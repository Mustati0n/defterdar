import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth-layout';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'Giriş yap' };

export default function LoginPage() {
  return (
    <AuthLayout
      eyebrow="Tekrar hoş geldin"
      title="Defterin seni bekliyor."
      description="Kaldığın yerden devam etmek için bilgilerini yaz."
    >
      <Suspense fallback={<div className="auth-form-skeleton" />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthLayout>
  );
}
