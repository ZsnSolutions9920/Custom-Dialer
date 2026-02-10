import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useAgentPresence } from '../../hooks/useAgentPresence';

export default function TransferDialog({ onClose }) {
  const { agent } = useAuth();
  const { transfer } = useCall();
  const { agents } = useAgentPresence();
  const [transferring, setTransferring] = useState(false);

  const otherAgents = agents.filter((a) => a.id !== agent.id);

  const handleTransfer = async (targetId, type) => {
    setTransferring(true);
    try {
      await transfer(targetId, type);
      if (type === 'cold') {
        onClose();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Transfer failed:', err);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Transfer Call</h3>

        {otherAgents.length === 0 ? (
          <p className="text-gray-500 text-sm">No other agents available.</p>
        ) : (
          <div className="space-y-2">
            {otherAgents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      a.status === 'available'
                        ? 'bg-green-400'
                        : a.status === 'on_call'
                        ? 'bg-red-400'
                        : a.status === 'away'
                        ? 'bg-yellow-400'
                        : 'bg-gray-400'
                    }`}
                  />
                  <span className="font-medium text-sm">{a.display_name}</span>
                  <span className="text-xs text-gray-400">{a.status}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleTransfer(a.id, 'warm')}
                    disabled={transferring}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    Warm
                  </button>
                  <button
                    onClick={() => handleTransfer(a.id, 'cold')}
                    disabled={transferring}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                  >
                    Cold
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
