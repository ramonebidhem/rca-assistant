import { useRef, useState, type ReactNode } from 'react';
import { imageUrl } from '../api/client.js';
import { ArrowUp, ArrowDown, TrashIcon, UploadIcon, ImageIcon } from '../components/icons.js';

// Row of admin actions shared by categories / failure types / root causes.
export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function ReorderButtons({
  onUp,
  onDown,
  disabled,
}: {
  onUp: () => void;
  onDown: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200">
      <button
        onClick={onUp}
        disabled={disabled}
        aria-label="Move up"
        className="flex h-6 w-8 items-center justify-center text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
      >
        <ArrowUp size={14} />
      </button>
      <button
        onClick={onDown}
        disabled={disabled}
        aria-label="Move down"
        className="flex h-6 w-8 items-center justify-center border-t border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
      >
        <ArrowDown size={14} />
      </button>
    </div>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`chip ${active ? 'bg-ok-soft text-ok' : 'bg-slate-100 text-slate-500'}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-ok' : 'bg-slate-400'}`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// A button that requires a second click to confirm a destructive action.
export function ConfirmButton({
  onConfirm,
  label = 'Delete',
}: {
  onConfirm: () => void;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={armed ? 'btn-danger btn-sm' : 'btn-icon text-slate-400 hover:text-ng'}
      aria-label={label}
      onClick={() => {
        if (armed) onConfirm();
        else {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
        }
      }}
    >
      {armed ? 'Confirm?' : <TrashIcon size={16} />}
    </button>
  );
}

// Thumbnail + hidden file input to upload/replace an image.
export function ImageUploadButton({
  imagePath,
  onFile,
  label = 'Upload',
}: {
  imagePath: string | null;
  onFile: (file: File) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const url = imageUrl(imagePath);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative h-14 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
        aria-label={imagePath ? 'Replace image' : label}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon size={18} />
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
          <UploadIcon size={16} />
        </span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
