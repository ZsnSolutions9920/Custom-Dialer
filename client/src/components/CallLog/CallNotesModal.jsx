import { useState } from 'react';
import { updateCallNotes } from '../../api/calls';
import { useToast } from '../../context/ToastContext';

const DISPOSITIONS = [
  { value: '', label: 'Select disposition...' },
  { value: 'completed', label: 'Completed' },
  { value: 'follow-up', label: 'Follow Up' },
  { value: 'not-interested', label: 'Not Interested' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'wrong-number', label: 'Wrong Number' },
  { value: 'callback-requested', label: 'Callback Requested' },
];

export default function CallNotesModal({ call, onClose, onSaved }) {
  const toast = useToast();
  const [notes, setNotes] = useState(call.notes || '');
  const [disposition, setDisposition] = useState(call.disposition || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCallNotes(call.id, { notes, disposition });
      onSaved({ ...call, notes, disposition });
      onClose();
    } catch (err) {
      console.error('Failed to save notes:', err);
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Call Notes</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Disposition</label>
            <select
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              {DISPOSITIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none dark:bg-gray-700 dark:text-gray-100"
              placeholder="Add notes about this call..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
