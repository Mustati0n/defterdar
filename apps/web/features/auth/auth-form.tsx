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
        <div className="field">
          <label htmlFor="auth-display-name">Adınız</label>
          <span className="input-wrap">
            <UserRound />
            <input
              id="auth-display-name"
              autoComplete="name"
              placeholder="Defterde nasıl görünelim?"
              aria-invalid={Boolean(
                'displayName' in errors && errors.displayName,
              )}
              aria-describedby={
                'displayName' in errors && errors.displayName
                  ? 'auth-display-name-error'
                  : undefined
              }
              {...field('displayName')}
            />
          </span>
          {'displayName' in errors && errors.displayName ? (
            <small id="auth-display-name-error" role="alert">
              {errors.displayName.message}
            </small>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="auth-email">E-posta</label>
        <span className="input-wrap">
          <Mail />
          <input
            id="auth-email"
            autoComplete="email"
            inputMode="email"
            placeholder="ornek@eposta.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'auth-email-error' : undefined}
            {...field('email')}
          />
        </span>
        {errors.email ? (
          <small id="auth-email-error" role="alert">
            {errors.email.message}
          </small>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="auth-password">Şifre</label>
        <span className="input-wrap">
          <LockKeyhole />
          <input
            id="auth-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            placeholder={mode === 'login' ? 'Şifreniz' : 'En az 10 karakter'}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'auth-password-error' : undefined
            }
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
        {errors.password ? (
          <small id="auth-password-error" role="alert">
            {errors.password.message}
          </small>
        ) : null}
      </div>

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
