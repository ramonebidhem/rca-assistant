import { useEffect, useState } from 'react';
import { adminApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Modal } from '../components/Modal.js';
import { useToast } from '../components/Toast.js';
import { ImageUploadButton } from './components.js';
import { ArrowUp, ArrowDown, XIcon, PlusIcon, CheckIcon } from '../components/icons.js';
import type { RootCause, StepType } from '../types.js';

interface StepRow {
  instruction: string;
  type: StepType;
}

interface RootCauseFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  failureTypeId: number;
  rootCauseId?: number;
  prefill?: { title?: string; description?: string };
}

export function RootCauseForm({
  open,
  onClose,
  onSaved,
  failureTypeId,
  rootCauseId,
  prefill,
}: RootCauseFormProps) {
  const toast = useToast();
  const [loaded, setLoaded] = useState<RootCause | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<number | undefined>(rootCauseId);

  useEffect(() => {
    if (!open) return;
    setSavedId(rootCauseId);
    if (rootCauseId) {
      adminApi.getRootCause(rootCauseId).then((rc) => {
        setLoaded(rc);
        setTitle(rc.title);
        setDescription(rc.description ?? '');
        setSteps((rc.steps ?? []).map((s) => ({ instruction: s.instruction, type: s.type })));
      });
    } else {
      setLoaded(null);
      setTitle(prefill?.title ?? '');
      setDescription(prefill?.description ?? '');
      setSteps([{ instruction: '', type: 'step' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rootCauseId]);

  const updateStep = (i: number, patch: Partial<StepRow>) =>
    setSteps((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addStep = (type: StepType) => setSteps((rows) => [...rows, { instruction: '', type }]);
  const removeStep = (i: number) => setSteps((rows) => rows.filter((_, idx) => idx !== i));
  const moveStep = (i: number, dir: -1 | 1) =>
    setSteps((rows) => {
      const j = i + dir;
      if (j < 0 || j >= rows.length) return rows;
      const copy = [...rows];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const cleanSteps = steps
      .filter((s) => s.instruction.trim())
      .map((s) => ({ instruction: s.instruction.trim(), type: s.type }));
    try {
      if (savedId) {
        await adminApi.updateRootCause(savedId, {
          title: title.trim(),
          description: description.trim() || null,
          steps: cleanSteps,
        });
        toast('Root cause saved');
        onSaved();
        onClose();
      } else {
        const created = await adminApi.createRootCause({
          failureTypeId,
          title: title.trim(),
          description: description.trim() || null,
          steps: cleanSteps,
        });
        setSavedId(created.id);
        setLoaded(created);
        toast('Root cause created — you can now add OK/NG photos');
        onSaved();
      }
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const uploadMedia = async (kind: 'OK' | 'NG', file: File) => {
    if (!savedId) return;
    try {
      await adminApi.uploadRootCauseMedia(savedId, kind, file);
      const rc = await adminApi.getRootCause(savedId);
      setLoaded(rc);
      onSaved();
      toast(`${kind} image updated`);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const okMedia = loaded?.media?.find((m) => m.kind === 'OK') ?? null;
  const ngMedia = loaded?.media?.find((m) => m.kind === 'NG') ?? null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={rootCauseId ? 'Edit root cause' : 'New root cause'}
      subtitle="Document the cause, the steps and checks, and OK/NG reference photos."
    >
      <form onSubmit={save} className="space-y-5">
        <div>
          <label className="field-label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="field-input"
            placeholder="e.g. Terminal not centered in the applicator"
          />
        </div>
        <div>
          <label className="field-label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="field-input"
          />
        </div>

        <div className="rounded-xl2 border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="field-label mb-0">Steps &amp; checks</label>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => addStep('step')}>
                <PlusIcon size={14} /> Step
              </button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => addStep('check')}>
                <PlusIcon size={14} /> Check
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white p-1.5 shadow-sm">
                <div className="flex flex-col overflow-hidden rounded border border-slate-200">
                  <button
                    type="button"
                    onClick={() => moveStep(i, -1)}
                    className="flex h-5 w-6 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Move up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(i, 1)}
                    className="flex h-5 w-6 items-center justify-center border-t border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Move down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
                <select
                  value={s.type}
                  onChange={(e) => updateStep(i, { type: e.target.value as StepType })}
                  className={`rounded-md border px-2 py-2 text-xs font-semibold ${
                    s.type === 'check'
                      ? 'border-ok/30 bg-ok-soft text-ok'
                      : 'border-accent/20 bg-accent-soft text-accent'
                  }`}
                >
                  <option value="step">Step</option>
                  <option value="check">Check</option>
                </select>
                <input
                  value={s.instruction}
                  onChange={(e) => updateStep(i, { instruction: e.target.value })}
                  placeholder="Instruction…"
                  className="field-input flex-1 border-transparent bg-transparent shadow-none focus:shadow-none"
                />
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-ng-soft hover:text-ng"
                  aria-label="Remove row"
                >
                  <XIcon size={15} />
                </button>
              </div>
            ))}
            {steps.length === 0 && <p className="text-sm text-slate-400">No steps yet.</p>}
          </div>
        </div>

        <div>
          <label className="field-label">OK / NG reference photos</label>
          {savedId ? (
            <div className="flex flex-wrap gap-4">
              <div className="rounded-xl2 border border-ok/20 bg-ok-soft/50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ok">
                  <CheckIcon size={13} /> OK — conform
                </div>
                <ImageUploadButton imagePath={okMedia?.filePath ?? null} onFile={(f) => uploadMedia('OK', f)} />
              </div>
              <div className="rounded-xl2 border border-ng/20 bg-ng-soft/50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ng">
                  <XIcon size={13} /> NG — non-conform
                </div>
                <ImageUploadButton imagePath={ngMedia?.filePath ?? null} onFile={(f) => uploadMedia('NG', f)} />
              </div>
            </div>
          ) : (
            <p className="field-hint">Save the root cause first, then add OK/NG photos.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="btn-ghost">
            Close
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
