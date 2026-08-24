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
      <section className="auth-story">
        <Brand />
        <div className="auth-story__copy">
          <span className="eyebrow eyebrow--light">
            <Feather /> Beraber tutulan hesaplar
          </span>
          <h1>
            Para konuşulur.
            <br />
            <em>Hatırası incitmez.</em>
          </h1>
          <p>
            Ortak harcamaları, planları ve kimde ne kaldığını tek bir sıcak
            defterde topla.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__inner">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
