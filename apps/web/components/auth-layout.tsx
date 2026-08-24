import { Feather } from 'lucide-react';
import type { ReactNode } from 'react';
import { Brand } from './brand';

export function AuthLayout({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-panel__inner">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
      </section>
      <section className="auth-story">
        <Brand />
        <div className="auth-story__copy">
          <span className="eyebrow eyebrow--light">
            <Feather /> Beraber tutulan hesaplar
          </span>
          <h2>
            Para konuşulur.
            <br />
            <em>Hatırası incitmez.</em>
          </h2>
          <p>
            Ortak harcamaları, planları ve kimde ne kaldığını tek bir sıcak
            defterde topla.
          </p>
        </div>
      </section>
    </main>
  );
}
