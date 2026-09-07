import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Layout } from '../components/Layout.js';
import { ItemCard, CardGrid } from '../components/ItemCard.js';
import { SearchBar } from '../components/SearchBar.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';
import { GridIcon } from '../components/icons.js';
import { useSettings } from '../settings/SettingsContext.js';

export function HomePage() {
  const navigate = useNavigate();
  const { slogan } = useSettings();
  const { data, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: publicApi.listCategories,
  });

  return (
    <Layout>
      {/* Hero */}
      <section className="relative mb-10 overflow-hidden rounded-xl2 border border-slate-200 bg-ink px-6 py-12 text-center shadow-card sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade bg-grid opacity-[0.12]" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #1450E0 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            Root cause analysis
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {slogan || 'Find the cause. Fix it right.'}
          </h1>
          <p className="mt-3 text-slate-400">
            Browse validated root causes for wire-harness manufacturing defects.
          </p>
          <div className="mx-auto mt-7 max-w-xl">
            <SearchBar large onSelect={(ft) => navigate(`/failure-types/${ft.id}`)} />
          </div>
        </div>
      </section>

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
        <CardGrid>
          {data.map((c) => (
            <ItemCard
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
        </CardGrid>
      )}
    </Layout>
  );
}
