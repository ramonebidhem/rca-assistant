import { useState } from 'react';
import { publicApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Modal } from './Modal.js';
import { useToast } from './Toast.js';

interface SuggestModalProps {
  open: boolean;
  onClose: () => void;
  failureTypeId: number;
  failureTypeName: string;
}

export function SuggestModal({ open, onClose, failureTypeId, failureTypeName }: SuggestModalProps) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await publicApi.submitSuggestion(failureTypeId, text.trim(), photo);
      toast('Thank you — your suggestion was submitted for review.');
      setText('');
      setPhoto(null);
      onClose();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Suggest a missing root cause">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          For failure type: <span className="font-medium text-slate-700">{failureTypeName}</span>
        </p>
        <div>
          <label htmlFor="suggestion-text" className="field-label">
            Description
          </label>
          <textarea
            id="suggestion-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            required
            className="field-input"
            placeholder="Describe the root cause you think is missing…"
          />
        </div>
        <div>
          <label htmlFor="suggestion-photo" className="field-label">
            Photo (optional)
          </label>
          <input
            id="suggestion-photo"
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit suggestion'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
