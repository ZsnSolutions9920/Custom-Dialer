import { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { read, utils } from 'xlsx';
import { useSocket } from '../context/SocketContext';
import { getPhoneLists } from '../api/phoneLists';
import * as emailApi from '../api/email';

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'called', label: 'Called' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'do_not_contact', label: 'Do Not Contact' },
];

const DEFAULT_TEMPLATE_VARS = [
  '{{name}}', '{{email}}', '{{phone}}', '{{trademark}}',
  '{{serial number}}', '{{status date}}',
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

// ─── Sub-views ──────────────────────────────────────────────────────

function SmtpSettings() {
  const [config, setConfig] = useState(null); // null = loading, false = no config, object = existing config
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ label: '', host: '', port: 587, secure: false, username: '', password: '', from_email: '', from_name: '', is_default: true, imap_host: '', imap_port: 993, imap_secure: true });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const configs = await emailApi.getSmtpConfigs();
      if (configs.length > 0) {
        setConfig(configs[0]);
      } else {
        setConfig(false);
      }
    } catch { setConfig(false); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // Auto-enter edit mode if no config exists
  useEffect(() => {
    if (config === false && !editing) {
      setForm({ label: '', host: '', port: 587, secure: false, username: '', password: '', from_email: '', from_name: '', is_default: true, imap_host: '', imap_port: 993, imap_secure: true });
      setEditing(true);
    }
  }, [config, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config && config.id) {
        await emailApi.updateSmtpConfig(config.id, form);
      } else {
        await emailApi.saveSmtpConfig(form);
      }
      setEditing(false);
      fetchConfig();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    try {
      await emailApi.testSmtpConnection(config.id);
      setTestResult({ success: true });
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || 'Connection failed' });
    }
    setTesting(false);
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;

  // Edit / Setup form
  if (editing) {
    const isNew = !config || !config.id;
    return (
      <div className="max-w-lg mx-auto">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">{isNew ? 'Setup SMTP Account' : 'Edit SMTP Account'}</h3>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outgoing (SMTP)</p>
          {[
            { key: 'label', label: 'Label', placeholder: 'e.g. Work Gmail' },
            { key: 'host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
            { key: 'port', label: 'SMTP Port', type: 'number' },
            { key: 'username', label: 'Username / Email' },
            { key: 'password', label: 'Password', type: 'password', placeholder: !isNew ? '(leave blank to keep current)' : '' },
            { key: 'from_email', label: 'From Email' },
            { key: 'from_name', label: 'From Name' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} className="rounded" />
            Use TLS/SSL (SMTP)
          </label>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-1" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Incoming (IMAP)</p>
          {[
            { key: 'imap_host', label: 'IMAP Host', placeholder: 'imap.gmail.com' },
            { key: 'imap_port', label: 'IMAP Port', type: 'number' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={form[key] || ''}
                onChange={(e) => setForm({ ...form, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.imap_secure !== false} onChange={(e) => setForm({ ...form, imap_secure: e.target.checked })} className="rounded" />
            Use TLS/SSL (IMAP)
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500">IMAP uses the same username/password as SMTP. Configure IMAP to sync your inbox.</p>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            {!isNew && (
              <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Display current config
  return (
    <div className="max-w-lg mx-auto">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">SMTP Configuration</h3>
      {config && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-white text-lg">{config.label || 'SMTP Account'}</p>
            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium">Configured</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">SMTP Host</p>
              <p className="font-medium text-gray-900 dark:text-white">{config.host}:{config.port}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">SMTP Security</p>
              <p className="font-medium text-gray-900 dark:text-white">{config.secure ? 'TLS/SSL' : 'None'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Username</p>
              <p className="font-medium text-gray-900 dark:text-white">{config.username}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">From</p>
              <p className="font-medium text-gray-900 dark:text-white">{config.from_name ? `${config.from_name} <${config.from_email}>` : config.from_email}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">IMAP Host</p>
              <p className="font-medium text-gray-900 dark:text-white">{config.imap_host ? `${config.imap_host}:${config.imap_port}` : <span className="text-yellow-600 dark:text-yellow-400">Not configured</span>}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">IMAP Security</p>
              <p className="font-medium text-gray-900 dark:text-white">{config.imap_host ? (config.imap_secure ? 'TLS/SSL' : 'None') : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {testResult && (
              <span className={`text-xs font-medium mr-auto ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.success ? 'Connection successful!' : testResult.error}
              </span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleTest} disabled={testing}
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50">
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button onClick={() => { setForm({ ...config, password: '' }); setEditing(true); }}
                className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700">Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateManager({ onUseTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try { setTemplates(await emailApi.getEmailTemplates()); } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSave = async () => {
    try {
      if (editing === 'new') {
        await emailApi.createEmailTemplate(form);
      } else {
        await emailApi.updateEmailTemplate(editing, form);
      }
      setEditing(null);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    await emailApi.deleteEmailTemplate(id);
    fetchTemplates();
  };

  if (editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">{editing === 'new' ? 'Create Template' : 'Edit Template'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <VariableBar onInsert={(v) => setForm({ ...form, body: form.body + v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
            <ReactQuill theme="snow" value={form.body} onChange={(v) => setForm({ ...form, body: v })} modules={QUILL_MODULES} className="bg-white dark:bg-gray-700 rounded-lg [&_.ql-toolbar]:dark:bg-gray-600 [&_.ql-toolbar]:dark:border-gray-500 [&_.ql-container]:dark:border-gray-500 [&_.ql-editor]:dark:text-gray-100 [&_.ql-editor]:min-h-[200px]" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">Save Template</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white">Email Templates</h3>
        <button onClick={() => { setForm({ name: '', subject: '', body: '' }); setEditing('new'); }}
          className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">+ New Template</button>
      </div>
      {loading ? <p className="text-gray-500 text-sm">Loading...</p> : templates.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No templates yet. Create one to speed up your email campaigns.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Subject: {t.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                {onUseTemplate && (
                  <button onClick={() => onUseTemplate(t)} className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700">Use</button>
                )}
                <button onClick={() => { setForm({ name: t.name, subject: t.subject, body: t.body }); setEditing(t.id); }}
                  className="px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg">Edit</button>
                <button onClick={() => handleDelete(t.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariableBar({ onInsert, variables }) {
  const vars = variables && variables.length > 0 ? variables : DEFAULT_TEMPLATE_VARS;
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-xs text-gray-500 dark:text-gray-400 self-center mr-1">Variables:</span>
      {vars.map((v) => (
        <button key={v} onClick={() => onInsert(v)} type="button"
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-mono">
          {v}
        </button>
      ))}
    </div>
  );
}

/* ── Sheet parsing helpers for email campaigns ── */

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
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else if (ch === '"') { inQuotes = true; }
    else if (ch === ',') { fields.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  fields.push(current.trim());
  return fields;
}

function parseSheetFile(file) {
  return new Promise((resolve, reject) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      try {
        let headers, dataRows;
        if (isExcel) {
          const wb = read(new Uint8Array(e.target.result), { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
          if (rows.length < 2) return reject(new Error('Sheet has less than 2 rows'));
          headers = rows[0].map((h) => String(h).trim());
          dataRows = rows.slice(1);
        } else {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          if (lines.length < 2) return reject(new Error('File has less than 2 rows'));
          const delim = detectDelimiter(lines[0]);
          headers = parseLine(lines[0], delim).map((h) => h.replace(/^["']|["']$/g, '').trim());
          dataRows = lines.slice(1).map((line) => parseLine(line, delim).map((p) => p.replace(/^["']|["']$/g, '')));
        }

        // Detect email column (any column name containing "email")
        const emailIdx = headers.findIndex((h) => h.toLowerCase().includes('email'));
        if (emailIdx === -1) return reject(new Error('No email column found. Make sure one column header contains the word "email".'));

        // Build rows as objects using original header names
        const rows = [];
        for (const row of dataRows) {
          const email = String(row[emailIdx] || '').trim();
          if (!email || !email.includes('@')) continue;
          const data = {};
          headers.forEach((h, i) => {
            const val = row[i];
            if (val != null && String(val).trim()) data[h] = String(val).trim();
          });
          rows.push({ email, data });
        }

        resolve({ headers, emailColumn: headers[emailIdx], rows });
      } catch (err) {
        reject(err);
      }
    };
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
}

function ComposeEmail({ smtpConfigs, onBack }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [smtpId, setSmtpId] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [showAi, setShowAi] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (smtpConfigs.length > 0 && !smtpId) {
      const def = smtpConfigs.find((c) => c.is_default) || smtpConfigs[0];
      setSmtpId(String(def.id));
    }
  }, [smtpConfigs, smtpId]);

  const handleSend = async () => {
    if (!to || !subject || !smtpId) return alert('Fill in To, Subject, and select SMTP account');
    setSending(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('smtpConfigId', smtpId);
      fd.append('to', to);
      fd.append('subject', subject);
      fd.append('body', body);
      files.forEach((f) => fd.append('attachments', f));
      await emailApi.sendSingleEmail(fd);
      setResult({ success: true });
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || 'Send failed' });
    }
    setSending(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    try {
      const res = await emailApi.generateAiEmail({ context: aiPrompt, tone: aiTone });
      if (res.subject) setSubject(res.subject);
      if (res.body) setBody(res.body);
      setShowAi(false);
    } catch (err) {
      alert(err.response?.data?.error || 'AI generation failed');
    }
    setAiLoading(false);
  };

  if (showTemplates) {
    return <TemplateManager onUseTemplate={(t) => { setSubject(t.subject); setBody(t.body); setShowTemplates(false); }} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white">Compose Email</h3>
        {onBack && <button onClick={onBack} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">&larr; Back</button>}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Account</label>
          <select value={smtpId} onChange={(e) => setSmtpId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Select account...</option>
            {smtpConfigs.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.from_email})</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Load Template
          </button>
          <button onClick={() => setShowAi(!showAi)} className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Generate with AI
          </button>
        </div>

        {showAi && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-purple-800 dark:text-purple-300">AI Email Generator</p>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3}
              placeholder="Describe what the email should be about..."
              className="w-full px-3 py-2 border border-purple-200 dark:border-purple-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="flex items-center gap-3">
              <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}
                className="px-3 py-1.5 border border-purple-200 dark:border-purple-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="urgent">Urgent</option>
                <option value="casual">Casual</option>
              </select>
              <button onClick={handleAiGenerate} disabled={aiLoading}
                className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {aiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        <VariableBar onInsert={(v) => setBody(body + v)} />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
          <ReactQuill theme="snow" value={body} onChange={setBody} modules={QUILL_MODULES}
            className="bg-white dark:bg-gray-700 rounded-lg [&_.ql-toolbar]:dark:bg-gray-600 [&_.ql-toolbar]:dark:border-gray-500 [&_.ql-container]:dark:border-gray-500 [&_.ql-editor]:dark:text-gray-100 [&_.ql-editor]:min-h-[200px]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachments</label>
          <input type="file" ref={fileRef} multiple onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600 w-full">
            Click to attach files
          </button>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                  <span>{f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {result && (
          <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
            {result.success ? 'Email sent successfully!' : result.error}
          </div>
        )}

        <button onClick={handleSend} disabled={sending}
          className="w-full px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50">
          {sending ? 'Sending...' : 'Send Email'}
        </button>
      </div>
    </div>
  );
}

function CampaignBuilder({ smtpConfigs, onBack, onCreated }) {
  const [step, setStep] = useState(1);
  // Source selection
  const [source, setSource] = useState('leads'); // 'leads' or 'upload'
  // Lead sheet source
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [recipientCount, setRecipientCount] = useState(null);
  // Uploaded sheet source
  const [uploadedRows, setUploadedRows] = useState([]);
  const [uploadedHeaders, setUploadedHeaders] = useState([]);
  const [uploadedEmailCol, setUploadedEmailCol] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  // Common
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [smtpId, setSmtpId] = useState('');
  const [delayMs, setDelayMs] = useState(3000);
  const [creating, setCreating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [showAi, setShowAi] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    getPhoneLists().then(setLists).catch(() => {});
  }, []);

  useEffect(() => {
    if (smtpConfigs.length > 0 && !smtpId) {
      const def = smtpConfigs.find((c) => c.is_default) || smtpConfigs[0];
      setSmtpId(String(def.id));
    }
  }, [smtpConfigs, smtpId]);

  useEffect(() => {
    if (source !== 'leads' || !listId) { setRecipientCount(null); return; }
    emailApi.previewRecipients({ listId: parseInt(listId), statusFilter: statusFilter.length > 0 ? statusFilter : undefined })
      .then((r) => setRecipientCount(r.count)).catch(() => setRecipientCount(null));
  }, [source, listId, statusFilter]);

  const handleFileUpload = async (file) => {
    setUploadError('');
    setUploadedRows([]);
    setUploadedHeaders([]);
    setUploadFileName('');
    try {
      const { headers, emailColumn, rows } = await parseSheetFile(file);
      setUploadedHeaders(headers);
      setUploadedEmailCol(emailColumn);
      setUploadedRows(rows);
      setUploadFileName(file.name);
    } catch (err) {
      setUploadError(err.message || 'Failed to parse file');
    }
  };

  // Dynamic variables based on source
  const dynamicVars = source === 'upload' && uploadedHeaders.length > 0
    ? uploadedHeaders.map((h) => `{{${h}}}`)
    : DEFAULT_TEMPLATE_VARS;

  const currentRecipientCount = source === 'leads' ? recipientCount : uploadedRows.length;
  const canProceedStep1 = source === 'leads' ? (listId && recipientCount > 0) : (uploadedRows.length > 0);

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    try {
      const res = await emailApi.generateAiEmail({ context: aiPrompt, tone: aiTone });
      if (res.subject) setSubject(res.subject);
      if (res.body) setBody(res.body);
      setShowAi(false);
    } catch (err) {
      alert(err.response?.data?.error || 'AI generation failed');
    }
    setAiLoading(false);
  };

  const handleTestSend = async () => {
    if (!testTo || !smtpId) return;
    setTestSending(true);
    setTestResult(null);
    try {
      await emailApi.sendTestEmail({ smtpConfigId: parseInt(smtpId), to: testTo, subject: subject || '(Test) No subject', body: body || '<p>Test email body</p>' });
      setTestResult({ success: true });
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || 'Failed' });
    }
    setTestSending(false);
  };

  const handleCreate = async () => {
    if (!name || !subject || !smtpId) return alert('Please fill all required fields');
    if (source === 'leads' && !listId) return alert('Please select a lead sheet');
    if (source === 'upload' && uploadedRows.length === 0) return alert('Please upload a sheet');
    setCreating(true);
    try {
      const payload = {
        name,
        subject,
        body,
        smtp_config_id: parseInt(smtpId),
        delay_ms: delayMs,
      };
      if (source === 'leads') {
        payload.source_list_id = parseInt(listId);
        payload.status_filter = statusFilter.length > 0 ? statusFilter : null;
      } else {
        payload.recipients = uploadedRows;
      }
      const campaign = await emailApi.createCampaign(payload);
      onCreated(campaign);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create campaign');
    }
    setCreating(false);
  };

  const toggleStatus = (s) => {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  if (showTemplates) {
    return <TemplateManager onUseTemplate={(t) => { setSubject(t.subject); setBody(t.body); setShowTemplates(false); }} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold dark:text-white">New Campaign</h3>
        <button onClick={onBack} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">&larr; Back</button>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? 'bg-brand-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>

      {/* Step 1: Recipients */}
      {step === 1 && (
        <div className="space-y-4">
          <h4 className="font-medium dark:text-white">Step 1: Select Recipients</h4>

          {/* Source toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 w-fit">
            <button onClick={() => setSource('leads')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${source === 'leads' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              From Leads
            </button>
            <button onClick={() => setSource('upload')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${source === 'upload' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Upload Sheet
            </button>
          </div>

          {source === 'leads' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Lead Sheet</label>
                <select value={listId} onChange={(e) => setListId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Choose a list...</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.total_count} leads)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button key={s.value} onClick={() => toggleStatus(s.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${statusFilter.includes(s.value) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {source === 'upload' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Sheet (.xlsx, .csv, .txt)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-900/30 dark:file:text-brand-300 hover:file:bg-brand-100"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">The sheet must have a column with "email" in its header. All column names become template variables.</p>
              </div>
              {uploadError && (
                <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
              )}
              {uploadFileName && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-1.5">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{uploadFileName}</span> — {uploadedRows.length} recipients found
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Email column: <span className="font-medium text-brand-600 dark:text-brand-400">{uploadedEmailCol}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Columns:</span>
                    {uploadedHeaders.map((h) => (
                      <span key={h} className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-mono">{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {currentRecipientCount !== null && currentRecipientCount > 0 && (
            <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
              {currentRecipientCount} recipient{currentRecipientCount !== 1 ? 's' : ''} {source === 'leads' ? 'with email addresses found' : 'ready'}
            </p>
          )}
          <button onClick={() => setStep(2)} disabled={!canProceedStep1}
            className="px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50">
            Next: Compose Email
          </button>
        </div>
      )}

      {/* Step 2: Compose */}
      {step === 2 && (
        <div className="space-y-4">
          <h4 className="font-medium dark:text-white">Step 2: Compose Email</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trademark Renewal Q1"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowTemplates(true)} className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              Load Template
            </button>
            <button onClick={() => setShowAi(!showAi)} className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Generate with AI
            </button>
          </div>

          {showAi && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">AI Email Generator</p>
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3}
                placeholder="Describe what the email should be about..."
                className="w-full px-3 py-2 border border-purple-200 dark:border-purple-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="flex items-center gap-3">
                <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}
                  className="px-3 py-1.5 border border-purple-200 dark:border-purple-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent</option>
                  <option value="casual">Casual</option>
                </select>
                <button onClick={handleAiGenerate} disabled={aiLoading}
                  className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {aiLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          )}

          <VariableBar onInsert={(v) => setBody(body + v)} variables={dynamicVars} />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
            <ReactQuill theme="snow" value={body} onChange={setBody} modules={QUILL_MODULES}
              className="bg-white dark:bg-gray-700 rounded-lg [&_.ql-toolbar]:dark:bg-gray-600 [&_.ql-toolbar]:dark:border-gray-500 [&_.ql-container]:dark:border-gray-500 [&_.ql-editor]:dark:text-gray-100 [&_.ql-editor]:min-h-[200px]" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg">Back</button>
            <button onClick={() => setStep(3)} disabled={!subject || !body}
              className="px-6 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50">
              Next: Review & Send
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Settings & Review */}
      {step === 3 && (
        <div className="space-y-4">
          <h4 className="font-medium dark:text-white">Step 3: Review & Send</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Account</label>
            <select value={smtpId} onChange={(e) => setSmtpId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Select account...</option>
              {smtpConfigs.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.from_email})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delay Between Emails (seconds)</label>
            <input type="range" min={1} max={30} value={delayMs / 1000} onChange={(e) => setDelayMs(parseInt(e.target.value) * 1000)}
              className="w-full accent-brand-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{delayMs / 1000}s between each email ({Math.round(3600000 / delayMs)} emails/hour)</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Campaign Summary</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Name: {name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Recipients: {currentRecipientCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Subject: {subject}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Estimated time: ~{Math.ceil((currentRecipientCount || 0) * delayMs / 60000)} min</p>
          </div>

          {/* Test send */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Send Test Email</p>
            <div className="flex gap-2">
              <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email.com"
                className="flex-1 px-3 py-1.5 border border-blue-200 dark:border-blue-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handleTestSend} disabled={testSending}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {testSending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
            {testResult && (
              <p className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.success ? 'Test email sent!' : testResult.error}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg">Back</button>
            <button onClick={handleCreate} disabled={creating || !smtpId}
              className="flex-1 px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
              {creating ? 'Creating...' : 'Start Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignProgress({ campaign, onBack }) {
  const { socket } = useSocket();
  const [progress, setProgress] = useState({ current: 0, total: campaign.total_recipients || 0, sentCount: campaign.sent_count || 0, failedCount: campaign.failed_count || 0, currentEmail: '' });
  const [complete, setComplete] = useState(campaign.status === 'completed');
  const [logs, setLogs] = useState([]);
  const [showFailed, setShowFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [campaignData, setCampaignData] = useState(campaign);

  useEffect(() => {
    if (!socket) return;
    const handleProgress = (data) => {
      if (data.campaignId === campaign.id) {
        setProgress(data);
      }
    };
    const handleComplete = (data) => {
      if (data.campaignId === campaign.id) {
        setComplete(true);
        setProgress((p) => ({ ...p, sentCount: data.sentCount, failedCount: data.failedCount }));
      }
    };
    socket.on('email:progress', handleProgress);
    socket.on('email:complete', handleComplete);
    return () => {
      socket.off('email:progress', handleProgress);
      socket.off('email:complete', handleComplete);
    };
  }, [socket, campaign.id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await emailApi.startCampaign(campaign.id);
      setCampaignData((c) => ({ ...c, status: 'sending' }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start');
    }
    setStarting(false);
  };

  const loadFailedLogs = async () => {
    try {
      const data = await emailApi.getCampaignLogs(campaign.id, 'failed');
      setLogs(data);
      setShowFailed(true);
    } catch { }
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold dark:text-white">{campaignData.name}</h3>
        <button onClick={onBack} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">&larr; Back</button>
      </div>

      {campaignData.status === 'draft' && !complete && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-300 mb-4">Campaign is ready. Click to start sending.</p>
          <button onClick={handleStart} disabled={starting}
            className="px-8 py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
            {starting ? 'Starting...' : 'Start Sending'}
          </button>
        </div>
      )}

      {(campaignData.status === 'sending' || complete) && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {complete ? 'Complete' : 'Sending...'}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all duration-300 ${complete ? 'bg-green-500' : 'bg-brand-600'}`}
                style={{ width: `${pct}%` }} />
            </div>
            {!complete && progress.currentEmail && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Current: {progress.currentEmail}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{progress.current}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Processed</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{progress.sentCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{progress.failedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
            </div>
          </div>

          {/* Failed log */}
          {(complete || progress.failedCount > 0) && (
            <div>
              <button onClick={loadFailedLogs} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                {showFailed ? 'Hide' : 'View'} failed emails ({progress.failedCount})
              </button>
              {showFailed && logs.length > 0 && (
                <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {logs.map((l) => (
                    <div key={l.id} className="text-xs text-red-700 dark:text-red-300 py-1 border-b border-red-100 dark:border-red-800 last:border-0">
                      <span className="font-medium">{l.recipient_email}</span>: {l.error_message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inbox View ─────────────────────────────────────────────────────

const FOLDER_TABS = [
  { key: 'all', label: 'All Mail' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'sent', label: 'Sent' },
];

function Inbox() {
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailDetail, setEmailDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const searchTimerRef = useRef(null);
  const limit = 30;

  const fetchEmails = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const data = await emailApi.getInboxEmails({ folder, page: p, limit, search: s });
      setEmails(data.emails);
      setTotal(data.total);
      setPage(data.page);
    } catch { }
    setLoading(false);
  }, [folder]);

  useEffect(() => { fetchEmails(1, search); }, [folder]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await emailApi.syncInbox();
      await fetchEmails(1, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Sync failed. Make sure IMAP is configured in Settings.');
    }
    setSyncing(false);
  };

  const handleSearch = (val) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchEmails(1, val), 300);
  };

  const openEmail = async (email) => {
    setSelectedEmail(email);
    setDetailLoading(true);
    try {
      const detail = await emailApi.getEmailDetail(email.id);
      setEmailDetail(detail);
      // Update read status in list
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_read: true } : e));
    } catch { }
    setDetailLoading(false);
  };

  const totalPages = Math.ceil(total / limit);

  // Email detail view
  if (selectedEmail && emailDetail) {
    return (
      <div>
        <button onClick={() => { setSelectedEmail(null); setEmailDetail(null); }}
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-4 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to inbox
        </button>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{emailDetail.subject || '(No Subject)'}</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-semibold text-sm">
                  {(emailDetail.from_name || emailDetail.from_address || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {emailDetail.from_name || emailDetail.from_address}
                    {emailDetail.from_name && <span className="text-gray-500 dark:text-gray-400 font-normal ml-1.5">&lt;{emailDetail.from_address}&gt;</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    To: {emailDetail.to_address}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {new Date(emailDetail.email_date).toLocaleString()}
              </div>
            </div>
            {emailDetail.has_attachments && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Has attachments
              </div>
            )}
          </div>
          {/* Body */}
          <div className="p-5">
            {emailDetail.body_html ? (
              <div
                className="prose dark:prose-invert prose-sm max-w-none [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: emailDetail.body_html }}
              />
            ) : (
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">{emailDetail.body_text || '(No content)'}</pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Email list view
  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {FOLDER_TABS.map((f) => (
            <button key={f.key} onClick={() => setFolder(f.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${folder === f.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full sm:max-w-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search emails..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400" />
        </div>
        <button onClick={handleSync} disabled={syncing}
          className="px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Email list */}
      {loading ? (
        <p className="text-gray-500 text-sm py-8 text-center">Loading...</p>
      ) : emails.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No emails found. Click Sync to fetch your emails.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {emails.map((email) => (
            <button key={email.id} onClick={() => openEmail(email)}
              className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${!email.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold mt-0.5 ${
                email.folder === 'sent'
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300'
              }`}>
                {email.folder === 'sent'
                  ? (email.to_address?.[0] || '?').toUpperCase()
                  : (email.from_name?.[0] || email.from_address?.[0] || '?').toUpperCase()}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${!email.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                    {email.folder === 'sent'
                      ? `To: ${email.to_address}`
                      : (email.from_name || email.from_address)}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                    {formatEmailDate(email.email_date)}
                  </span>
                </div>
                <p className={`text-sm truncate ${!email.is_read ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                  {email.subject || '(No Subject)'}
                </p>
              </div>
              {/* Indicators */}
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                {!email.is_read && (
                  <span className="w-2 h-2 rounded-full bg-brand-600" />
                )}
                {email.has_attachments && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
                {email.folder === 'sent' && (
                  <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">Sent</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => fetchEmails(page - 1, search)} disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300">
            Prev
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
          <button onClick={() => fetchEmails(page + 1, search)} disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function formatEmailDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (now.getFullYear() === d.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Campaigns View ─────────────────────────────────────────────────

function CampaignsList({ onSelectCampaign, onNewCampaign }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    emailApi.getCampaigns().then(setCampaigns).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white">Campaigns</h3>
        <button onClick={onNewCampaign}
          className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">+ New Campaign</button>
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No campaigns yet. Create your first campaign to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const statusColors = {
              draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
              sending: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
              completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
              failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
            };
            return (
              <button key={c.id} onClick={() => onSelectCampaign(c)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.subject} &middot; {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{c.sent_count}/{c.total_recipients} sent</span>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[c.status] || statusColors.draft}`}>
                    {c.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'compose', label: 'Compose' },
  { key: 'templates', label: 'Templates' },
  { key: 'smtp', label: 'Settings' },
];

export default function PowerEmailPage() {
  const [view, setView] = useState('inbox');
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setSmtpConfigs(await emailApi.getSmtpConfigs());
    } catch { }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const goToInbox = () => { setView('inbox'); };

  const activeNav = view === 'campaign-new' || view === 'campaign-progress' ? 'campaigns' : view;

  const renderContent = () => {
    if (view === 'inbox') return <Inbox />;
    if (view === 'smtp') return <SmtpSettings />;
    if (view === 'templates') return <TemplateManager />;
    if (view === 'compose') return <ComposeEmail smtpConfigs={smtpConfigs} onBack={goToInbox} />;
    if (view === 'campaigns') {
      return (
        <CampaignsList
          onSelectCampaign={(c) => { setSelectedCampaign(c); setView('campaign-progress'); }}
          onNewCampaign={() => setView('campaign-new')}
        />
      );
    }
    if (view === 'campaign-new') {
      return (
        <CampaignBuilder
          smtpConfigs={smtpConfigs}
          onBack={() => setView('campaigns')}
          onCreated={(campaign) => { setSelectedCampaign(campaign); setView('campaign-progress'); }}
        />
      );
    }
    if (view === 'campaign-progress' && selectedCampaign) {
      return <CampaignProgress campaign={selectedCampaign} onBack={() => setView('campaigns')} />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed top nav */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto py-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mr-4 whitespace-nowrap">Power Email</h2>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeNav === item.key
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
