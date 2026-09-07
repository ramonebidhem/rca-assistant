import { Link } from 'react-router-dom';
import { Fragment } from 'react';
import { ChevronRight, HomeIcon } from './icons.js';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center text-sm">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight size={15} className="mx-1 text-slate-300" />}
          {item.to ? (
            <Link
              to={item.to}
              className="inline-flex items-center gap-1 font-medium text-slate-500 transition hover:text-accent"
            >
              {i === 0 && <HomeIcon size={14} />}
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
