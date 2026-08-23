'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './auth-provider';

export function useProtectedRoute(): boolean {
  const { user, isBootstrapping } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isBootstrapping, pathname, router, user]);

  return !isBootstrapping && Boolean(user);
}
