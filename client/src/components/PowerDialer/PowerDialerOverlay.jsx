import { usePowerDialer } from '../../context/PowerDialerContext';

const STATUS_BUTTONS = [
  { status: 'called', label: 'Called', bg: 'bg-green-600 hover:bg-green-700', darkBg: 'dark:bg-green-700 dark:hover:bg-green-600' },
  { status: 'no_answer', label: 'No Answer', bg: 'bg-yellow-500 hover:bg-yellow-600', darkBg: 'dark:bg-yellow-600 dark:hover:bg-yellow-500' },
  { status: 'not_interested', label: 'Not Interested', bg: 'bg-red-600 hover:bg-red-700', darkBg: 'dark:bg-red-700 dark:hover:bg-red-600' },
  { status: 'follow_up', label: 'Follow Up', bg: 'bg-blue-600 hover:bg-blue-700', darkBg: 'dark:bg-blue-700 dark:hover:bg-blue-600' },
  { status: 'do_not_contact', label: 'DNC', bg: 'bg-gray-600 hover:bg-gray-700', darkBg: 'dark:bg-gray-500 dark:hover:bg-gray-400' },
];

export default function PowerDialerOverlay() {
  const {
    phase,
    isActive,
    listName,
    currentEntry,
    progress,
    wrapUpTimer,
    stopSession,
    submitStatus,
    skipEntry,
  } = usePowerDialer();

  if (!isActive) return null;

  const percentage = progress.total > 0
    ? Math.round(((progress.total - progress.remaining) / progress.total) * 100)
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-600 dark:bg-brand-700 text-white">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="text-sm font-semibold">Power Dialer</span>
        </div>
        <button
          onClick={stopSession}
          className="text-xs font-medium px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
        >
          Stop
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate max-w-[60%]" title={listName}>
            {listName}
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {progress.total - progress.remaining}/{progress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {/* Current entry info */}
        {currentEntry && (
          <div className="mt-2 mb-3">
            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
              {currentEntry.name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {currentEntry.phone_number}
            </p>
          </div>
        )}

        {/* Dialing phase */}
        {phase === 'dialing' && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
              Dialing...
            </span>
            <button
              onClick={skipEntry}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {/* Wrap-up phase */}
        {phase === 'wrap_up' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                Wrap-up: {wrapUpTimer}s
              </span>
              <button
                onClick={skipEntry}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Skip
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_BUTTONS.map(({ status, label, bg, darkBg }) => (
                <button
                  key={status}
                  onClick={() => submitStatus(status)}
                  className={`text-xs font-medium text-white px-2 py-1.5 rounded-lg transition-colors ${bg} ${darkBg}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paused phase */}
        {phase === 'paused' && (
          <div className="text-center py-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Session paused</span>
          </div>
        )}
      </div>
    </div>
  );
}
