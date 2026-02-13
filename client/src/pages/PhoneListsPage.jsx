import { useState, useEffect } from 'react';
import { read, utils } from 'xlsx';
import { getPhoneLists, getListEntries, getEntry, createPhoneList, addListEntries, deletePhoneList, markEntryCalled, updateEntryStatus } from '../api/phoneLists';
import { useCall } from '../context/CallContext';
import { useToast } from '../context/ToastContext';
import { usePowerDialer } from '../context/PowerDialerContext';

/* ── File parsing helpers ── */

function detectDelimiter(line) {
  const tabCount = (line.match(/\t/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

function parseLine(line, delimiter) {
  if (delimiter === '\t') return line.split('\t').map((f) => f.trim());
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function detectColumnIndex(headers, patterns) {
  return headers.findIndex((h) => patterns.some((p) => h.includes(p)));
}

/* ── UploadModal ── */

function UploadModal({ onClose, onUploaded, toast }) {
  const [name, setName] = useState('');
  const [entries, setEntries] = useState([]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const processRows = (headers, dataRows) => {
    const phoneIdx = detectColumnIndex(headers, ['primary phone', 'phone', 'telephone', 'mobile']);
    const emailIdx = detectColumnIndex(headers, ['primary email', 'email']);

    // Detect separate first/last name columns
    const firstNameIdx = headers.findIndex((h) => h === 'first name');
    const lastNameIdx = headers.findIndex((h) => h === 'last name');
    const hasSplitName = firstNameIdx >= 0 && lastNameIdx >= 0;

    // Fall back to single combined name column
    const nameIdx = hasSplitName ? -1 : detectColumnIndex(headers, ['client name', 'name', 'applicant']);

    if (phoneIdx === -1) {
      toast.error('Could not detect a phone column in the headers');
      return [];
    }

    // Columns to exclude from metadata (they go into dedicated fields)
    const excludeIdx = new Set([phoneIdx, emailIdx]);
    if (hasSplitName) {
      excludeIdx.add(firstNameIdx);
      excludeIdx.add(lastNameIdx);
    } else if (nameIdx >= 0) {
      excludeIdx.add(nameIdx);
    }

    const parsed = [];
    for (const row of dataRows) {
      const phone = String(row[phoneIdx] ?? '').replace(/[^\d+\-() ]/g, '').trim();
      if (!phone) continue;

      let entryName = null;
      if (hasSplitName) {
        const first = String(row[firstNameIdx] || '').trim();
        const last = String(row[lastNameIdx] || '').trim();
        entryName = [first, last].filter(Boolean).join(' ') || null;
      } else if (nameIdx >= 0) {
        entryName = String(row[nameIdx] || '') || null;
      }

      const entryEmail = emailIdx >= 0 ? String(row[emailIdx] || '') || null : null;

      const metadata = {};
      headers.forEach((h, i) => {
        if (excludeIdx.has(i)) return;
        const val = row[i];
        if (val != null && String(val).trim()) metadata[h] = String(val).trim();
      });

      parsed.push({ phone_number: phone, name: entryName, primary_email: entryEmail, metadata });
    }
    return parsed;
  };

  const parseFile = (file) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = (e) => {
      let headers, dataRows;

      if (isExcel) {
        const wb = read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
        if (rows.length < 2) return;
        headers = rows[0].map((h) => String(h).toLowerCase().trim());
        dataRows = rows.slice(1);
      } else {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) return;
        const delimiter = detectDelimiter(lines[0]);
        headers = parseLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/^["']|["']$/g, ''));
        dataRows = lines.slice(1).map((line) => parseLine(line, delimiter).map((p) => p.replace(/^["']|["']$/g, '')));
      }

      const hasHeader = headers.some((h) => h.includes('phone') || h.includes('number') || h.includes('name') || h.includes('email'));
      if (!hasHeader) {
        toast.error('Could not detect column headers. Make sure the first row has column names.');
        return;
      }

      const parsed = processRows(headers, dataRows);
      setEntries(parsed);
      setFileName(file.name);
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || entries.length === 0) return;
    setSubmitting(true);
    try {
      const list = await createPhoneList({ name: name.trim(), totalCount: entries.length });
      const BATCH_SIZE = 50;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        await addListEntries(list.id, entries.slice(i, i + BATCH_SIZE));
      }
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
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Upload Leads</h2>

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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File (.xlsx, .csv, or .txt)</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-900/30 dark:file:text-brand-300 hover:file:bg-brand-100"
            />
          </div>

          {fileName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fileName} — <span className="font-medium">{entries.length}</span> leads found
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

/* ── FollowUpModal ── */

function FollowUpModal({ onConfirm, onCancel }) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [hours, setHours] = useState(String(now.getHours()).padStart(2, '0'));
  const [minutes, setMinutes] = useState(String(now.getMinutes()).padStart(2, '0'));

  const selected = date ? new Date(`${date}T${hours}:${minutes}:00`) : null;
  const isValid = selected && !isNaN(selected.getTime()) && selected > new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Schedule Follow-Up</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            min={todayStr}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
          <div className="flex items-center gap-2">
            <select
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
            >
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-gray-500 dark:text-gray-400 font-semibold">:</span>
            <select
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
            >
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {isValid && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
            Scheduled for: {selected.toLocaleString()}
          </p>
        )}

        {selected && !isValid && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-4">
            Please select a future date and time.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Cancel
          </button>
          <button
            onClick={() => isValid && onConfirm(selected.toISOString())}
            disabled={!isValid}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Lead Status Config ── */

const LEAD_STATUSES = [
  { value: 'pending',          label: 'Pending',          bg: 'bg-gray-100 dark:bg-gray-700',     text: 'text-gray-600 dark:text-gray-300',   ring: 'focus:ring-gray-400' },
  { value: 'called',           label: 'Already Called',   bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', ring: 'focus:ring-green-400' },
  { value: 'no_answer',        label: 'No Answer',        bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', ring: 'focus:ring-yellow-400' },
  { value: 'follow_up',        label: 'Follow Up',        bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-700 dark:text-blue-400',   ring: 'focus:ring-blue-400' },
  { value: 'not_interested',   label: 'Not Interested',   bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400',     ring: 'focus:ring-red-400' },
  { value: 'do_not_contact',   label: 'Do Not Contact',   bg: 'bg-gray-300 dark:bg-gray-600',     text: 'text-gray-700 dark:text-gray-200',   ring: 'focus:ring-gray-500' },
];

function getStatusConfig(value) {
  return LEAD_STATUSES.find((s) => s.value === value) || LEAD_STATUSES[0];
}

/* ── Helpers ── */

const STATUS_PRIORITY = { follow_up: 1, no_answer: 2, pending: 3, called: 4, not_interested: 5, do_not_contact: 6 };

function sortByStatus(entries) {
  return [...entries].sort((a, b) => (STATUS_PRIORITY[a.status] || 7) - (STATUS_PRIORITY[b.status] || 7) || a.id - b.id);
}

function getMetaField(metadata, keys) {
  if (!metadata || typeof metadata !== 'object') return null;
  for (const [k, v] of Object.entries(metadata)) {
    const lk = k.toLowerCase();
    if (keys.some((key) => lk.includes(key))) return v;
  }
  return null;
}

/* ── LeadsList ── */

function LeadsList({ listId, onBack, onViewProfile, toast }) {
  const [data, setData] = useState({ entries: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [followUpTarget, setFollowUpTarget] = useState(null);
  const { makeCall } = useCall();

  const fetchEntries = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getListEntries(listId, page, 50);
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
      const newStatus = entry.status === 'pending' ? 'called' : entry.status;
      if (newStatus !== entry.status) {
        await updateEntryStatus(entry.id, newStatus);
      }
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
    if (newStatus === 'follow_up') {
      setFollowUpTarget(entryId);
      return;
    }
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

  const handleFollowUpConfirm = async (followUpAt) => {
    const entryId = followUpTarget;
    setFollowUpTarget(null);
    try {
      await updateEntryStatus(entryId, 'follow_up', followUpAt);
      setData((prev) => ({
        ...prev,
        entries: sortByStatus(prev.entries.map((e) => (e.id === entryId ? { ...e, status: 'follow_up', follow_up_at: followUpAt } : e))),
      }));
    } catch (err) {
      console.error('Failed to schedule follow-up:', err);
      toast.error('Failed to schedule follow-up');
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
        <p className="text-gray-500 dark:text-gray-400 text-sm">No leads in this list.</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 font-medium">Client Name</th>
                  <th className="px-4 py-3 font-medium">Trademark</th>
                  <th className="px-4 py-3 font-medium">Serial Number</th>
                  <th className="px-4 py-3 font-medium">Status Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
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
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={trademark || ''}>
                        {trademark || '—'}
                      </td>
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
                  );
                })}
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

      {followUpTarget && (
        <FollowUpModal
          onConfirm={handleFollowUpConfirm}
          onCancel={() => setFollowUpTarget(null)}
        />
      )}
    </div>
  );
}

/* ── ClientProfile ── */

const KNOWN_SECTIONS = {
  'Trademark Information': [
    'word mark', 'serial number', 'registration number', 'mark', 'trademark',
    'goods/services', 'goods and services', 'class', 'filing date',
    'registration date', 'status date', 'mark type', 'standard characters',
    'design search code', 'filed use', 'mark/status info', 'foreign application',
    'international application',
  ],
  'Legal / Prosecution': [
    'attorney', 'law firm', 'correspondent', 'legal', 'counsel', 'bar',
    'domestic representative', 'prosecution history',
  ],
  'Contact Information': [
    'secondary email', 'address', 'city', 'state', 'zip', 'country', 'fax',
    'website', 'url',
  ],
  'Owner Information': [
    'owner', 'applicant', 'registrant', 'entity type', 'incorporation',
    'citizenship', 'dba', 'signatory position',
  ],
};

function categorizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return { sections: {}, additional: {} };

  const sections = {};
  const used = new Set();

  for (const [sectionName, keywords] of Object.entries(KNOWN_SECTIONS)) {
    const matched = {};
    for (const [key, value] of Object.entries(metadata)) {
      const lk = key.toLowerCase();
      if (keywords.some((kw) => lk.includes(kw))) {
        matched[key] = value;
        used.add(key);
      }
    }
    if (Object.keys(matched).length > 0) sections[sectionName] = matched;
  }

  const additional = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!used.has(key)) additional[key] = value;
  }

  return { sections, additional };
}

function formatFieldLabel(key) {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Convert Excel serial number to a readable date string
function formatFieldValue(key, value) {
  if (key.toLowerCase().includes('date')) {
    const num = Number(value);
    if (num > 10000 && num < 100000) {
      // Excel serial: days since Jan 0, 1900 (with the Lotus 1-2-3 leap year bug)
      const utcDays = num - 25569; // offset from Unix epoch
      const ms = utcDays * 86400000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
      }
    }
  }
  return value;
}

function ClientProfile({ entryId, onBack, toast }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const { makeCall } = useCall();

  useEffect(() => {
    setLoading(true);
    getEntry(entryId)
      .then(setEntry)
      .catch((err) => {
        console.error('Failed to load entry:', err);
        toast.error('Failed to load client profile');
      })
      .finally(() => setLoading(false));
  }, [entryId]);

  const handleCall = async () => {
    if (!entry) return;
    try {
      makeCall(entry.phone_number);
      await markEntryCalled(entry.id);
      setEntry((prev) => ({ ...prev, called: true, called_at: new Date().toISOString() }));
    } catch (err) {
      console.error('Failed to call:', err);
      toast.error('Failed to initiate call');
    }
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>;
  }
  if (!entry) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">Entry not found.</p>;
  }

  const { sections, additional } = categorizeMetadata(entry.metadata);

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Leads
      </button>

      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {entry.name || 'Unknown'}
            </h2>
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{entry.phone_number}</p>
              {entry.primary_email && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{entry.primary_email}</p>
              )}
            </div>
            {entry.called && (
              <span className="inline-flex items-center gap-1 mt-2 text-green-600 dark:text-green-400 text-xs font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Called{entry.called_at ? ` on ${new Date(entry.called_at).toLocaleDateString()}` : ''}
              </span>
            )}
          </div>
          <button
            onClick={handleCall}
            className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shrink-0"
          >
            Call
          </button>
        </div>
      </div>

      {/* Metadata Sections */}
      {Object.entries(sections).map(([sectionName, fields]) => (
        <div key={sectionName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">{sectionName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(fields).map(([key, value]) => (
              <div key={key} className="flex flex-col py-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatFieldLabel(key)}</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 break-words">{formatFieldValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(additional).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Additional Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(additional).map(([key, value]) => (
              <div key={key} className="flex flex-col py-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatFieldLabel(key)}</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 break-words">{formatFieldValue(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */

export default function PhoneListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const toast = useToast();
  const { startSession, isActive: powerDialActive } = usePowerDialer();

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

  useEffect(() => {
    fetchLists();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead list and all its entries?')) return;
    try {
      await deletePhoneList(id);
      if (selectedListId === id) {
        setSelectedListId(null);
        setSelectedEntryId(null);
      }
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

  // Client Profile view
  if (selectedEntryId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leads</h1>
        <ClientProfile
          entryId={selectedEntryId}
          onBack={() => setSelectedEntryId(null)}
          toast={toast}
        />
      </div>
    );
  }

  // Leads List view
  if (selectedListId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leads</h1>
        <LeadsList
          listId={selectedListId}
          onBack={() => setSelectedListId(null)}
          onViewProfile={(entryId) => setSelectedEntryId(entryId)}
          toast={toast}
        />
      </div>
    );
  }

  // Lists grid view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Leads</h1>
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
          <p className="text-gray-500 dark:text-gray-400">No leads yet. Upload a CSV file to get started.</p>
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
                <button
                  onClick={() => startSession(list.id, list.name)}
                  disabled={powerDialActive}
                  className="w-full mt-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {powerDialActive ? 'Dialing...' : 'Power Dial'}
                </button>
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
