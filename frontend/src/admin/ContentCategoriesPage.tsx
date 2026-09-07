import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';
import { useToast } from '../components/Toast.js';
import { PlusIcon, EditIcon, ChevronRight } from '../components/icons.js';
import { ActiveBadge, ConfirmButton, ImageUploadButton, ReorderButtons } from './components.js';
import { EntityFormModal, type EntityValues } from './EntityFormModal.js';
import type { Category } from '../types.js';

export function ContentCategoriesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminApi.listCategories,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const run = (fn: () => Promise<unknown>) => mutate.mutate(fn);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Content manager</div>
          <h1 className="text-2xl font-extrabold text-slate-900">Categories</h1>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <PlusIcon size={17} /> New category
        </button>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && data.length === 0 && <EmptyState message="No categories yet — create your first one." />}

      <div className="space-y-3">
        {data?.map((cat) => (
          <div key={cat.id} className="card flex flex-wrap items-center gap-4 p-4">
            <ReorderButtons
              onUp={() => run(() => adminApi.reorderCategory(cat.id, 'up'))}
              onDown={() => run(() => adminApi.reorderCategory(cat.id, 'down'))}
            />
            <ImageUploadButton
              imagePath={cat.imagePath}
              onFile={(file) =>
                run(async () => {
                  await adminApi.uploadCategoryImage(cat.id, file);
                  toast('Image updated');
                })
              }
            />
            <Link to={`/admin/content/categories/${cat.id}`} className="min-w-0 flex-1 group">
              <div className="flex items-center gap-2">
                <span className="id-tag">{cat.code}</span>
                <ActiveBadge active={cat.isActive} />
              </div>
              <div className="mt-1 flex items-center gap-1 text-lg font-bold text-slate-900 group-hover:text-accent">
                {cat.name}
                <ChevronRight size={16} className="text-slate-300 group-hover:text-accent" />
              </div>
              <div className="text-sm text-slate-500">{cat.failureTypeCount ?? 0} failure type(s)</div>
            </Link>
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost btn-sm"
                onClick={() => run(() => adminApi.setCategoryActive(cat.id, !cat.isActive))}
              >
                {cat.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button className="btn-icon" aria-label="Edit" onClick={() => setEditing(cat)}>
                <EditIcon size={16} />
              </button>
              <ConfirmButton
                onConfirm={() =>
                  run(async () => {
                    await adminApi.deleteCategory(cat.id);
                    toast('Category deleted');
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <EntityFormModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New category"
        onSubmit={(v: EntityValues) =>
          adminApi
            .createCategory({ name: v.name, description: v.description || null })
            .then(() => {
              invalidate();
              toast('Category created');
            })
        }
      />
      <EntityFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit category"
        initial={{ name: editing?.name, description: editing?.description ?? '' }}
        onSubmit={(v: EntityValues) =>
          adminApi
            .updateCategory(editing!.id, { name: v.name, description: v.description || null })
            .then(() => {
              invalidate();
              toast('Category updated');
            })
        }
      />
    </div>
  );
}
