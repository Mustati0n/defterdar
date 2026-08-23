'use client';

import {
  BarChart3,
  BookOpenText,
  ChevronLeft,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookTabs,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { initials } from '@/lib/format';
import { Brand } from './brand';
import { SignatureLine } from './signature-line';

const navigation = [
  { href: '/overview', label: 'Özet', icon: LayoutDashboard },
  { href: '/ledgers', label: 'Defterler', icon: BookOpenText },
  { href: '/plans', label: 'Planlar', icon: NotebookTabs },
  { href: '/statistics', label: 'İstatistikler', icon: BarChart3 },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
];

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isBootstrapping, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isBootstrapping, pathname, router, user]);

  if (isBootstrapping || !user) {
    return (
      <main className="session-loader" role="status">
        <Brand />
        <span className="session-loader__line" />
        <p>Defterin sayfaları açılıyor…</p>
      </main>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className={`app-frame${collapsed ? ' app-frame--collapsed' : ''}`}>
      <button
        className="mobile-menu-button"
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Menüyü aç"
      >
        <Menu />
      </button>
      {mobileOpen ? (
        <button
          className="sidebar-scrim"
          aria-label="Menüyü kapat"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <Brand compact={collapsed} />
          <button
            className="sidebar__mobile-close"
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Ana menü">
          <span className="sidebar__section-label">Çalışma masası</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = matchesPath(pathname, item.href);
            return (
              <Link
                className={`nav-item${active ? ' nav-item--active' : ''}`}
                href={item.href}
                key={item.href}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar__hint">
          <Sparkles />
          <div>
            <strong>Küçük not</strong>
            <p>Hesabı yazınca akılda yer açılır.</p>
          </div>
        </div>

        <div className="sidebar__account">
          <span className="avatar">{initials(user.displayName)}</span>
          <div>
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Çıkış yap"
            title="Çıkış yap"
          >
            <LogOut />
          </button>
        </div>

        <button
          className="sidebar__collapse"
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        >
          <ChevronLeft />
          <span>Menüyü daralt</span>
        </button>
      </aside>

      <main className="app-main">
        <div className="app-topbar">
          <span className="app-topbar__context">
            <NotebookTabs /> Açık defterler / <b>çalışma masası</b>
          </span>
          <Link className="profile-link" href="/settings">
            <CircleUserRound /> <span>{user.displayName}</span>
          </Link>
        </div>
        <SignatureLine />
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
