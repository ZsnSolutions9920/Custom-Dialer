import Dialpad from './Dialpad';
import CallControls from './CallControls';
import { useCall } from '../../context/CallContext';

export default function DialerPanel() {
  const { callState } = useCall();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-lg font-semibold mb-4 text-center">
        {callState === 'idle' ? 'Make a Cal' : 'Call Controls'}
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
