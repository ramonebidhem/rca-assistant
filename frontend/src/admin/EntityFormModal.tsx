import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.js';

export interface EntityValues {
  name: string;
  description: string;
}

// Shared create/edit form for the name + description fields common to
// categories and failure types.
export function EntityFormModal({
  open,
  onClose,
  onSubmit,
  title,
  initial,
  nameLabel = 'Name',
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: EntityValues) => Promise<void>;
  title: string;
  initial?: Partial<EntityValues>;
  nameLabel?: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label">{nameLabel}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="field-input"
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
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
