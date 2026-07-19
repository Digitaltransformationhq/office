import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  /** Muted caption under the value — context, not a direction (unlike `trend`). */
  note?: string;
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

const NAVY = '#1b365d';

const accent: Record<NonNullable<KPICardProps['variant']>, string> = {
  default: NAVY,
  danger: '#EF4444',
  success: '#4ea72e',
  warning: '#F59E0B',
};

export function KPICard({ title, value, icon, trend, note, variant = 'default' }: KPICardProps) {
  const color = accent[variant];

  return (
    <div
      className="group rounded-xl border border-[#E7EDF4] bg-white p-5 transition-all duration-200 hover:border-[#d5dfea] hover:shadow-[0_14px_40px_-24px_rgba(10,23,40,0.5)]"
      style={{ borderTopWidth: '3px', borderTopColor: color }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 pt-0.5 text-[0.72rem] font-medium uppercase leading-snug tracking-[0.1em] text-muted-foreground">
          {title}
        </p>
        {icon && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}14`, color }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-[1.9rem] font-semibold leading-none tracking-tight" style={{ color: NAVY }}>
        {value}
      </p>
      {trend && (
        <p className={`mt-2 text-xs font-medium ${trend.isPositive ? 'text-[#3d8a22]' : 'text-destructive'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}
        </p>
      )}
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
