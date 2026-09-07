import type { ReactNode } from 'react';
import { InboxIcon } from './icons.js';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400" role="status">
      <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-slate-200 border-t-accent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-ng/20 bg-ng-soft p-6 text-center text-ng" role="alert">
      <div className="font-semibold">Something went wrong</div>
      <div className="mt-1 text-sm opacity-90">{message}</div>
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-dashed bg-white/60 p-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <InboxIcon size={22} />}
      </span>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}
