import { useState } from 'react';
import { getRecordingUrl, deleteCallLog } from '../../api/calls';
import CallNotesModal from './CallNotesModal';

const DISPOSITION_COLORS = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'follow-up': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'not-interested': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  voicemail: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'wrong-number': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'callback-requested': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function CallLogRow({ call, onCallUpdated, onCallDeleted }) {
  const [showNotes, setShowNotes] = useState(false);

  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}`
    : '-';

  const time = call.started_at
    ? new Date(call.started_at).toLocaleString()
    : '-';

  return (
    <>
      <tr className="hover:bg-brand-50/30 dark:hover:bg-gray-700/50 transition-colors">
        <td className="px-4 py-3 text-sm">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              call.direction === 'inbound'
                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}
            onDoubleClick={call.direction === 'outbound' ? async () => {
              try {
                await deleteCallLog(call.id);
                if (onCallDeleted) onCallDeleted(call.id);
              } catch (e) { /* silent */ }
            } : undefined}
          >
            {call.direction}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          <span className="font-mono text-gray-800 dark:text-gray-200">{call.from_number || '-'}</span>
          {call.contact_name && call.direction === 'inbound' && (
            <span className="block text-xs text-gray-400 dark:text-gray-500">{call.contact_name}</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          <span className="font-mono text-gray-800 dark:text-gray-200">{call.to_number || '-'}</span>
          {call.contact_name && call.direction === 'outbound' && (
            <span className="block text-xs text-gray-400 dark:text-gray-500">{call.contact_name}</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm dark:text-gray-300">{call.agent_name || '-'}</td>
        <td className="px-4 py-3 text-sm">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs ${
              call.status === 'completed'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : call.status === 'no-answer'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {call.status}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-mono dark:text-gray-300">{duration}</td>
        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{time}</td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add/view notes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              {call.notes ? 'Edit' : 'Note'}
            </button>
            {call.disposition && (
              <span className={`inline-block px-2 py-0.5 rounded text-xs ${DISPOSITION_COLORS[call.disposition] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {call.disposition}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {call.recording_url ? (
            <a
              href={getRecordingUrl(call.id)}
              download
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download
            </a>
          ) : (
            <span className="text-gray-400 dark:text-gray-600">-</span>
          )}
        </td>
      </tr>

      {showNotes && (
        <CallNotesModal
          call={call}
          onClose={() => setShowNotes(false)}
          onSaved={onCallUpdated}
        />
      )}
    </>
  );
}
