import type { ReactNode } from 'react';
import { AuthRoute } from '@/components/auth-route';

export default function PublicAuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthRoute>{children}</AuthRoute>;
}
