import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-foreground">{label}</label>}
      <input
        className={`px-3 py-2 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-foreground">{label}</label>}
      <select
        className={`px-3 py-2 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
