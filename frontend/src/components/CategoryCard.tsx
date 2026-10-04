import { Link } from 'react-router-dom';
import { imageUrl } from '../api/client.js';
import { ArrowRight, LayersIcon } from './icons.js';

interface CategoryCardProps {
  to: string;
  code: string;
  name: string;
  imagePath: string | null;
  subtitle?: string;
  /** Tailwind aspect-ratio class(es) — taller for a handful of top-level
   *  categories, shorter for a dense grid of failure types. */
  aspect?: string;
}

// Full-bleed poster card used for both the home page's category picker and
// the failure-type grid one level deeper. Background images are blurred so
// that seed-data placeholder images (which render their own name as text)
// never show through legibly under the overlaid title.
export function CategoryCard({
  to,
  code,
  name,
  imagePath,
  subtitle,
  aspect = 'aspect-[4/5] sm:aspect-[3/4]',
}: CategoryCardProps) {
  const url = imageUrl(imagePath);
  return (
    <Link
      to={to}
      className={`group relative block ${aspect} overflow-hidden rounded-xl2 bg-ink shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-pop`}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-50 blur-[3px] transition-transform duration-700 ease-out group-hover:scale-[1.15]"
        />
      ) : (
        <>
          <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.06]" />
          <div className="pointer-events-none absolute inset-0 bg-grid-fade bg-grid opacity-[0.1]" />
          <LayersIcon
            size={48}
            className="absolute inset-0 m-auto text-white/10 transition group-hover:text-white/15"
          />
        </>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10 transition group-hover:ring-accent/50" />

      <span className="id-tag-glass absolute left-4 top-4">{code}</span>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="font-display truncate text-2xl font-bold text-white sm:text-[1.7rem]">
            {name}
          </h3>
          {subtitle && <p className="mt-1 text-sm text-slate-300">{subtitle}</p>}
        </div>
        <span className="flex h-10 w-10 shrink-0 translate-x-2 items-center justify-center rounded-full bg-accent text-white opacity-0 shadow-lg transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          <ArrowRight size={18} />
        </span>
      </div>
    </Link>
  );
}

export function CategoryGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">{children}</div>;
}
