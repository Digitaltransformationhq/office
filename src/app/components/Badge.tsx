import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  // These variants are solid fills, so the outline is a darkened edge rather
  // than a same-hue border, which would be invisible against the fill.
  const variantClasses = {
    default: 'border border-black/10 bg-muted text-muted-foreground',
    success: 'border border-black/15 bg-success text-success-foreground',
    warning: 'border border-black/15 bg-warning text-warning-foreground',
    danger: 'border border-black/15 bg-destructive text-destructive-foreground',
    info: 'border border-black/15 bg-info text-info-foreground',
    primary: 'border border-black/15 bg-primary text-primary-foreground',
  };

  return (
    /* rounded-md, not rounded-full: every task status chip is a rectangle, and
       these carry leave, attendance, query and client statuses, so a pill here
       made the same kind of information look like a different kind. */
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
