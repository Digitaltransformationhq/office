import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-1.5 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium';

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground shadow-[0_8px_20px_-10px_rgba(11,31,58,0.55)] hover:bg-primary/90 hover:shadow-[0_12px_26px_-10px_rgba(11,31,58,0.65)] active:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-muted active:bg-muted/80',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80',
    success: 'bg-success text-success-foreground hover:bg-success/90 active:bg-success/80',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/90 active:bg-warning/80',
    info: 'bg-info text-info-foreground hover:bg-info/90 active:bg-info/80',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs md:text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm md:text-base min-h-[40px]',
    lg: 'px-6 py-3 text-base md:text-lg min-h-[44px]',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
