import { useState, useEffect } from 'react';
import { getEntry, markEntryCalled } from '../../api/phoneLists';
import { useCall } from '../../context/CallContext';

/* ── Metadata categorization ── */

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
      if (keywords.some((kw) => lk.includes(kw))) { matched[key] = value; used.add(key); }
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
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

export default function ClientProfile({ entryId, onBack, toast }) {
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

  if (loading) return <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>;
  if (!entry) return <p className="text-gray-500 dark:text-gray-400 text-sm">Entry not found.</p>;

  const { sections, additional } = categorizeMetadata(entry.metadata);

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Leads
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{entry.name || 'Unknown'}</h2>
            <div className="mt-1 space-y-0.5">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{entry.phone_number}</p>
              {entry.primary_email && <p className="text-sm text-gray-600 dark:text-gray-400">{entry.primary_email}</p>}
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

      {Object.entries(sections).map(([sectionName, fields]) => (
        <div key={sectionName} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
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
