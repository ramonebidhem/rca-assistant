import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../api/endpoints.js';
import { apiErrorMessage, imageUrl } from '../api/client.js';
import { Layout } from '../components/Layout.js';
import { CategoryCard, CategoryGrid } from '../components/CategoryCard.js';
import { SearchBar } from '../components/SearchBar.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';
import { GridIcon, LayersIcon } from '../components/icons.js';
import { useSettings } from '../settings/SettingsContext.js';
import type { Category } from '../types.js';

const TILE_STYLE = [
  'rotate-[-4deg] translate-x-0 translate-y-6 z-10',
  'rotate-[3deg] translate-x-10 -translate-y-2 z-20',
  'rotate-[-2deg] translate-x-20 translate-y-10 z-10',
];

function PreviewStack({ categories }: { categories: Category[] }) {
  const items = categories.slice(0, 3);
  if (items.length === 0) return null;
  return (
    <div className="relative hidden h-80 w-72 shrink-0 lg:block xl:w-80">
      {items.map((c, i) => {
        const url = imageUrl(c.imagePath);
        return (
          <div
            key={c.id}
            className={`absolute left-0 top-10 h-44 w-60 overflow-hidden rounded-xl2 border border-white/10 shadow-pop transition-transform duration-300 hover:z-30 hover:-translate-y-1 ${TILE_STYLE[i % TILE_STYLE.length]}`}
          >
            {url ? (
              <img
                src={url}
                alt=""
                className="h-full w-full scale-105 object-cover opacity-50 blur-[3px]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-ink">
                <LayersIcon size={28} className="text-white/15" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
            <span className="id-tag-glass absolute left-3 top-3">{c.code}</span>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="font-display text-base font-bold text-white">{c.name}</div>
              <div className="text-xs text-slate-300">
                {c.failureTypeCount ?? 0} failure type{c.failureTypeCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Hero({ categories }: { categories: Category[] | undefined }) {
  const navigate = useNavigate();
  const { slogan } = useSettings();
  return (
    <section className="relative overflow-hidden bg-ink px-4 py-16 sm:py-20">
      {/* Liquid-glass backdrop: soft white/dark light pools that refract through the glass panel */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-white/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-white/10 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-black/40 blur-[110px]" />
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.04]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-xl2 border border-white/15 bg-white/[0.06] p-8 shadow-pop backdrop-blur-2xl sm:p-12">
          {/* Glass highlights */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-sm border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent-ring">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Root cause analysis
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
                {slogan || 'Find the cause. Fix it right.'}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-balance text-slate-300 lg:mx-0">
                Engineering reliable quality — browse validated root causes for wire-harness
                manufacturing defects.
              </p>
              <div className="mx-auto mt-7 max-w-xl lg:mx-0">
                <SearchBar large onSelect={(ft) => navigate(`/failure-types/${ft.id}`)} />
              </div>
              {categories && categories.length > 0 && (
                <dl className="mx-auto mt-9 flex max-w-xl justify-center gap-8 border-t border-white/10 pt-6 lg:mx-0 lg:justify-start">
                  <div>
                    <dt className="sr-only">Categories</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums text-white">
                      {categories.length}
                    </dd>
                    <dd className="text-xs uppercase tracking-wider text-slate-400">Categories</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Failure types</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums text-white">
                      {categories.reduce((sum, c) => sum + (c.failureTypeCount ?? 0), 0)}
                    </dd>
                    <dd className="text-xs uppercase tracking-wider text-slate-400">
                      Failure types
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {categories && <PreviewStack categories={categories} />}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: publicApi.listCategories,
  });

  return (
    <Layout hero={<Hero categories={data} />}>
      {/* Categories */}
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <GridIcon size={18} />
        </span>
        <div>
          <div className="eyebrow">Library</div>
          <h2 className="text-xl font-bold text-slate-900">Select a process category</h2>
        </div>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && data.length === 0 && <EmptyState message="No categories available yet." />}
      {data && data.length > 0 && (
        <CategoryGrid>
          {data.map((c) => (
            <CategoryCard
              key={c.id}
              to={`/categories/${c.id}`}
              code={c.code}
              name={c.name}
              imagePath={c.imagePath}
              subtitle={`${c.failureTypeCount ?? 0} failure type${
                c.failureTypeCount === 1 ? '' : 's'
              }`}
            />
          ))}
        </CategoryGrid>
      )}
    </Layout>
  );
}
