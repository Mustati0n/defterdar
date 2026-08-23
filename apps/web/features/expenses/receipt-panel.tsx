'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  FileText,
  Paperclip,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { queryKeys, useExpenseAttachments } from '@/features/data/hooks';
import { api, ApiError } from '@/lib/api-client';

export const MAX_RECEIPTS = 5;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export function canAddReceipt(activeCount: number) {
  return activeCount < MAX_RECEIPTS;
}

export function uploadToPresigned(
  url: string,
  file: File,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) =>
      event.lengthComputable &&
      onProgress(Math.round((event.loaded / event.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error('Upload failed'));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

export function ReceiptPanel({
  expenseId,
  canManage,
  disabled,
}: {
  expenseId: string;
  canManage: boolean;
  disabled: boolean;
}) {
  const attachments = useExpenseAttachments(expenseId);
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_RECEIPT_BYTES)
        throw new Error('Receipt en fazla 10 MB olabilir.');
      if (!canAddReceipt(attachments.data?.length ?? 0))
        throw new Error('Bir harcamaya en fazla 5 receipt eklenebilir.');
      setProgress(0);
      const reservation = await api.expenses.reserveAttachment(expenseId, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      await uploadToPresigned(reservation.uploadUrl, file, setProgress);
      await api.attachments.complete(reservation.attachmentId);
    },
    onSuccess: async () => {
      setProgress(null);
      setFailedFile(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.attachments(expenseId),
      });
      toast('Receipt eklendi.');
    },
    onError: (error, file) => {
      setProgress(null);
      setFailedFile(file);
      toast(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Receipt yüklenemedi.',
        'error',
      );
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.attachments.remove(id),
    onSuccess: async () => {
      setRemoveId(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.attachments(expenseId),
      });
      toast('Receipt kaldırıldı.');
    },
    onError: (error) =>
      toast(
        error instanceof ApiError ? error.message : 'Receipt kaldırılamadı.',
        'error',
      ),
  });
  async function openAttachment(id: string) {
    try {
      const { url } = await api.attachments.url(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : 'Receipt açılamadı.',
        'error',
      );
    }
  }
  const activeCount = attachments.data?.length ?? 0;
  return (
    <section className="paper-section receipt-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Belgeler</span>
          <h2>Receipt’ler</h2>
        </div>
        <span className="status-chip">
          <Paperclip /> {activeCount}/{MAX_RECEIPTS}
        </span>
      </div>
      {attachments.isError ? (
        <div className="form-error">
          Receipt listesi yüklenemedi.{' '}
          <button type="button" onClick={() => void attachments.refetch()}>
            Yeniden dene
          </button>
        </div>
      ) : null}
      <div className="attachment-list">
        {attachments.data?.map((attachment) => (
          <article key={attachment.id}>
            <FileText />
            <div>
              <strong>{attachment.originalFileName}</strong>
              <small>
                {(attachment.sizeBytes / 1024).toFixed(0)} KB ·{' '}
                {attachment.status === 'READY' ? 'Hazır' : 'İşleniyor'}
              </small>
            </div>
            {attachment.status === 'READY' ? (
              <button
                className="icon-button"
                type="button"
                aria-label={`${attachment.originalFileName} görüntüle`}
                onClick={() => void openAttachment(attachment.id)}
              >
                <ExternalLink />
              </button>
            ) : null}
            {canManage ? (
              <button
                className="icon-button"
                type="button"
                aria-label={`${attachment.originalFileName} sil`}
                onClick={() => setRemoveId(attachment.id)}
              >
                <Trash2 />
              </button>
            ) : null}
          </article>
        ))}
      </div>
      {canManage && !disabled ? (
        <>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) mutation.mutate(file);
              event.currentTarget.value = '';
            }}
          />
          <button
            className="button button--quiet"
            type="button"
            disabled={mutation.isPending || !canAddReceipt(activeCount)}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />{' '}
            {!canAddReceipt(activeCount)
              ? 'Receipt sınırına ulaşıldı'
              : 'Receipt yükle'}
          </button>
        </>
      ) : null}
      {progress !== null ? (
        <div className="upload-progress" aria-live="polite">
          <span style={{ width: `${progress}%` }} />
          <small>%{progress} yükleniyor</small>
        </div>
      ) : null}
      {failedFile ? (
        <button
          className="button button--quiet"
          type="button"
          onClick={() => mutation.mutate(failedFile)}
        >
          <RefreshCw /> {failedFile.name} için tekrar dene
        </button>
      ) : null}
      <ConfirmationDialog
        open={Boolean(removeId)}
        title="Receipt kaldırılsın mı?"
        description="Belge bu harcamadan kaldırılacak."
        confirmLabel="Kaldır"
        danger
        pending={remove.isPending}
        onCancel={() => setRemoveId(null)}
        onConfirm={() => removeId && remove.mutate(removeId)}
      />
    </section>
  );
}
