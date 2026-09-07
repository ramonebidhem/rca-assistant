import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { publicApi } from '../api/endpoints.js';
import { apiErrorMessage, imageUrl } from '../api/client.js';
import { Layout } from '../components/Layout.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';
import { Lightbox } from '../components/Lightbox.js';
import { SuggestModal } from '../components/SuggestModal.js';
import { CheckIcon, ExpandIcon, ImageIcon, PlusIcon } from '../components/icons.js';
import type { RootCause, Media } from '../types.js';

function MediaFrame({ media, onOpen }: { media?: Media; onOpen: (src: string) => void }) {
  const isOk = media?.kind === 'OK';
  const label = isOk ? 'OK' : 'NG';
  const url = imageUrl(media?.filePath);
  return (
    <figure className="flex-1">
      <div
        className={`flex items-center justify-between rounded-t-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white ${
          isOk ? 'bg-ok' : 'bg-ng'
        }`}
      >
        <span>{label}</span>
        <span className="opacity-80">{isOk ? 'Conform' : 'Non-conform'}</span>
      </div>
      <div
        className={`overflow-hidden rounded-b-lg border-2 border-t-0 ${
          isOk ? 'border-ok/40' : 'border-ng/40'
        }`}
      >
        <div className="group relative aspect-[16/10] bg-slate-100">
          {url ? (
            <button
              type="button"
              onClick={() => onOpen(url)}
              className="block h-full w-full"
              aria-label={`Enlarge ${label} image`}
            >
              <img
                src={url}
                alt={`${label} reference`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800">
                  <ExpandIcon size={17} />
                </span>
              </span>
            </button>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-grid-fade bg-grid text-slate-300">
              <ImageIcon size={24} />
            </div>
          )}
        </div>
      </div>
      {media?.caption && (
        <figcaption className="mt-1.5 text-center text-xs text-slate-500">
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}

function RootCauseCard({ rc, index }: { rc: RootCause; index: number }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const ok = rc.media?.find((m) => m.kind === 'OK');
  const ng = rc.media?.find((m) => m.kind === 'NG');
  const steps = rc.steps?.filter((s) => s.type === 'step') ?? [];
  const checks = rc.steps?.filter((s) => s.type === 'check') ?? [];

  return (
    <article className="card overflow-hidden">
      {/* Header band */}
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl2 bg-accent text-lg font-extrabold text-white shadow-sm">
          {index}
        </span>
        <div className="min-w-0">
          <span className="id-tag">{rc.code}</span>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{rc.title}</h2>
        </div>
      </div>

      <div className="p-5">
        {rc.description && <p className="text-slate-600">{rc.description}</p>}

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {steps.length > 0 && (
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-accent-soft text-accent">
                  1
                </span>
                Steps to follow
              </h3>
              <ol className="space-y-2.5">
                {steps.map((s, i) => (
                  <li key={s.id} className="flex gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                      {i + 1}
                    </span>
                    <span>{s.instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {checks.length > 0 && (
            <div className="rounded-lg border border-ok/15 bg-ok-soft/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ok">
                <CheckIcon size={14} />
                Checks to do
              </h3>
              <ul className="space-y-2.5">
                {checks.map((c) => (
                  <li key={c.id} className="flex gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-ok/40 text-ok">
                      <CheckIcon size={12} />
                    </span>
                    <span>{c.instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {(ok || ng) && (
          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <MediaFrame media={ok} onOpen={setLightbox} />
            <MediaFrame media={ng} onOpen={setLightbox} />
          </div>
        )}
      </div>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </article>
  );
}

export function RootCausesPage() {
  const { id } = useParams();
  const failureTypeId = Number(id);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['failureType', failureTypeId],
    queryFn: () => publicApi.getFailureType(failureTypeId),
  });

  return (
    <Layout showSearch>
      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && (
        <>
          <Breadcrumb
            items={[
              { label: 'Home', to: '/' },
              {
                label: data.failureType.categoryName ?? 'Category',
                to: `/categories/${data.failureType.categoryId}`,
              },
              { label: data.failureType.name },
            ]}
          />

          <div className="mb-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="id-tag">{data.failureType.code}</span>
              <h1 className="text-3xl font-extrabold text-slate-900">{data.failureType.name}</h1>
              {data.rootCauses.length > 0 && (
                <span className="chip bg-accent-soft text-accent">
                  {data.rootCauses.length} root cause
                  {data.rootCauses.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {data.failureType.description && (
              <p className="mt-2 max-w-3xl text-slate-500">{data.failureType.description}</p>
            )}
          </div>

          {data.rootCauses.length === 0 ? (
            <EmptyState message="No root causes documented yet for this failure type." />
          ) : (
            <div className="space-y-6">
              {data.rootCauses.map((rc, i) => (
                <RootCauseCard key={rc.id} rc={rc} index={i + 1} />
              ))}
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <button
              onClick={() => setSuggestOpen(true)}
              className="btn-ghost btn-sm text-slate-500"
            >
              <PlusIcon size={15} />
              Suggest a missing root cause
            </button>
          </div>

          <SuggestModal
            open={suggestOpen}
            onClose={() => setSuggestOpen(false)}
            failureTypeId={failureTypeId}
            failureTypeName={data.failureType.name}
          />
        </>
      )}
    </Layout>
  );
}
