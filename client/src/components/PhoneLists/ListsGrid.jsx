import { useState, useEffect } from 'react';
import { getPhoneLists, deletePhoneList } from '../../api/phoneLists';

export default function ListsGrid({ onSelectList, onUploaded, showUploadButton = false, onUploadClick, showPowerDial = false, startSession, powerDialActive, toast }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = async () => {
    setLoading(true);
    try {
      const data = await getPhoneLists();
      setLists(data);
    } catch (err) {
      console.error('Failed to load leads:', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLists(); }, []);

  // Allow parent to trigger refresh
  useEffect(() => {
    if (onUploaded) {
      onUploaded.current = fetchLists;
    }
  }, [onUploaded]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead list and all its entries?')) return;
    try {
      await deletePhoneList(id);
      fetchLists();
    } catch (err) {
      console.error('Failed to delete list:', err);
      toast.error('Failed to delete list');
    }
  };

  if (loading) return <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>;

  if (lists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No lists yet. {showUploadButton ? 'Upload a CSV file to get started.' : 'Go to Contacts to upload lists.'}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => (
        <div
          key={list.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <button
              onClick={() => onSelectList(list.id, list.name)}
              className="text-left font-semibold text-gray-800 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              {list.name}
            </button>
            {showUploadButton && (
              <button
                onClick={() => handleDelete(list.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Delete list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{list.total_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Called</span>
              <span className="font-medium text-green-600 dark:text-green-400">{list.called_count || 0} / {list.total_count}</span>
            </div>
            {list.total_count > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${((list.called_count || 0) / list.total_count) * 100}%` }}
                />
              </div>
            )}
            {showPowerDial && (
              <button
                onClick={() => startSession(list.id, list.name)}
                disabled={powerDialActive}
                className="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {powerDialActive ? 'Dialing...' : (list.called_count > 0 && list.called_count < list.total_count) ? 'Resume Power Dial' : 'Power Dial'}
              </button>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
              {new Date(list.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
