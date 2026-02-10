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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Transfer Call</h3>

        {otherAgents.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No other agents available.</p>
        ) : (
          <div className="space-y-2">
            {otherAgents.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-brand-50/50 dark:hover:bg-gray-700/50 transition-colors"
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
                  <span className="font-medium text-sm dark:text-gray-200">{a.display_name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{a.status}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleTransfer(a.id, 'warm')}
                    disabled={transferring}
                    className="px-3 py-1 text-xs bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-md hover:bg-brand-200 dark:hover:bg-brand-900/50 disabled:opacity-50 font-medium transition-colors"
                  >
                    Warm
                  </button>
                  <button
                    onClick={() => handleTransfer(a.id, 'cold')}
                    disabled={transferring}
                    className="px-3 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50 font-medium transition-colors"
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
          className="mt-4 w-full px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
