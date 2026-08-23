'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/lib/api-client';
import { useAuth } from './auth-provider';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi yazın.'),
  password: z.string().min(1, 'Şifrenizi yazın.').max(128),
});

const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(2, 'Ad en az 2 karakter olmalı.').max(80),
  password: z.string().min(10, 'Şifre en az 10 karakter olmalı.').max(128),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = mode === 'login' ? loginSchema : registerSchema;
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues | RegisterValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginValues | RegisterValues) {
    setServerError(null);
    try {
      if (mode === 'register') {
        await register(values as RegisterValues);
      } else {
        await login(values as LoginValues);
      }
      const next = searchParams.get('next');
      router.replace(next?.startsWith('/') ? next : '/overview');
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'Oturum açılamadı. Tekrar deneyin.',
      );
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {mode === 'register' ? (
        <label className="field">
          <span>Adınız</span>
          <span className="input-wrap">
            <UserRound />
            <input
              autoComplete="name"
              placeholder="Defterde nasıl görünelim?"
              {...field('displayName')}
            />
          </span>
          {'displayName' in errors && errors.displayName ? (
            <small>{errors.displayName.message}</small>
          ) : null}
        </label>
      ) : null}

      <label className="field">
        <span>E-posta</span>
        <span className="input-wrap">
          <Mail />
          <input
            autoComplete="email"
            inputMode="email"
            placeholder="ornek@eposta.com"
            {...field('email')}
          />
        </span>
        {errors.email ? <small>{errors.email.message}</small> : null}
      </label>

      <label className="field">
        <span>Şifre</span>
        <span className="input-wrap">
          <LockKeyhole />
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            placeholder={mode === 'login' ? 'Şifreniz' : 'En az 10 karakter'}
            {...field('password')}
          />
          <button
            className="input-action"
            type="button"
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </span>
        {errors.password ? <small>{errors.password.message}</small> : null}
      </label>

      {serverError ? (
        <div className="form-error" role="alert">
          {serverError}
        </div>
      ) : null}

      <button
        className="button button--primary button--wide"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? 'Defter açılıyor…'
          : mode === 'login'
            ? 'Deftere gir'
            : 'Hesabını oluştur'}
        <ArrowRight />
      </button>

      <p className="auth-form__switch">
        {mode === 'login'
          ? 'Henüz hesabın yok mu?'
          : 'Zaten bir hesabın var mı?'}{' '}
        <Link href={mode === 'login' ? '/register' : '/login'}>
          {mode === 'login' ? 'Kayıt ol' : 'Giriş yap'}
        </Link>
      </p>
    </form>
  );
}
