import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { useToast } from '../components/Toast.js';
import { PlusIcon, EditIcon, ImageIcon, CheckIcon } from '../components/icons.js';
import { ActiveBadge, ConfirmButton, ReorderButtons } from './components.js';
import { RootCauseForm } from './RootCauseForm.js';

export function ContentFailureTypePage() {
  const { id } = useParams();
  const failureTypeId = Number(id);
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  const [editId, setEditId] = useState<number | undefined>(undefined);
  const prefill = {
    title: params.get('title') ?? undefined,
    description: params.get('description') ?? undefined,
  };

  const key = ['admin', 'failure-type', failureTypeId];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => adminApi.getFailureType(failureTypeId),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const run = (fn: () => Promise<unknown>) => mutate.mutate(fn);

  const openNew = () => {
    setEditId(undefined);
    setFormOpen(true);
  };
  const openEdit = (rootCauseId: number) => {
    setEditId(rootCauseId);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditId(undefined);
    params.delete('new');
    params.delete('title');
    params.delete('description');
    setParams(params, { replace: true });
  };

  return (
    <div>
      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && (
        <>
          <Breadcrumb
            items={[
              { label: 'Content', to: '/admin/content' },
              {
                label: data.failureType.categoryName ?? 'Category',
                to: `/admin/content/categories/${data.failureType.categoryId}`,
              },
              { label: data.failureType.name },
            ]}
          />
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">{data.failureType.code} · Root causes</div>
              <h1 className="text-2xl font-extrabold text-slate-900">{data.failureType.name}</h1>
            </div>
            <button className="btn-primary" onClick={openNew}>
              <PlusIcon size={17} /> New root cause
            </button>
          </div>

          <div className="space-y-3">
            {data.rootCauses.map((rc, i) => (
              <div key={rc.id} className="card flex flex-wrap items-center gap-4 p-4">
                <ReorderButtons
                  onUp={() => run(() => adminApi.reorderRootCause(rc.id, 'up'))}
                  onDown={() => run(() => adminApi.reorderRootCause(rc.id, 'down'))}
                />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 bg-accent text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="id-tag">{rc.code}</span>
                    <ActiveBadge active={rc.isActive} />
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{rc.title}</div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <CheckIcon size={13} /> {rc.steps?.length ?? 0} step(s)
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon size={13} /> {rc.media?.length ?? 0} photo(s)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => openEdit(rc.id)}>
                    <EditIcon size={15} /> Edit
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => run(() => adminApi.setRootCauseActive(rc.id, !rc.isActive))}
                  >
                    {rc.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <ConfirmButton
                    onConfirm={() =>
                      run(async () => {
                        await adminApi.deleteRootCause(rc.id);
                        toast('Root cause deleted');
                      })
                    }
                  />
                </div>
              </div>
            ))}
            {data.rootCauses.length === 0 && (
              <EmptyState message="No root causes yet for this failure type." />
            )}
          </div>

          <RootCauseForm
            open={formOpen}
            onClose={closeForm}
            onSaved={invalidate}
            failureTypeId={failureTypeId}
            rootCauseId={editId}
            prefill={editId ? undefined : prefill}
          />
        </>
      )}
    </div>
  );
}
