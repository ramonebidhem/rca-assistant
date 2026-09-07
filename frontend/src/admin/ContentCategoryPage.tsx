import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { useToast } from '../components/Toast.js';
import { PlusIcon, EditIcon, ChevronRight } from '../components/icons.js';
import { ActiveBadge, ConfirmButton, ImageUploadButton, ReorderButtons } from './components.js';
import { EntityFormModal, type EntityValues } from './EntityFormModal.js';
import type { FailureType } from '../types.js';

export function ContentCategoryPage() {
  const { id } = useParams();
  const categoryId = Number(id);
  const qc = useQueryClient();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FailureType | null>(null);

  const key = ['admin', 'category', categoryId];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => adminApi.getCategory(categoryId),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const run = (fn: () => Promise<unknown>) => mutate.mutate(fn);

  return (
    <div>
      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && (
        <>
          <Breadcrumb
            items={[{ label: 'Content', to: '/admin/content' }, { label: data.category.name }]}
          />
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">{data.category.code} · Failure types</div>
              <h1 className="text-2xl font-extrabold text-slate-900">{data.category.name}</h1>
            </div>
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <PlusIcon size={17} /> New failure type
            </button>
          </div>

          <div className="space-y-3">
            {data.failureTypes.map((ft) => (
              <div key={ft.id} className="card flex flex-wrap items-center gap-4 p-4">
                <ReorderButtons
                  onUp={() => run(() => adminApi.reorderFailureType(ft.id, 'up'))}
                  onDown={() => run(() => adminApi.reorderFailureType(ft.id, 'down'))}
                />
                <ImageUploadButton
                  imagePath={ft.imagePath}
                  onFile={(file) =>
                    run(async () => {
                      await adminApi.uploadFailureTypeImage(ft.id, file);
                      toast('Image updated');
                    })
                  }
                />
                <Link to={`/admin/content/failure-types/${ft.id}`} className="min-w-0 flex-1 group">
                  <div className="flex items-center gap-2">
                    <span className="id-tag">{ft.code}</span>
                    <ActiveBadge active={ft.isActive} />
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-lg font-bold text-slate-900 group-hover:text-accent">
                    {ft.name}
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-accent" />
                  </div>
                  <div className="text-sm text-slate-500">{ft.rootCauseCount ?? 0} root cause(s)</div>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => run(() => adminApi.setFailureTypeActive(ft.id, !ft.isActive))}
                  >
                    {ft.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn-icon" aria-label="Edit" onClick={() => setEditing(ft)}>
                    <EditIcon size={16} />
                  </button>
                  <ConfirmButton
                    onConfirm={() =>
                      run(async () => {
                        await adminApi.deleteFailureType(ft.id);
                        toast('Failure type deleted');
                      })
                    }
                  />
                </div>
              </div>
            ))}
            {data.failureTypes.length === 0 && (
              <EmptyState message="No failure types yet in this category." />
            )}
          </div>

          <EntityFormModal
            open={creating}
            onClose={() => setCreating(false)}
            title="New failure type"
            onSubmit={(v: EntityValues) =>
              adminApi
                .createFailureType({ categoryId, name: v.name, description: v.description || null })
                .then(() => {
                  invalidate();
                  toast('Failure type created');
                })
            }
          />
          <EntityFormModal
            open={!!editing}
            onClose={() => setEditing(null)}
            title="Edit failure type"
            initial={{ name: editing?.name, description: editing?.description ?? '' }}
            onSubmit={(v: EntityValues) =>
              adminApi
                .updateFailureType(editing!.id, { name: v.name, description: v.description || null })
                .then(() => {
                  invalidate();
                  toast('Failure type updated');
                })
            }
          />
        </>
      )}
    </div>
  );
}
