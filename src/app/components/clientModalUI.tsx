import React from 'react';

export const NAVY = '#1b365d';

export const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

export const FEE_FIELDS: { key: string; label: string }[] = [
  { key: 'itrFees', label: 'ITR' },
  { key: 'gstFees', label: 'GST' },
  { key: 'gstAnnualReturnFees', label: 'GST Annual Return' },
  { key: 'accountingFees', label: 'Accounting' },
  { key: 'auditFees', label: 'Audit' },
  { key: 'companyActFees', label: 'Company Act' },
  { key: 'tdsFees', label: 'TDS' },
  { key: 'pfEsicPtLabourFees', label: 'PF / ESIC / PT / Labour' },
  { key: 'consultancyFees', label: 'Consultancy' },
];

export const rupees = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

export const overlayCls = 'fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm';
export const panelCls = 'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]';

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
        {label} {required && <span className="text-[#c0392b]">*</span>}
      </label>
      {children}
    </div>
  );
}

export function SelectField({ value, onChange, children }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} className={`${inputCls} appearance-none pr-9`}>
        {children}
      </select>
      <ChevronDownIcon />
    </div>
  );
}

export function FeeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <input
          type="number"
          min="0"
          step="100"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`${inputCls} pl-7`}
        />
      </div>
    </div>
  );
}

/**
 * The services a client takes, one row each: tick, name, annual fee.
 *
 * A grid of nine ₹0 boxes said nothing about what the client actually buys —
 * zero looked the same as "not a service we do for them". The tick says which
 * services apply; the amount is only asked for those. Unticking clears the fee,
 * so the total can never include a service that is switched off.
 */
export function FeeList({ values, onChange }: {
  values: Record<string, number>;
  onChange: (key: string, amount: number) => void;
}) {
  const [ticked, setTicked] = React.useState<Set<string>>(
    () => new Set(FEE_FIELDS.filter(f => (values[f.key] || 0) > 0).map(f => f.key)),
  );
  const inputs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const toggle = (key: string, on: boolean) => {
    setTicked(prev => {
      const next = new Set(prev);
      on ? next.add(key) : next.delete(key);
      return next;
    });
    if (on) setTimeout(() => inputs.current[key]?.focus(), 0);
    else onChange(key, 0);
  };

  return (
    <ul className="divide-y divide-[#F1F4F8] overflow-hidden rounded-xl border border-[#E7EDF4]">
      {FEE_FIELDS.map(f => {
        const on = ticked.has(f.key);
        return (
          <li key={f.key} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${on ? 'bg-white' : 'bg-[#FAFBFD]'}`}>
            <input
              id={`fee-${f.key}`}
              type="checkbox"
              checked={on}
              onChange={e => toggle(f.key, e.target.checked)}
              className="h-4 w-4 shrink-0 cursor-pointer accent-[#1b365d]"
            />
            <label
              htmlFor={`fee-${f.key}`}
              className={`min-w-0 flex-1 cursor-pointer text-sm font-medium ${on ? '' : 'text-muted-foreground'}`}
              style={on ? { color: NAVY } : undefined}
            >
              {f.label}
            </label>
            <div className="relative w-36 shrink-0 sm:w-44">
              <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm ${on ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>₹</span>
              <input
                ref={el => { inputs.current[f.key] = el; }}
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={on ? (values[f.key] || '') : ''}
                placeholder={on ? '0' : '—'}
                disabled={!on}
                onChange={e => onChange(f.key, parseFloat(e.target.value) || 0)}
                aria-label={`${f.label} annual fee`}
                className={`${inputCls} py-2 pl-7 text-right disabled:cursor-not-allowed disabled:bg-transparent disabled:text-muted-foreground/40`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ModalTabs<T extends string>({ tabs, active, onChange }: {
  tabs: { key: T; label: string }[]; active: T; onChange: (k: T) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-[#E7EDF4] px-6">
      {tabs.map(t => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`relative -mb-px py-3 text-sm font-medium transition-colors ${on ? '' : 'text-muted-foreground hover:text-foreground'}`}
            style={on ? { color: NAVY } : undefined}
          >
            {t.label}
            {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: NAVY }} />}
          </button>
        );
      })}
    </div>
  );
}

// ── Identity: PAN, or a reason there is none ─────────────────────────────────
//
// PAN is the client's identity, and the server refuses a client with neither a
// PAN nor a reason. These match supabase/sql/add-client-identity-rules.sql.

export const PAN_MISSING_REASONS = ['PAN awaited from client', 'Client has no PAN', 'Foreign / non-resident entity'];
const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Why the PAN part of the form cannot be saved yet, or null. */
export function panProblem(form: { pan?: string; noPan?: boolean; panMissingReason?: string }): string | null {
  if (form.noPan) return form.panMissingReason ? null : 'Choose why this client has no PAN';
  const pan = (form.pan || '').replace(/\s+/g, '').toUpperCase();
  if (!pan) return 'Enter the PAN, or tick "Client has no PAN"';
  if (!PAN_FORMAT.test(pan)) return `"${pan}" is not a valid PAN. It should look like ABCDE1234F.`;
  return null;
}

/** The PAN fields as the server wants them. */
export function panPayload(form: { pan?: string; noPan?: boolean; panMissingReason?: string }) {
  return form.noPan
    ? { pan: '', panMissingReason: form.panMissingReason }
    : { pan: (form.pan || '').replace(/\s+/g, '').toUpperCase(), panMissingReason: null };
}

export function PanField({ pan, noPan, reason, onChange }: {
  pan: string; noPan: boolean; reason: string;
  onChange: (patch: { pan?: string; noPan?: boolean; panMissingReason?: string }) => void;
}) {
  const typed = (pan || '').replace(/\s+/g, '').toUpperCase();
  const badFormat = !noPan && typed.length === 10 && !PAN_FORMAT.test(typed);
  return (
    <div className="sm:col-span-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
            PAN {!noPan && <span className="text-[#c0392b]">*</span>}
          </label>
          <input
            className={`${inputCls} identifier ${badFormat ? 'border-[#c0392b]' : ''} disabled:bg-[#F4F6F9] disabled:text-muted-foreground`}
            value={noPan ? '' : pan}
            onChange={e => onChange({ pan: e.target.value.toUpperCase() })}
            placeholder={noPan ? 'No PAN' : 'ABCDE1234F'}
            maxLength={10}
            disabled={noPan}
          />
          {badFormat && <p className="mt-1 text-xs text-[#c0392b]">Not a valid PAN. It should look like ABCDE1234F.</p>}
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={noPan}
              onChange={e => onChange({ noPan: e.target.checked, panMissingReason: e.target.checked ? (reason || PAN_MISSING_REASONS[0]) : '' })}
            />
            Client has no PAN on record
          </label>
        </div>
        {noPan && (
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
              Why no PAN? <span className="text-[#c0392b]">*</span>
            </label>
            <SelectField value={reason} onChange={e => onChange({ panMissingReason: e.target.value })}>
              {PAN_MISSING_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </SelectField>
            <p className="mt-1 text-xs text-muted-foreground">Add the PAN as soon as it arrives. It is how duplicates are caught.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export interface PossibleDuplicate {
  id: string; name: string; pan?: string | null; gstin?: string | null; contact?: string | null;
  clientType?: string; reasons: string[];
}

/**
 * Shown in place of saving when the server thinks this client already exists.
 *
 * Two ways on and no silent third: open the client that is already there, or say
 * plainly that this is someone else. Families share phone numbers, so the second
 * is a real answer, not a formality.
 */
export function DuplicateWarning({ duplicates, busy, onOpen, onSaveAnyway, onBack, saveLabel = 'Different client — save anyway' }: {
  duplicates: PossibleDuplicate[]; busy?: boolean;
  onOpen?: (d: PossibleDuplicate) => void; onSaveAnyway: () => void; onBack: () => void; saveLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
      <p className="text-sm font-semibold text-[#92400E]">This may be a client you already have</p>
      <p className="mt-0.5 text-xs text-[#92400E]/80">Check these before adding the same person twice.</p>
      <ul className="mt-3 space-y-2">
        {duplicates.map(d => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#FDE68A] bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: NAVY }}>{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {[d.pan || 'No PAN', d.contact, d.clientType === 'Non-filer' ? 'Non-filer' : null].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-0.5 text-[0.7rem] font-medium text-[#b45309]">{d.reasons.join(' · ')}</p>
            </div>
            {onOpen && (
              <button type="button" onClick={() => onOpen(d)} className="shrink-0 rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]" style={{ color: NAVY }}>
                Open this client
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onBack} disabled={busy} className="rounded-full border border-[#E7EDF4] bg-white px-3.5 py-1.5 text-xs font-medium" style={{ color: NAVY }}>
          Go back and edit
        </button>
        <button type="button" onClick={onSaveAnyway} disabled={busy} className="rounded-full bg-[#b45309] px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60">
          {busy ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
}

/** Inline chevron so this module has no external icon dependency. */
function ChevronDownIcon() {
  return (
    <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
