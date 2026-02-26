import Dialpad from './Dialpad';
import CallControls from './CallControls';
import { useCall } from '../../context/CallContext';

export default function DialerPanel() {
  const { callState, callError, clearCallError } = useCall();

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-100">
        {callState === 'idle' ? 'Make a Call' : 'Call Controls'}
      </h2>

      {callError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Application Error</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{callError.message}</p>
          </div>
          <button
            onClick={clearCallError}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-200 flex-shrink-0 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <Dialpad />
      {callState !== 'idle' && (
        <div className="mt-4">
          <CallControls />
        </div>
      )}
    </div>
  );
}
