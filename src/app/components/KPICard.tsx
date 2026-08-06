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
  /** Makes the tile a filter. Given this, it renders as a button. */
  onClick?: () => void;
  /** Whether this tile's filter is the one currently applied. */
  selected?: boolean;
}

const NAVY = '#1b365d';

const accent: Record<NonNullable<KPICardProps['variant']>, string> = {
  default: NAVY,
  danger: '#EF4444',
  success: '#4ea72e',
  warning: '#F59E0B',
};

export function KPICard({ title, value, icon, trend, note, variant = 'default', onClick, selected }: KPICardProps) {
  const color = accent[variant];

  /*
   * A button only when it does something. Rendering every tile as one would
   * announce a control to a screen reader on the dashboards where these are
   * read-only figures, and give a pointer cursor over something that does not
   * respond to the click.
   */
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={`group rounded-xl border bg-white p-5 text-left transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      } ${
        selected
          ? 'border-[#c3d0e0] shadow-[0_14px_40px_-24px_rgba(10,23,40,0.5)]'
          : 'border-[#E7EDF4] hover:border-[#d5dfea] hover:shadow-[0_14px_40px_-24px_rgba(10,23,40,0.5)]'
      }`}
      style={{
        borderTopWidth: '3px',
        borderTopColor: color,
        // The selected tile keeps its accent but sits on a tint of it, so which
        // one is applied reads without another badge or outline.
        backgroundColor: selected ? `${color}0d` : undefined,
      }}
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
    </Tag>
  );
}
