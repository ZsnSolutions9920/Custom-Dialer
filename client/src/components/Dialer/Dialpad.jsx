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
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {number && (
            <button onClick={handleBackspace} className="text-gray-400 hover:text-gray-600 px-2 py-2">
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
              className="bg-gray-100 hover:bg-gray-200 rounded-lg py-3 text-xl font-medium transition-colors"
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
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-lg transition-colors"
        >
          Call
        </button>
      )}
    </div>
  );
}
