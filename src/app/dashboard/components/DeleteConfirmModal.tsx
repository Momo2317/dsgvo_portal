'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';

interface Props {
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBulk?: boolean;
  isLoading?: boolean;
}

export default function DeleteConfirmModal({
  fileName,
  onConfirm,
  onCancel,
  isBulk,
  isLoading,
}: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative ui-card rounded-xl shadow-modal w-full max-w-md fade-in">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
        >
          <X size={16} />
        </button>

        <div className="p-5">
          <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center mb-4">
            <AlertTriangle size={22} className="text-danger" />
          </div>

          <h3
            id="delete-modal-title"
            className="text-lg font-bold text-foreground mb-2"
          >
            {isBulk ? 'Dateien endgültig löschen?' : 'Datei endgültig löschen?'}
          </h3>

          <p className="text-sm text-muted-foreground mb-1">
            {isBulk ? (
              <>
                Sie sind dabei, <strong className="text-foreground">{fileName}</strong> unwiderruflich zu löschen.
              </>
            ) : (
              <>
                Sie sind dabei, die Datei{' '}
                <strong className="text-foreground break-all">{fileName}</strong>{' '}
                unwiderruflich zu löschen.
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-2 bg-muted/60 rounded-lg px-3 py-2 border border-border">
            Diese Aktion kann nicht rückgängig gemacht werden. Die Datei wird sofort aus dem Speicher entfernt und ist für niemanden mehr zugänglich.
          </p>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-muted active:scale-[0.97] transition-all text-foreground disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 text-sm font-semibold bg-danger text-danger-foreground rounded-lg hover:bg-danger/90 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Löscht...
                </>
              ) : (
                <>
                  <Trash2 size={15} />
                  Endgültig löschen
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}