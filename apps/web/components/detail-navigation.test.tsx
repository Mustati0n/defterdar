import { BookOpenText, Settings } from 'lucide-react';
import { render, screen } from '@testing-library/react';
import {
  DetailNavigation,
  detailViewHref,
  resolveDetailView,
} from './detail-navigation';

describe('detail URL navigation', () => {
  it('restores valid URL state and safely defaults invalid state', () => {
    const allowed = ['general', 'balance'] as const;
    expect(resolveDetailView('balance', allowed, 'general')).toBe('balance');
    expect(resolveDetailView('unknown', allowed, 'general')).toBe('general');
    expect(resolveDetailView(null, allowed, 'general')).toBe('general');
  });

  it('builds refreshable links for primary and secondary destinations', () => {
    expect(detailViewHref('/ledgers/l1', 'general')).toBe('/ledgers/l1');
    expect(detailViewHref('/ledgers/l1', 'settings')).toBe(
      '/ledgers/l1?view=settings',
    );
    render(
      <DetailNavigation
        label="Defter bölümleri"
        basePath="/ledgers/l1"
        activeView="settings"
        primary={[{ id: 'general', label: 'Genel', icon: BookOpenText }]}
        secondary={[{ id: 'settings', label: 'Ayarlar', icon: Settings }]}
        secondaryLabel="Hesap & yönetim"
      />,
    );
    expect(
      screen.getByText('Hesap & yönetim', { exact: false }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Daha fazla')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ayarlar/ })).toHaveAttribute(
      'href',
      '/ledgers/l1?view=settings',
    );
  });
});
