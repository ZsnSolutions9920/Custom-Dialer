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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500 dark:text-gray-400">
            <th className="px-4 py-3 font-medium">List Name</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {lists.map((list) => {
            const pct = list.total_count > 0 ? ((list.called_count || 0) / list.total_count) * 100 : 0;
            return (
              <tr key={list.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelectList(list.id, list.name)}
                    className="font-medium text-gray-800 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-left"
                  >
                    {list.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {list.total_count}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                      {list.called_count || 0} / {list.total_count}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap text-xs">
                  {new Date(list.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {showPowerDial && (
                      <button
                        onClick={() => startSession(list.id, list.name)}
                        disabled={powerDialActive}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {powerDialActive ? 'Dialing...' : (list.called_count > 0 && list.called_count < list.total_count) ? 'Resume' : 'Power Dial'}
                      </button>
                    )}
                    {showUploadButton && (
                      <button
                        onClick={() => handleDelete(list.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete list"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
