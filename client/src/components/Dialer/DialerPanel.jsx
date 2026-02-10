import Dialpad from './Dialpad';
import CallControls from './CallControls';
import { useCall } from '../../context/CallContext';

export default function DialerPanel() {
  const { callState } = useCall();

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-100">
        {callState === 'idle' ? 'Make a Call' : 'Call Controls'}
      </h2>
      <Dialpad />
      {callState !== 'idle' && (
        <div className="mt-4">
          <CallControls />
        </div>
      )}
    </div>
  );
}
