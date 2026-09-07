import { Link } from 'react-router-dom';
import { imageUrl } from '../api/client.js';
import { ArrowRight, ImageIcon } from './icons.js';

interface ItemCardProps {
  to: string;
  code: string;
  name: string;
  imagePath: string | null;
  subtitle?: string;
}

// Shared card style used for both categories and failure types:
// 16:9 picture on top with gradient overlay + floating code chip, bold name
// below, hover lift + image zoom.
export function ItemCard({ to, code, name, imagePath, subtitle }: ItemCardProps) {
  const url = imageUrl(imagePath);
  return (
    <Link to={to} className="card card-hover group block overflow-hidden">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {url ? (
          <img
            src={url}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-grid-fade bg-grid text-slate-300">
            <ImageIcon size={28} />
          </div>
        )}
        {/* Gradient scrim for chip legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
        <span className="absolute left-3 top-3 id-tag-glass">{code}</span>
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold text-slate-900">{name}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-accent group-hover:text-white">
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
