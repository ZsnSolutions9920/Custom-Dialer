export default function CallLogRow({ call }) {
  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}`
    : '-';

  const time = call.started_at
    ? new Date(call.started_at).toLocaleString()
    : '-';

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            call.direction === 'inbound'
              ? 'bg-blue-100 text-blue-700'
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
    </tr>
  );
}
