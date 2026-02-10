import { useCall } from '../../context/CallContext';

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall, remoteNumber } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">Incoming Call</h3>
          <p className="text-gray-600 font-mono mt-1">{remoteNumber || 'Unknown'}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={acceptCall}
            className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium"
          >
            Accept
          </button>
          <button
            onClick={rejectCall}
            className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 font-medium"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
