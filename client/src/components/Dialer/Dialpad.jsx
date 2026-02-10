import { useState } from 'react';
import { useCall } from '../../context/CallContext';

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

export default function Dialpad() {
  const { makeCall, callState, sendDTMF } = useCall();
  const [number, setNumber] = useState('');

  const inCall = callState !== 'idle';

  const handleKey = (key) => {
    if (inCall) {
      sendDTMF(key);
    } else {
      setNumber((prev) => prev + key);
    }
  };

  const handleDial = () => {
    if (number.trim()) {
      makeCall(number.trim());
    }
  };

  const handleBackspace = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      {!inCall && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow dark:bg-gray-700 dark:text-gray-100"
          />
          {number && (
            <button onClick={handleBackspace} className="text-gray-400 hover:text-brand-500 px-2 py-2 transition-colors">
              &larr;
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        {keys.map((row) =>
          row.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="bg-gray-50 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-400 active:bg-brand-100 dark:active:bg-brand-900/50 rounded-xl py-3 text-xl font-medium transition-colors dark:text-gray-200"
            >
              {key}
            </button>
          ))
        )}
      </div>

      {!inCall && (
        <button
          onClick={handleDial}
          disabled={!number.trim()}
          className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium text-lg transition-colors shadow-sm"
        >
          Call
        </button>
      )}
    </div>
  );
}
