import { useState, useEffect, useRef, useCallback } from 'react';
import { getListEntries, markEntryCalled, updateEntryStatus } from '../../api/phoneLists';
import { useCall } from '../../context/CallContext';
import { usePowerDialer } from '../../context/PowerDialerContext';

/* ── Lead status config ── */

const LEAD_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'called', label: 'Called' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'do_not_call', label: 'Do Not Call' },
  { value: 'converted', label: 'Converted' },
];

function getStatusConfig(status) {
  const map = {
    pending:        { bg: 'bg-gray-100 dark:bg-gray-700',  text: 'text-gray-600 dark:text-gray-300', ring: 'focus:ring-gray-400' },
    called:         { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', ring: 'focus:ring-blue-400' },
    interested:     { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', ring: 'focus:ring-green-400' },
    not_interested: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', ring: 'focus:ring-red-400' },
    no_answer:      { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', ring: 'focus:ring-yellow-400' },
    follow_up:      { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', ring: 'focus:ring-purple-400' },
    do_not_call:    { bg: 'bg-red-200 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-200', ring: 'focus:ring-red-400' },
    converted:      { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', ring: 'focus:ring-emerald-400' },
  };
  return map[status] || map.pending;
}

const STATUS_PRIORITY = { follow_up: 0, pending: 1, no_answer: 2, called: 3, interested: 4, not_interested: 5, converted: 6, do_not_call: 7 };

function sortByStatus(entries) {
  return [...entries].sort((a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99));
}

function getMetaField(metadata, keys) {
  if (!metadata || typeof metadata !== 'object') return null;
  for (const [k, v] of Object.entries(metadata)) {
    const lk = k.toLowerCase();
    if (keys.some((key) => lk.includes(key))) return v;
  }
  return null;
}

function formatFieldValue(key, value) {
  if (key.toLowerCase().includes('date')) {
    const num = Number(value);
    if (num > 10000 && num < 100000) {
      const utcDays = num - 25569;
      const ms = utcDays * 86400000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      }
    }
  }
  return value;
}

/* ── FollowUpModal ── */

function FollowUpModal({ onConfirm, onCancel }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date) return;
    const followUpAt = new Date(`${date}T${time}`).toISOString();
    onConfirm(followUpAt, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">Schedule Follow-Up</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date *</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100 resize-none" placeholder="Optional notes..." />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">Schedule</button>
        </div>
      </form>
    </div>
  );
}

/* ── LeadsList ── */

export default function LeadsList({ listId, listName, onBack, onViewProfile, toast, showDialActions = true }) {
  const [data, setData] = useState({ entries: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const debounceRef = useRef(null);
  const pageKeyBufferRef = useRef('');
  const pageKeyTimerRef = useRef(null);
  const fetchEntriesRef = useRef(null);
  const { makeCall } = useCall();
  const { startSession, isActive: powerDialActive } = usePowerDialer();

  const totalPages = Math.ceil(data.total / data.limit) || 1;

  const fetchEntries = useCallback(async (page = 1, searchVal = search) => {
    setLoading(true);
    try {
      const result = await getListEntries(listId, { page, limit: 50, search: searchVal || undefined });
      setData({ ...result, entries: sortByStatus(result.entries) });
    } catch (err) {
      console.error('Failed to load entries:', err);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [listId, search, toast]);

  fetchEntriesRef.current = fetchEntries;

  useEffect(() => { fetchEntries(); }, [listId]);

  const handleSearchChange = (val) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEntries(1, val), 300);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key < '0' || e.key > '9') return;
      if (totalPages <= 1) return;
      e.preventDefault();
      pageKeyBufferRef.current += e.key;
      if (pageKeyTimerRef.current) clearTimeout(pageKeyTimerRef.current);
      pageKeyTimerRef.current = setTimeout(() => {
        const page = parseInt(pageKeyBufferRef.current, 10);
        pageKeyBufferRef.current = '';
        if (page >= 1 && page <= totalPages) fetchEntriesRef.current(page);
      }, 500);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pageKeyTimerRef.current) clearTimeout(pageKeyTimerRef.current);
    };
  }, [totalPages]);

  const handleCall = async (entry) => {
    try {
      makeCall(entry.phone_number);
      await markEntryCalled(entry.id);
      const newStatus = entry.status === 'pending' ? 'called' : entry.status;
      if (newStatus !== entry.status) await updateEntryStatus(entry.id, newStatus);
      setData((prev) => ({
        ...prev,
        entries: sortByStatus(prev.entries.map((e) => (e.id === entry.id ? { ...e, called: true, called_at: new Date().toISOString(), status: newStatus } : e))),
      }));
    } catch (err) {
      console.error('Failed to initiate call:', err);
      toast.error('Failed to initiate call');
    }
  };

  const handleStatusChange = async (entryId, newStatus) => {
    if (newStatus === 'follow_up') { setFollowUpTarget(entryId); return; }
    try {
      await updateEntryStatus(entryId, newStatus);
      setData((prev) => ({
        ...prev,
        entries: sortByStatus(prev.entries.map((e) => (e.id === entryId ? { ...e, status: newStatus, follow_up_at: null } : e))),
      }));
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  const handleFollowUpConfirm = async (followUpAt, notes) => {
    const entryId = followUpTarget;
    setFollowUpTarget(null);
    try {
      await updateEntryStatus(entryId, 'follow_up', followUpAt, notes);
      setData((prev) => ({
        ...prev,
        entries: sortByStatus(prev.entries.map((e) => (e.id === entryId ? { ...e, status: 'follow_up', follow_up_at: followUpAt, notes } : e))),
      }));
    } catch (err) {
      console.error('Failed to schedule follow-up:', err);
      toast.error('Failed to schedule follow-up');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <button onClick={onBack} className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lists
        </button>
        <div className="relative w-full sm:w-72">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, phone, trademark, or serial #"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
      ) : data.entries.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No leads in this list.</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Client Name</th>
                  <th className="px-4 py-3 font-medium">Phone Number</th>
                  <th className="px-4 py-3 font-medium">Trademark</th>
                  <th className="px-4 py-3 font-medium">Serial Number</th>
                  <th className="px-4 py-3 font-medium">Status Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {showDialActions && <th className="px-4 py-3 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.entries.map((entry) => {
                  const sc = getStatusConfig(entry.status);
                  const trademark = getMetaField(entry.metadata, ['word mark', 'mark', 'trademark']);
                  const serialNumber = getMetaField(entry.metadata, ['serial number']);
                  const statusDate = getMetaField(entry.metadata, ['status date']);
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onViewProfile(entry.id)}
                          className="text-left font-medium hover:underline text-brand-600 dark:text-brand-400"
                        >
                          {entry.name || entry.phone_number}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{entry.phone_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={trademark || ''}>{trademark || '—'}</td>
                      <td className="px-4 py-3">
                        {serialNumber ? (
                          <a
                            href={`https://tsdr.uspto.gov/#caseNumber=${serialNumber}&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                          >
                            {serialNumber}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {statusDate ? formatFieldValue('date', statusDate) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={entry.status || 'pending'}
                          onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 ${sc.bg} ${sc.text} ${sc.ring}`}
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        {entry.status === 'follow_up' && entry.follow_up_at && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {new Date(entry.follow_up_at).toLocaleString()}
                          </p>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[180px]" title={entry.notes}>
                            {entry.notes}
                          </p>
                        )}
                      </td>
                      {showDialActions && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startSession(listId, listName, entry.id)}
                              disabled={powerDialActive}
                              title="Power Dial from here"
                              className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCall(entry)}
                              className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
                            >
                              Call
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
              <button
                onClick={() => fetchEntries(data.page - 1)}
                disabled={data.page === 1}
                className="px-2.5 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {(() => {
                const pages = [];
                const cur = data.page;
                const addPage = (p) => pages.push(p);
                addPage(1);
                if (cur > 3) pages.push('...');
                for (let p = Math.max(2, cur - 1); p <= Math.min(totalPages - 1, cur + 1); p++) addPage(p);
                if (cur < totalPages - 2) pages.push('...');
                if (totalPages > 1) addPage(totalPages);
                return pages.map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} className="px-1.5 text-sm text-gray-400 dark:text-gray-500">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchEntries(p)}
                      className={`px-3 py-1.5 text-sm rounded-lg ${
                        p === cur
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}
              <button
                onClick={() => fetchEntries(data.page + 1)}
                disabled={data.page === totalPages}
                className="px-2.5 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {followUpTarget && (
        <FollowUpModal
          onConfirm={handleFollowUpConfirm}
          onCancel={() => setFollowUpTarget(null)}
        />
      )}
    </div>
  );
}
