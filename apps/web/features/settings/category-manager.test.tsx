import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CategoryManager } from './category-manager';
import { useCategories, useLedgers } from '@/features/data/hooks';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

jest.mock('@/features/data/hooks', () => ({
  ...jest.requireActual('@/features/data/hooks'),
  useCategories: jest.fn(),
  useLedgers: jest.fn(),
}));
jest.mock('@/components/ui/toast', () => ({ useToast: jest.fn() }));

const ledger = {
  id: 'l1',
  name: 'Ev',
  description: null,
  type: 'SHARED' as const,
  currency: 'TRY',
  ownerId: 'u1',
  role: 'OWNER' as const,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  archivedAt: null,
};
const market = {
  id: 'c1',
  ledgerId: 'l1',
  name: 'Market',
  kind: 'EXPENSE' as const,
  createdById: 'u1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  archivedAt: null,
};

function renderManager() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CategoryManager />
    </QueryClientProvider>,
  );
}

describe('category settings', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.mocked(useToast).mockReturnValue(jest.fn());
    jest
      .mocked(useLedgers)
      .mockReturnValue({
        data: [ledger],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useLedgers>);
    jest
      .mocked(useCategories)
      .mockReturnValue({
        data: [market],
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useCategories>);
  });

  it('creates a category with user-facing kind labels', async () => {
    const create = jest
      .spyOn(api.categories, 'create')
      .mockResolvedValue({ ...market, id: 'c2', name: 'Maaş', kind: 'INCOME' });
    renderManager();
    fireEvent.change(screen.getByLabelText('Yeni kategori'), {
      target: { value: 'Maaş' },
    });
    fireEvent.change(screen.getByLabelText('Tür'), {
      target: { value: 'INCOME' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Kategori ekle/ }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith('l1', {
        name: 'Maaş',
        kind: 'INCOME',
      }),
    );
    expect(
      screen.getByRole('option', { name: 'Harcama ve gelir' }),
    ).toBeInTheDocument();
  });

  it('blocks case-insensitive duplicates before the request', () => {
    const create = jest.spyOn(api.categories, 'create');
    renderManager();
    fireEvent.change(screen.getByLabelText('Yeni kategori'), {
      target: { value: 'market' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Kategori ekle/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Bu isimde bir kategori zaten var.',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('archives only after calm confirmation', async () => {
    const archive = jest
      .spyOn(api.categories, 'archive')
      .mockResolvedValue({ ...market, archivedAt: '2026-08-24' });
    renderManager();
    fireEvent.click(
      screen.getByRole('button', { name: 'Market kategorisini arşivle' }),
    );
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'geçmiş hareketlerde görünmeye devam edecek',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arşivle' }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith('c1'));
  });
});
