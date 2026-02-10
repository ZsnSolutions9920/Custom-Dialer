import { getRecordingUrl } from '../../api/calls';

export default function CallLogRow({ call }) {
  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}`
    : '-';

  const time = call.started_at
    ? new Date(call.started_at).toLocaleString()
    : '-';

  return (
    <tr className="hover:bg-brand-50/30 transition-colors">
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            call.direction === 'inbound'
              ? 'bg-brand-100 text-brand-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {call.direction}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-mono">{call.from_number || '-'}</td>
      <td className="px-4 py-3 text-sm font-mono">{call.to_number || '-'}</td>
      <td className="px-4 py-3 text-sm">{call.agent_name || '-'}</td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs ${
            call.status === 'completed'
              ? 'bg-green-100 text-green-700'
              : call.status === 'no-answer'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {call.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-mono">{duration}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{time}</td>
      <td className="px-4 py-3 text-sm">
        {call.recording_url ? (
          <a
            href={getRecordingUrl(call.id)}
            download
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}
