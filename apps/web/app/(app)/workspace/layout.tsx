import type { ReactNode } from 'react';

export default function WorkspaceLayout({
  children,
  plan,
}: {
  children: ReactNode;
  plan: ReactNode;
}) {
  return (
    <>
      {children}
      {plan}
    </>
  );
}
