import React, { useEffect } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { Button } from './Button';
import { NAVY, overlayCls, panelCls } from './clientModalUI';

interface ConfirmDialogProps {
  title: string;
  /** Blank lines are preserved, so a caller can separate what is happening from
   *  what it costs. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The dialog that asks before something irreversible.
 *
 * Shares its shell with every other dialog in the app — same overlay, same
 * panel, same footer — so a question about deleting a bill does not arrive
 * looking like a different product from the screen that raised it.
 *
 * Two things it does that the plain card did not. The first line of the message
 * is set apart as the subject: the thing being acted on, which is what the
 * reader checks before agreeing. And Cancel comes first at full width on a
 * phone, where the confirm button would otherwise sit under the thumb.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const danger = variant === 'danger';
  const Icon = danger ? AlertTriangle : HelpCircle;

  // Escape cancels. A confirmation that traps you is worse than no confirmation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  /*
   * The first paragraph is the subject — "Bill KAPSCA01 for TEST — ₹1,00,000."
   * It is what the reader checks before agreeing, so it is set apart from the
   * explanation rather than being the first grey sentence of four.
   */
  const [subject, ...rest] = message.split('\n\n');
  const detail = rest.join('\n\n').trim();

  return (
    <div
      className={`${overlayCls} z-[100]`}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
      role="alertdialog"
      aria-modal="true"
    >
      <div className={`${panelCls} max-w-md`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: danger ? 'rgba(220,38,38,0.08)' : 'rgba(27,54,93,0.08)',
                color: danger ? '#991B1B' : NAVY,
              }}
            >
              <Icon size={19} />
            </span>
            <h2 className="min-w-0 text-[1.05rem] font-semibold" style={{ color: NAVY }}>{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="text-[0.9rem] font-medium leading-snug" style={{ color: NAVY }}>
            {subject}
          </p>
          {detail && (
            <p className="mt-2.5 whitespace-pre-line text-[0.82rem] leading-relaxed text-muted-foreground">
              {detail}
            </p>
          )}
        </div>

        {/* Cancel first, and full width on a phone: the destructive button
            should not be the one sitting under the thumb. */}
        <div className="flex flex-col-reverse gap-3 border-t border-[#E7EDF4] px-6 py-4 sm:flex-row">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
