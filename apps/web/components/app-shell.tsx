'use client';

import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookTabs,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useAuth } from '@/features/auth/auth-provider';
import { useLedger, usePlan } from '@/features/data/hooks';
import { initials } from '@/lib/format';
import { Brand } from './brand';
import { SignatureLine } from './signature-line';
import { OnboardingExperience } from '@/features/onboarding/onboarding-experience';
import { useProtectedRoute } from '@/features/auth/use-protected-route';
import { FloatingQuickAdd } from './floating-quick-add';
import { InterfacePreferencesEffect } from '@/features/preferences/interface-preferences-effect';
import type { QuickActionContext, QuickActionKind } from '@/lib/quick-actions';
import {
  emptyRecentItems,
  mergeRecentItem,
  readRecentItems,
  recentItemHref,
  subscribeToRecentItems,
  writeRecentItems,
} from '@/lib/recent-items';

const QuickActionDialog = dynamic(
  () =>
    import('./quick-action-dialog').then((module) => module.QuickActionDialog),
  { ssr: false },
);

const navigation = [
  { href: '/overview', label: 'Özet', icon: LayoutDashboard },
  { href: '/workspace', label: 'Defterler & Planlar', icon: NotebookTabs },
  { href: '/statistics', label: 'İstatistikler', icon: BarChart3 },
];
const settingsItem = { href: '/settings', label: 'Ayarlar', icon: Settings };

export function matchesPath(pathname: string, href: string) {
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === '/workspace' &&
      (pathname.startsWith('/ledgers/') || pathname.startsWith('/plans/')))
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isBootstrapping, logout } = useAuth();
  const routeReady = useProtectedRoute();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [quickAction, setQuickAction] = useState<{
    kind: QuickActionKind;
    context: QuickActionContext;
  } | null>(null);
  const ledgerId = pathname.match(/^\/ledgers\/([^/]+)/)?.[1] ?? '';
  const planId = pathname.match(/^\/plans\/([^/]+)/)?.[1] ?? '';
  const activeLedger = useLedger(ledgerId, Boolean(user));
  const activePlan = usePlan(planId, Boolean(user));
  const userId = user?.id;
  const subscribeRecent = useCallback(
    (callback: () => void) =>
      userId ? subscribeToRecentItems(userId, callback) : () => undefined,
    [userId],
  );
  const getRecentSnapshot = useCallback(
    () => (userId ? readRecentItems(userId) : emptyRecentItems),
    [userId],
  );
  const recentItems = useSyncExternalStore(
    subscribeRecent,
    getRecentSnapshot,
    () => emptyRecentItems,
  );

  useEffect(() => {
    if (!user) return;
    const stored = readRecentItems(user.id);
    const candidate = ledgerId
      ? activeLedger.data
        ? {
            id: ledgerId,
            kind: 'ledger' as const,
            name: activeLedger.data.name,
            visitedAt: Date.now(),
          }
        : null
      : planId && activePlan.data
        ? {
            id: planId,
            kind: 'plan' as const,
            name: activePlan.data.name,
            visitedAt: Date.now(),
          }
        : null;
    const next = candidate ? mergeRecentItem(stored, candidate) : stored;
    if (candidate) writeRecentItems(user.id, next);
  }, [activeLedger.data, activePlan.data, ledgerId, pathname, planId, user]);

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    const trigger = mobileTriggerRef.current;
    if (!sidebar) return;
    const focusableSelector =
      'a[href], button:not([disabled]):not(.sidebar__collapse), [tabindex]:not([tabindex="-1"])';
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() =>
      mobileCloseRef.current?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable =
        sidebar.querySelectorAll<HTMLElement>(focusableSelector);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = bodyOverflow;
      trigger?.focus();
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const desktop = window.matchMedia('(min-width: 821px)');
    const closeOnDesktop = () => desktop.matches && setMobileOpen(false);
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  if (!routeReady || isBootstrapping || !user) {
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
        ref={mobileTriggerRef}
        onClick={() => setMobileOpen(true)}
        aria-label="Menüyü aç"
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
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
      <aside
        className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}
        id="app-sidebar"
        ref={sidebarRef}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label={mobileOpen ? 'Uygulama menüsü' : undefined}
      >
        <div className="sidebar__top">
          <Brand compact={collapsed} />
          <button
            className="sidebar__mobile-close"
            type="button"
            ref={mobileCloseRef}
            onClick={() => setMobileOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Ana menü">
          <span className="sidebar__section-label">Menü</span>
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

        <nav className="sidebar__recents" aria-label="Son kullanılanlar">
          <span className="sidebar__section-label">Son Kullanılanlar</span>
          {recentItems.length ? (
            recentItems.map((item) => {
              const Icon = item.kind === 'ledger' ? BookOpenText : CalendarDays;
              const href = recentItemHref(item);
              return (
                <Link
                  className={`sidebar__recent-item${pathname === href ? ' is-active' : ''}`}
                  href={href}
                  key={`${item.kind}:${item.id}`}
                  title={collapsed ? item.name : undefined}
                  aria-current={pathname === href ? 'page' : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon />
                  <span>{item.name}</span>
                </Link>
              );
            })
          ) : (
            <p className="sidebar__recents-empty">
              Açtığın Defter ve Planlar burada görünür.
            </p>
          )}
        </nav>

        <nav className="sidebar__utility" aria-label="Hesap ayarları">
          <Link
            className={`nav-item${matchesPath(pathname, settingsItem.href) ? ' nav-item--active' : ''}`}
            href={settingsItem.href}
            aria-current={
              matchesPath(pathname, settingsItem.href) ? 'page' : undefined
            }
            title={collapsed ? settingsItem.label : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <Settings />
            <span>{settingsItem.label}</span>
          </Link>
        </nav>

        <div className="sidebar__account">
          <span className="avatar">{initials(user.displayName)}</span>
          <Link href="/settings" onClick={() => setMobileOpen(false)}>
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </Link>
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
          aria-expanded={!collapsed}
          title={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        >
          <ChevronLeft />
          <span>Menüyü daralt</span>
        </button>
      </aside>

      <main
        className="app-main"
        inert={mobileOpen ? true : undefined}
        aria-hidden={mobileOpen || undefined}
      >
        <div className="app-topbar">
          <span className="app-topbar__context">
            <NotebookTabs /> Defterdar /{' '}
            <b>
              {navigation.find((item) => matchesPath(pathname, item.href))
                ?.label ??
                (matchesPath(pathname, settingsItem.href)
                  ? settingsItem.label
                  : 'Özet')}
            </b>
          </span>
          <Link className="profile-link" href="/settings">
            <CircleUserRound /> <span>{user.displayName}</span>
          </Link>
        </div>
        <SignatureLine />
        <div className="page-container">
          <div className="route-content" key={pathname}>
            {children}
          </div>
        </div>
      </main>
      <div
        className="global-create-layer"
        inert={mobileOpen ? true : undefined}
        aria-hidden={mobileOpen || undefined}
      >
        <FloatingQuickAdd
          key={pathname}
          onAction={(kind, context) => setQuickAction({ kind, context })}
        />
      </div>
      {quickAction ? (
        <QuickActionDialog
          action={quickAction}
          onClose={() => setQuickAction(null)}
        />
      ) : null}
      <InterfacePreferencesEffect />
      <OnboardingExperience />
    </div>
  );
}
