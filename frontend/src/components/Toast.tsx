import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, XIcon } from './icons.js';

interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

const ToastContext = createContext<(message: string, tone?: 'success' | 'error') => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex animate-slide-up items-center gap-3 rounded-xl2 border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-pop"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                t.tone === 'success' ? 'bg-ok' : 'bg-ng'
              }`}
            >
              {t.tone === 'success' ? <CheckCircle size={16} /> : <XIcon size={16} />}
            </span>
            <span className="max-w-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
