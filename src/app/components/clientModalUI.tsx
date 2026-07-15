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

/** Inline chevron so this module has no external icon dependency. */
function ChevronDownIcon() {
  return (
    <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
