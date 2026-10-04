import type { ReactNode } from 'react';
import { imageUrl } from '../api/client.js';
import { Breadcrumb, type Crumb } from './Breadcrumb.js';

interface PageHeroProps {
  crumbs: Crumb[];
  code: string;
  title: string;
  description?: string | null;
  imagePath?: string | null;
  meta?: ReactNode;
}

// Compact full-bleed banner used on Category and Root-Causes pages — keeps
// the bold, image-forward hero language from the home page going one level
// deep instead of dropping into plain text headers.
export function PageHero({ crumbs, code, title, description, imagePath, meta }: PageHeroProps) {
  const url = imageUrl(imagePath);
  return (
    <section className="relative overflow-hidden bg-ink">
      {url && (
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-xl"
        />
      )}
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/90 to-ink/80" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <Breadcrumb items={crumbs} dark />
        <div className="flex flex-wrap items-center gap-3">
          <span className="id-tag-glass">{code}</span>
          {meta}
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-slate-300" title={description}>
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
