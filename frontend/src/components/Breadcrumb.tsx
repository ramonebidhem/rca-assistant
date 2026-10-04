import { Link } from 'react-router-dom';
import { Fragment } from 'react';
import { ChevronRight, HomeIcon } from './icons.js';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items, dark = false }: { items: Crumb[]; dark?: boolean }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-5 flex flex-wrap items-center text-sm ${dark ? 'text-slate-400' : ''}`}
    >
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ChevronRight size={15} className={dark ? 'mx-1 text-white/20' : 'mx-1 text-slate-300'} />
          )}
          {item.to ? (
            <Link
              to={item.to}
              className={`inline-flex items-center gap-1 font-medium transition ${
                dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-accent'
              }`}
            >
              {i === 0 && <HomeIcon size={14} />}
              {item.label}
            </Link>
          ) : (
            <span className={`font-semibold ${dark ? 'text-white' : 'text-slate-800'}`}>
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
