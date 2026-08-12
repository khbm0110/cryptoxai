'use client';
import React, { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; message: string; kind: 'success' | 'error' };
const ToastContext = createContext<{ push: (message: string, kind?: Toast['kind']) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', bottom: 20, insetInlineEnd: 20, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 100 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: t.kind === 'error' ? 'var(--loss)' : 'var(--deep)',
              color: '#fff',
              padding: '13px 18px',
              borderRadius: 10,
              fontSize: 14,
              boxShadow: '0 10px 30px -10px rgba(0,0,0,.35)',
              minWidth: 240,
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
