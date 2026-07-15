import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

const NAVY = '#1b365d';

const accent: Record<NonNullable<KPICardProps['variant']>, string> = {
  default: NAVY,
  danger: '#EF4444',
  success: '#4ea72e',
  warning: '#F59E0B',
};

export function KPICard({ title, value, icon, trend, variant = 'default' }: KPICardProps) {
  const color = accent[variant];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[#E7EDF4] bg-white p-5 transition-all duration-200 hover:border-[#d5dfea] hover:shadow-[0_14px_40px_-24px_rgba(10,23,40,0.5)]">
      {/* thin brand rule that warms on hover */}
      <span
        className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-[1.9rem] font-semibold leading-none tracking-tight" style={{ color: NAVY }}>
            {value}
          </p>
          {trend && (
            <p className={`mt-2 text-xs font-medium ${trend.isPositive ? 'text-[#3d8a22]' : 'text-destructive'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}14`, color }}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
