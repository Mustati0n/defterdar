import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth-layout';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'Kayıt ol' };

export default function RegisterPage() {
  return (
    <AuthLayout
      eyebrow="İlk sayfayı aç"
      title="Yeni bir defter başlıyor."
      description="Bir dakika içinde hesabını oluştur, ortak hesabı sadeleştir."
    >
      <Suspense fallback={<div className="auth-form-skeleton" />}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthLayout>
  );
}
