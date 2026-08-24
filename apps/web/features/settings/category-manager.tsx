'use client';

import { Archive, Check, Pencil, Plus, Tag, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { queryKeys, useCategories, useLedgers } from '@/features/data/hooks';
import { invalidateFinancialData } from '@/features/data/financial-invalidation';
import { api } from '@/lib/api-client';
import type { Category, CategoryKind, Ledger } from '@/lib/types';

export const categoryKindLabels: Record<CategoryKind, string> = {
  EXPENSE: 'Harcama',
  INCOME: 'Gelir',
  BOTH: 'Harcama ve gelir',
};

function duplicateName(
  categories: Category[],
  name: string,
  exceptId?: string,
) {
  const normalized = name.trim().toLocaleLowerCase('tr-TR');
  return categories.some(
    (category) =>
      category.id !== exceptId &&
      category.name.toLocaleLowerCase('tr-TR') === normalized,
  );
}

export function CategoryManager({
  ledgerContext,
}: {
  ledgerContext?: Ledger;
} = {}) {
  const ledgers = useLedgers();
  const [selectedId, setSelectedId] = useState('');
  const ledgerId = ledgerContext?.id || selectedId || ledgers.data?.[0]?.id || '';
  const ledger =
    ledgerContext ?? ledgers.data?.find((item) => item.id === ledgerId);
  const categories = useCategories(ledgerId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('EXPENSE');
  const [editing, setEditing] = useState<Category | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const canManage = Boolean(
    ledger &&
    !ledger.archivedAt &&
    (ledger.role === 'OWNER' || ledger.role === 'ADMIN'),
  );

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories(ledgerId),
      }),
      invalidateFinancialData(queryClient, {
        ledgerId,
        balances: false,
        offsetAvailability: false,
        allPlanAnalytics: true,
      }),
    ]);
  };
  const create = useMutation({
    mutationFn: () =>
      api.categories.create(ledgerId, { name: name.trim(), kind }),
    onSuccess: async () => {
      setName('');
      setKind('EXPENSE');
      await invalidate();
      toast('Kategori oluşturuldu.');
    },
  });
  const update = useMutation({
    mutationFn: (category: Category) =>
      api.categories.update(category.id, {
        name: category.name.trim(),
        kind: category.kind,
      }),
    onSuccess: async () => {
      setEditing(null);
      await invalidate();
      toast('Kategori güncellendi.');
    },
  });
  const archive = useMutation({
    mutationFn: (categoryId: string) => api.categories.archive(categoryId),
    onSuccess: async () => {
      setArchiveTarget(null);
      await invalidate();
      toast('Kategori arşivlendi.');
    },
  });
  const mutationError = create.error ?? update.error ?? archive.error;
  const active = useMemo(
    () => categories.data?.filter((item) => !item.archivedAt) ?? [],
    [categories.data],
  );
  const archived = useMemo(
    () => categories.data?.filter((item) => item.archivedAt) ?? [],
    [categories.data],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const candidate = name.trim();
    if (!candidate) return setError('Kategori adı boş bırakılamaz.');
    if (duplicateName(categories.data ?? [], candidate))
      return setError('Bu isimde bir kategori zaten var.');
    setError('');
    create.mutate();
  }

  function saveEdit() {
    if (!editing) return;
    if (!editing.name.trim()) return setError('Kategori adı boş bırakılamaz.');
    if (duplicateName(categories.data ?? [], editing.name, editing.id))
      return setError('Bu isimde bir kategori zaten var.');
    setError('');
    update.mutate(editing);
  }

  return (
    <section
      className="paper-section category-manager"
      aria-labelledby="categories-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            <Tag /> Kategoriler
          </span>
          <h2 id="categories-heading">Defter düzeni</h2>
        </div>
        {!ledgerContext && ledgers.data?.length ? (
          <label className="field category-manager__picker">
            <span>Defter</span>
            <select
              className="input"
              value={ledgerId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setEditing(null);
                setError('');
              }}
            >
              {ledgers.data.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {ledgerContext ? (
        <p className="context-note">
          Bu kategoriler yalnızca {ledgerContext.name} içindeki kayıtlarda
          kullanılır.
        </p>
      ) : null}
      {ledgers.isLoading || categories.isLoading ? (
        <LoadingState label="Kategoriler açılıyor…" />
      ) : null}
      {ledgers.isError || categories.isError ? (
        <ErrorState
          message="Kategoriler yüklenemedi."
          onRetry={() => {
            void ledgers.refetch();
            void categories.refetch();
          }}
        />
      ) : null}
      {!ledgers.isLoading && !ledgers.data?.length ? (
        <p className="muted-copy">
          Kategori oluşturmak için önce bir Defter oluştur.
        </p>
      ) : null}
      {ledger && !canManage ? (
        <p className="context-note">
          Bu Defterde kategorileri yalnızca Defter sahibi veya yönetici
          düzenleyebilir.
        </p>
      ) : null}
      {canManage ? (
        <form className="category-create" onSubmit={submit}>
          <label className="field">
            <span>Yeni kategori</span>
            <input
              className="input"
              value={name}
              maxLength={80}
              placeholder="Örn. Market"
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
            />
          </label>
          <label className="field">
            <span>Tür</span>
            <select
              className="input"
              value={kind}
              onChange={(event) => setKind(event.target.value as CategoryKind)}
            >
              {Object.entries(categoryKindLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button button--primary"
            type="submit"
            disabled={create.isPending}
          >
            <Plus /> {create.isPending ? 'Ekleniyor…' : 'Kategori ekle'}
          </button>
        </form>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {mutationError ? (
        <p className="form-error" role="alert">
          {mutationError.message}
        </p>
      ) : null}
      <div className="category-list">
        {active.map((category) => (
          <article key={category.id}>
            {editing?.id === category.id ? (
              <>
                <input
                  aria-label={`${category.name} adı`}
                  className="input"
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
                />
                <select
                  aria-label={`${category.name} türü`}
                  className="input"
                  value={editing.kind}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      kind: event.target.value as CategoryKind,
                    })
                  }
                >
                  {Object.entries(categoryKindLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  className="icon-button"
                  aria-label="Değişiklikleri kaydet"
                  type="button"
                  onClick={saveEdit}
                >
                  <Check />
                </button>
                <button
                  className="icon-button"
                  aria-label="Düzenlemeyi iptal et"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  <X />
                </button>
              </>
            ) : (
              <>
                <span>
                  <strong>{category.name}</strong>
                  <small>{categoryKindLabels[category.kind]}</small>
                </span>
                {canManage ? (
                  <>
                    <button
                      className="icon-button"
                      aria-label={`${category.name} kategorisini düzenle`}
                      type="button"
                      onClick={() => {
                        setEditing(category);
                        setError('');
                      }}
                    >
                      <Pencil />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${category.name} kategorisini arşivle`}
                      type="button"
                      onClick={() => setArchiveTarget(category)}
                    >
                      <Archive />
                    </button>
                  </>
                ) : null}
              </>
            )}
          </article>
        ))}
        {!active.length && !categories.isLoading ? (
          <p className="muted-copy">Bu Defterde aktif kategori yok.</p>
        ) : null}
      </div>
      {archived.length ? (
        <details className="category-archive">
          <summary>Arşivlenen kategoriler ({archived.length})</summary>
          {archived.map((category) => (
            <p key={category.id}>
              <span>{category.name}</span>
              <small>{categoryKindLabels[category.kind]}</small>
            </p>
          ))}
        </details>
      ) : null}
      <ConfirmationDialog
        open={Boolean(archiveTarget)}
        title="Kategori arşivlensin mi?"
        description={`${archiveTarget?.name ?? 'Bu kategori'} yeni kayıtlarda seçilemeyecek; geçmiş hareketlerde görünmeye devam edecek.`}
        confirmLabel="Arşivle"
        danger
        pending={archive.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget.id)}
      />
    </section>
  );
}
