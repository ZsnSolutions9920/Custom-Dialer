import { useState, useEffect } from 'react';
import { getPhoneLists, getListEntries, uploadPhoneList, deletePhoneList, markEntryCalled } from '../api/phoneLists';
import { useCall } from '../context/CallContext';
import { useToast } from '../context/ToastContext';

function UploadModal({ onClose, onUploaded, toast }) {
  const [name, setName] = useState('');
  const [entries, setEntries] = useState([]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return;

      // Detect CSV with headers
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('phone') || firstLine.includes('number') || firstLine.includes('name');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      // Find column indexes if CSV with header
      let phoneIdx = 0;
      let nameIdx = -1;
      if (hasHeader) {
        const headers = firstLine.split(',').map((h) => h.trim());
        phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('number'));
        nameIdx = headers.findIndex((h) => h === 'name' || h.includes('contact'));
        if (phoneIdx === -1) phoneIdx = 0;
      }

      const parsed = [];
      for (const line of dataLines) {
        const parts = line.includes(',') ? line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, '')) : [line.trim()];
        const phone = parts[phoneIdx]?.replace(/[^\d+\-() ]/g, '').trim();
        if (!phone) continue;
        const entryName = nameIdx >= 0 ? parts[nameIdx] || null : (parts.length > 1 && phoneIdx === 0 ? parts[1] || null : (parts.length > 1 && phoneIdx === 1 ? parts[0] || null : null));
        parsed.push({ phone_number: phone, name: entryName });
      }
      setEntries(parsed);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!name.trim() || entries.length === 0) return;
    setSubmitting(true);
    try {
      await uploadPhoneList({ name: name.trim(), entries });
      onUploaded();
    } catch (err) {
      console.error('Failed to upload list:', err);
      toast.error('Failed to upload list');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Upload Phone List</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">List Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Leads"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File (.csv or .txt)</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-900/30 dark:file:text-brand-300 hover:file:bg-brand-100"
            />
          </div>

          {fileName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fileName} — <span className="font-medium">{entries.length}</span> numbers found
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || entries.length === 0 || submitting}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EntriesTable({ listId, onBack, toast }) {
  const [data, setData] = useState({ entries: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const { makeCall } = useCall();

  const fetchEntries = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getListEntries(listId, page);
      setData(result);
    } catch (err) {
      console.error('Failed to load entries:', err);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [listId]);

  const handleCall = async (entry) => {
    try {
      makeCall(entry.phone_number);
      await markEntryCalled(entry.id);
      setData((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === entry.id ? { ...e, called: true, called_at: new Date().toISOString() } : e)),
      }));
    } catch (err) {
      console.error('Failed to mark entry as called:', err);
      toast.error('Failed to mark entry as called');
    }
  };

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Lists
      </button>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
      ) : data.entries.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No entries in this list.</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Phone Number</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.entries.map((entry) => (
                  <tr key={entry.id} className={entry.called ? 'bg-green-50/50 dark:bg-green-900/10' : ''}>
                    <td className={`px-4 py-3 font-mono ${entry.called ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                      {entry.phone_number}
                    </td>
                    <td className={`px-4 py-3 ${entry.called ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
                      {entry.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {entry.called ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Called
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Not called</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleCall(entry)}
                        className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
                      >
                        Call
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchEntries(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    p === data.page
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PhoneListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedListId, setSelectedListId] = useState(null);
  const toast = useToast();

  const fetchLists = async () => {
    setLoading(true);
    try {
      const data = await getPhoneLists();
      setLists(data);
    } catch (err) {
      console.error('Failed to load phone lists:', err);
      toast.error('Failed to load phone lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this phone list and all its entries?')) return;
    try {
      await deletePhoneList(id);
      if (selectedListId === id) setSelectedListId(null);
      fetchLists();
    } catch (err) {
      console.error('Failed to delete list:', err);
      toast.error('Failed to delete list');
    }
  };

  const handleUploaded = () => {
    setShowUpload(false);
    fetchLists();
  };

  if (selectedListId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Phone Lists</h1>
        <EntriesTable listId={selectedListId} onBack={() => setSelectedListId(null)} toast={toast} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Phone Lists</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Upload List
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
      ) : lists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No phone lists yet. Upload a CSV or text file to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <button
                  onClick={() => setSelectedListId(list.id)}
                  className="text-left font-semibold text-gray-800 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {list.name}
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Delete list"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                  {new Date(list.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} toast={toast} />}
    </div>
  );
}
