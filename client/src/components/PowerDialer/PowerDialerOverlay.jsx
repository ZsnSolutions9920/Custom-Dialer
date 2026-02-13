import { useState } from 'react';
import { usePowerDialer } from '../../context/PowerDialerContext';

function getMetaField(metadata, keys) {
  if (!metadata || typeof metadata !== 'object') return null;
  for (const [k, v] of Object.entries(metadata)) {
    const lk = k.toLowerCase();
    if (keys.some((key) => lk.includes(key))) return v;
  }
  return null;
}

const STATUS_BUTTONS = [
  { status: 'called', label: 'Called', bg: 'bg-green-600 hover:bg-green-700', darkBg: 'dark:bg-green-700 dark:hover:bg-green-600' },
  { status: 'no_answer', label: 'No Answer', bg: 'bg-yellow-500 hover:bg-yellow-600', darkBg: 'dark:bg-yellow-600 dark:hover:bg-yellow-500' },
  { status: 'not_interested', label: 'Not Interested', bg: 'bg-red-600 hover:bg-red-700', darkBg: 'dark:bg-red-700 dark:hover:bg-red-600' },
  { status: 'follow_up', label: 'Follow Up', bg: 'bg-blue-600 hover:bg-blue-700', darkBg: 'dark:bg-blue-700 dark:hover:bg-blue-600' },
  { status: 'do_not_contact', label: 'DNC', bg: 'bg-gray-600 hover:bg-gray-700', darkBg: 'dark:bg-gray-500 dark:hover:bg-gray-400' },
];

function FollowUpPicker({ onConfirm, onCancel }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [hours, setHours] = useState(String(now.getHours()).padStart(2, '0'));
  const [minutes, setMinutes] = useState(String(now.getMinutes()).padStart(2, '0'));

  const selected = date ? new Date(`${date}T${hours}:${minutes}:00`) : null;
  const isValid = selected && !isNaN(selected.getTime()) && selected > new Date();

  return (
    <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Schedule Follow-Up</p>

      <div className="mb-2">
        <input
          type="date"
          value={date}
          min={todayStr}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <select
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"
        >
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-gray-400 dark:text-gray-500 text-xs font-bold">:</span>
        <select
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-100"
        >
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {isValid && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
          {selected.toLocaleString()}
        </p>
      )}
      {selected && !isValid && (
        <p className="text-xs text-red-500 dark:text-red-400 mb-2">
          Pick a future date & time
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 text-xs font-medium px-2 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => isValid && onConfirm(selected.toISOString())}
          disabled={!isValid}
          className="flex-1 text-xs font-medium px-2 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default function PowerDialerOverlay() {
  const {
    phase,
    isActive,
    listName,
    currentEntry,
    progress,
    wrapUpTimer,
    timerPaused,
    stopSession,
    submitStatus,
    skipEntry,
    pauseSession,
    resumeSession,
    pauseTimer,
    resumeTimer,
  } = usePowerDialer();

  const [showFollowUp, setShowFollowUp] = useState(false);

  if (!isActive) return null;

  const percentage = progress.total > 0
    ? Math.round(((progress.total - progress.remaining) / progress.total) * 100)
    : 0;

  const handleStatusClick = (status) => {
    if (status === 'follow_up') {
      pauseTimer();
      setShowFollowUp(true);
      return;
    }
    submitStatus(status);
  };

  const handleFollowUpConfirm = (followUpAt) => {
    setShowFollowUp(false);
    submitStatus('follow_up', followUpAt);
  };

  const handleFollowUpCancel = () => {
    setShowFollowUp(false);
    resumeTimer();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-brand-600 dark:bg-brand-700 text-white">
        <div className="flex items-center gap-2">
          {phase === 'paused' ? (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400" />
          ) : (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
          )}
          <span className="text-sm font-semibold">Power Dialer</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Pause / Resume button */}
          {phase !== 'paused' ? (
            <button
              onClick={pauseSession}
              className="text-xs font-medium px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
              title="Pause session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              onClick={resumeSession}
              className="text-xs font-medium px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
              title="Resume session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button
            onClick={stopSession}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
          >
            Stop
          </button>
        </div>
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
            {(() => {
              const trademark = getMetaField(currentEntry.metadata, ['word mark', 'mark', 'trademark']);
              const serial = getMetaField(currentEntry.metadata, ['serial number']);
              const statusDate = getMetaField(currentEntry.metadata, ['status date']);
              if (!trademark && !serial && !statusDate) return null;
              return (
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {trademark && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Trademark</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 truncate" title={trademark}>{trademark}</p>
                    </div>
                  )}
                  {serial && (
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Serial #</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{serial}</p>
                    </div>
                  )}
                  {statusDate && (
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Status Date</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{statusDate}</p>
                    </div>
                  )}
                </div>
              );
            })()}
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
        {phase === 'wrap_up' && !showFollowUp && (
          <div>
            <div className="mb-3">
              <span className={`text-xs font-semibold ${timerPaused ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {timerPaused ? 'Timer paused' : `Wrap-up: ${wrapUpTimer}s`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_BUTTONS.map(({ status, label, bg, darkBg }) => (
                <button
                  key={status}
                  onClick={() => handleStatusClick(status)}
                  className={`text-xs font-medium text-white px-2 py-1.5 rounded-lg transition-colors ${bg} ${darkBg}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up picker (replaces status buttons when active) */}
        {phase === 'wrap_up' && showFollowUp && (
          <FollowUpPicker
            onConfirm={handleFollowUpConfirm}
            onCancel={handleFollowUpCancel}
          />
        )}

        {/* Paused phase */}
        {phase === 'paused' && (
          <div className="text-center py-3">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">Session Paused</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Click resume to continue dialing</p>
          </div>
        )}
      </div>
    </div>
  );
}
