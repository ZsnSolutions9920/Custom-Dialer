const statusConfig = {
  available: { color: 'bg-green-400', label: 'Available' },
  on_call: { color: 'bg-red-400', label: 'On Call' },
  away: { color: 'bg-yellow-400', label: 'Away' },
  offline: { color: 'bg-gray-400', label: 'Offline' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.offline;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-xs text-gray-600 capitalize">{config.label}</span>
    </span>
  );
}
