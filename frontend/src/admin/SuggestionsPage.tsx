import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/endpoints.js';
import { apiErrorMessage, imageUrl } from '../api/client.js';
import { Loading, ErrorState, EmptyState } from '../components/States.js';
import { Modal } from '../components/Modal.js';
import { Lightbox } from '../components/Lightbox.js';
import { useToast } from '../components/Toast.js';
import { CheckIcon, XIcon, ClockIcon } from '../components/icons.js';
import type { Suggestion, SuggestionStatus } from '../types.js';

const STATUSES: SuggestionStatus[] = ['pending', 'approved', 'rejected'];

export function SuggestionsPage() {
  const [status, setStatus] = useState<SuggestionStatus>('pending');
  const [rejecting, setRejecting] = useState<Suggestion | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const key = ['admin', 'suggestions', status];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => adminApi.listSuggestions(status),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'suggestions'] });

  const approve = useMutation({
    mutationFn: (s: Suggestion) => adminApi.approveSuggestion(s.id),
    onSuccess: (_res, s) => {
      invalidate();
      toast('Suggestion approved — pre-filling a root cause form');
      const qs = new URLSearchParams({ new: '1', description: s.text });
      navigate(`/admin/content/failure-types/${s.failureTypeId}?${qs.toString()}`);
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const reject = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      adminApi.rejectSuggestion(id, comment),
    onSuccess: () => {
      invalidate();
      toast('Suggestion rejected');
      setRejecting(null);
      setRejectComment('');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const statusChip = (s: SuggestionStatus) =>
    s === 'approved'
      ? 'bg-ok-soft text-ok'
      : s === 'rejected'
        ? 'bg-ng-soft text-ng'
        : 'bg-accent-soft text-accent';

  return (
    <div>
      <div className="eyebrow">Review queue</div>
      <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Suggestions</h1>

      <div className="mb-5 inline-flex rounded-xl2 border border-slate-200 bg-white p-1 shadow-sm">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${
              status === s ? 'bg-accent text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && data.length === 0 && (
        <EmptyState message={`No ${status} suggestions.`} icon={<ClockIcon size={22} />} />
      )}

      <div className="space-y-3">
        {data?.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex flex-wrap items-start gap-4">
              {s.photoPath && (
                <button
                  onClick={() => setLightbox(imageUrl(s.photoPath) ?? null)}
                  className="shrink-0 overflow-hidden rounded-lg border border-slate-200"
                >
                  <img
                    src={imageUrl(s.photoPath)}
                    alt="Suggestion attachment"
                    className="h-20 w-28 object-cover transition hover:scale-105"
                  />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className={`chip ${statusChip(s.status)} capitalize`}>{s.status}</span>
                  <span className="font-medium text-slate-600">{s.failureTypeName}</span>
                  <span>· {new Date(s.submittedAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-slate-800">{s.text}</p>
                {s.adminComment && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    <span className="font-semibold">Admin comment:</span> {s.adminComment}
                  </p>
                )}
              </div>
              {s.status === 'pending' && (
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" onClick={() => approve.mutate(s)}>
                    <CheckIcon size={15} /> Approve
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => setRejecting(s)}>
                    <XIcon size={15} /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Reject suggestion"
        subtitle="A comment is required and will be recorded with the rejection."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (rejecting && rejectComment.trim())
              reject.mutate({ id: rejecting.id, comment: rejectComment.trim() });
          }}
          className="space-y-4"
        >
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
            required
            autoFocus
            className="field-input"
            placeholder="Reason for rejection…"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejecting(null)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-danger">
              Reject suggestion
            </button>
          </div>
        </form>
      </Modal>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
