'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/auth-provider';

export function AuthRoute({ children }: { children: ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isBootstrapping && user) router.replace('/overview');
  }, [isBootstrapping, router, user]);

  if (isBootstrapping || user) return null;
  return children;
}
