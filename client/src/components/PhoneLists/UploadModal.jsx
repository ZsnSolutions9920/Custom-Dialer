import { useState, useRef } from 'react';
import { read, utils } from 'xlsx';
import { createPhoneList, addListEntries } from '../../api/phoneLists';

/* ── File parsing helpers ── */

function detectDelimiter(line) {
  const tab = (line.match(/\t/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  const semi = (line.match(/;/g) || []).length;
  return tab >= comma && tab >= semi ? '\t' : comma >= semi ? ',' : ';';
}

function parseLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectColumnIndex(headers, candidates) {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (idx !== -1) return idx;
  }
  return -1;
}

export default function UploadModal({ onClose, onUploaded, toast }) {
  const [file, setFile] = useState(null);
  const [listName, setListName] = useState('');
  const [preview, setPreview] = useState(null);
  const [nameCol, setNameCol] = useState(-1);
  const [phoneCol, setPhoneCol] = useState(-1);
  const [emailCol, setEmailCol] = useState(-1);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const allRowsRef = useRef([]);

  const processFile = async (f) => {
    const rows = [];
    if (f.name.endsWith('.csv') || f.name.endsWith('.tsv') || f.name.endsWith('.txt')) {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return;
      const delimiter = detectDelimiter(lines[0]);
      const headers = parseLine(lines[0], delimiter);
      for (let i = 1; i < lines.length; i++) rows.push(parseLine(lines[i], delimiter));
      allRowsRef.current = rows;
      const nc = detectColumnIndex(headers, ['name', 'client name', 'full name', 'contact name', 'owner name', 'first name']);
      const pc = detectColumnIndex(headers, ['phone', 'phone number', 'telephone', 'mobile', 'cell']);
      const ec = detectColumnIndex(headers, ['email', 'email address', 'primary email', 'e-mail']);
      setNameCol(nc);
      setPhoneCol(pc);
      setEmailCol(ec);
      setPreview({ headers, sampleRows: rows.slice(0, 3) });
    } else {
      const buffer = await f.arrayBuffer();
      const wb = read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (data.length === 0) return;
      const headers = data[0].map(String);
      for (let i = 1; i < data.length; i++) rows.push(data[i].map(String));
      allRowsRef.current = rows;
      const nc = detectColumnIndex(headers, ['name', 'client name', 'full name', 'contact name', 'owner name', 'first name']);
      const pc = detectColumnIndex(headers, ['phone', 'phone number', 'telephone', 'mobile', 'cell']);
      const ec = detectColumnIndex(headers, ['email', 'email address', 'primary email', 'e-mail']);
      setNameCol(nc);
      setPhoneCol(pc);
      setEmailCol(ec);
      setPreview({ headers, sampleRows: rows.slice(0, 3) });
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!listName) setListName(f.name.replace(/\.[^.]+$/, ''));
    processFile(f);
  };

  const handleUpload = async () => {
    if (!file || phoneCol === -1) return;
    setUploading(true);
    try {
      const list = await createPhoneList(listName || file.name);
      const entries = allRowsRef.current
        .map((row) => {
          const phone = row[phoneCol]?.replace(/[^\d+]/g, '');
          if (!phone) return null;
          const meta = {};
          preview.headers.forEach((h, i) => {
            if (i !== nameCol && i !== phoneCol && i !== emailCol && row[i]) meta[h] = row[i];
          });
          return {
            name: nameCol >= 0 ? row[nameCol] : '',
            phone_number: phone,
            primary_email: emailCol >= 0 ? row[emailCol] : '',
            metadata: Object.keys(meta).length > 0 ? meta : null,
          };
        })
        .filter(Boolean);
      if (entries.length === 0) {
        toast.error('No valid phone numbers found');
        setUploading(false);
        return;
      }
      const BATCH = 500;
      for (let i = 0; i < entries.length; i += BATCH) {
        await addListEntries(list.id, entries.slice(i, i + BATCH));
      }
      toast.success(`Uploaded ${entries.length} leads`);
      onUploaded();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Upload Lead List</h2>

        <input
          type="text"
          placeholder="List name"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100"
        />

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-brand-400 transition-colors"
        >
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{file ? file.name : 'Click to select CSV / Excel file'}</p>
        </div>

        {preview && (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Name Column</label>
              <select value={nameCol} onChange={(e) => setNameCol(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100">
                <option value={-1}>-- None --</option>
                {preview.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Phone Column *</label>
              <select value={phoneCol} onChange={(e) => setPhoneCol(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100">
                <option value={-1}>-- Select --</option>
                {preview.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Email Column</label>
              <select value={emailCol} onChange={(e) => setEmailCol(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100">
                <option value={-1}>-- None --</option>
                {preview.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
              </select>
            </div>

            {preview.sampleRows.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Preview</p>
                <table className="w-full text-xs border border-gray-200 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      {preview.headers.map((h, i) => (
                        <th key={i} className={`px-2 py-1 text-left font-medium ${i === phoneCol ? 'text-brand-600 dark:text-brand-400' : i === nameCol ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-gray-100 dark:border-gray-700">
                        {preview.headers.map((_, ci) => (
                          <td key={ci} className="px-2 py-1 text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{row[ci] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={!file || phoneCol === -1 || uploading}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
