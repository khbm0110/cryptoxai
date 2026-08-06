'use client';
import React from 'react';

export function Button({
  variant = 'primary',
  loading,
  style,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost'; loading?: boolean }) {
  const base: React.CSSProperties = {
    padding: '11px 22px',
    borderRadius: 9,
    fontWeight: 600,
    fontSize: 14.5,
    border: '1px solid transparent',
    cursor: rest.disabled || loading ? 'not-allowed' : 'pointer',
    opacity: rest.disabled || loading ? 0.65 : 1,
    transition: 'transform .15s ease',
    fontFamily: 'inherit',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--ink)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--ink)', borderColor: 'var(--hair)' },
  };
  return (
    <button {...rest} disabled={rest.disabled || loading} style={{ ...base, ...variants[variant], ...style }}>
      {loading ? '…' : children}
    </button>
  );
}

export function Input({
  label,
  error,
  style,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>}
      <input
        {...rest}
        style={{
          padding: '11px 14px',
          borderRadius: 9,
          border: `1px solid ${error ? 'var(--loss)' : 'var(--hair)'}`,
          fontSize: 14.5,
          fontFamily: 'inherit',
          background: 'var(--paper)',
          color: 'var(--ink)',
          ...style,
        }}
      />
      {error && <span style={{ fontSize: 12.5, color: 'var(--loss)' }}>{error}</span>}
    </label>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--hair)', borderRadius: 16, padding: 28, ...style }}>
      {children}
    </div>
  );
}
