'use client';

import { useEffect } from 'react';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * Kares Studio — custom confirm dialog (pengganti window.confirm).
 * Modal terpusat mengikuti gaya admin: backdrop gelap + dialog putih.
 * Tutup via tombol Batal, klik backdrop, atau Escape.
 */
export default function ConfirmDialog({
  dialog,
  onCancel,
  onConfirm,
}: {
  dialog: ConfirmDialogData | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, onCancel]);

  if (!dialog) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={dialog.title}
    >
      <div
        className="modal-dialog modal-confirm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{dialog.title}</h2>
        <p className="admin-muted">{dialog.message}</p>
        <div className="modal-foot">
          <button type="button" className="btn-outline" onClick={onCancel}>
            {dialog.cancelLabel ?? 'Batal'}
          </button>
          <button
            type="button"
            className={
              dialog.danger ? 'btn-primary btn-danger' : 'btn-primary'
            }
            onClick={onConfirm}
            autoFocus
          >
            {dialog.confirmLabel ?? 'Ya, Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
