import { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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

const TEMPLATE_VARS = [
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
  const [form, setForm] = useState({ label: '', host: '', port: 587, secure: false, username: '', password: '', from_email: '', from_name: '', is_default: true });
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
      setForm({ label: '', host: '', port: 587, secure: false, username: '', password: '', from_email: '', from_name: '', is_default: true });
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
          {[
            { key: 'label', label: 'Label', placeholder: 'e.g. Work Gmail' },
            { key: 'host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
            { key: 'port', label: 'Port', type: 'number' },
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
            Use TLS/SSL
          </label>
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
              <p className="text-gray-500 dark:text-gray-400">Host</p>
              <p className="font-medium text-gray-900 dark:text-white">{config.host}:{config.port}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Security</p>
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

function VariableBar({ onInsert }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-xs text-gray-500 dark:text-gray-400 self-center mr-1">Variables:</span>
      {TEMPLATE_VARS.map((v) => (
        <button key={v} onClick={() => onInsert(v)} type="button"
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-mono">
          {v}
        </button>
      ))}
    </div>
  );
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
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [recipientCount, setRecipientCount] = useState(null);
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
    if (!listId) { setRecipientCount(null); return; }
    emailApi.previewRecipients({ listId: parseInt(listId), statusFilter: statusFilter.length > 0 ? statusFilter : undefined })
      .then((r) => setRecipientCount(r.count)).catch(() => setRecipientCount(null));
  }, [listId, statusFilter]);

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
    if (!name || !subject || !smtpId || !listId) return alert('Please fill all required fields');
    setCreating(true);
    try {
      const campaign = await emailApi.createCampaign({
        name,
        subject,
        body,
        smtp_config_id: parseInt(smtpId),
        delay_ms: delayMs,
        source_list_id: parseInt(listId),
        status_filter: statusFilter.length > 0 ? statusFilter : null,
      });
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
          {recipientCount !== null && (
            <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''} with email addresses found
            </p>
          )}
          <button onClick={() => setStep(2)} disabled={!listId || recipientCount === 0}
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

          <VariableBar onInsert={(v) => setBody(body + v)} />

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
            <p className="text-sm text-gray-600 dark:text-gray-300">Recipients: {recipientCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Subject: {subject}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Estimated time: ~{Math.ceil((recipientCount || 0) * delayMs / 60000)} min</p>
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

// ─── Main Page ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'campaign-new', label: 'New Campaign' },
  { key: 'compose', label: 'Compose' },
  { key: 'templates', label: 'Templates' },
  { key: 'smtp', label: 'Settings' },
];

export default function PowerEmailPage() {
  const [view, setView] = useState('dashboard');
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, camps] = await Promise.all([
        emailApi.getSmtpConfigs(),
        emailApi.getCampaigns(),
      ]);
      setSmtpConfigs(configs);
      setCampaigns(camps);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const goToDashboard = () => { setView('dashboard'); fetchData(); };

  const activeNav = view === 'campaign-progress' ? 'dashboard' : view;

  const renderContent = () => {
    if (view === 'dashboard') {
      return (
        <>
          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <button onClick={() => setView('campaign-new')}
              className="bg-brand-600 text-white rounded-xl p-4 text-left hover:bg-brand-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold">New Campaign</p>
            </button>
            <button onClick={() => setView('compose')}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Compose Email</p>
            </button>
            <button onClick={() => setView('smtp')}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">SMTP Settings</p>
            </button>
            <button onClick={() => setView('templates')}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Templates</p>
            </button>
          </div>

          {/* Campaigns list */}
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Recent Campaigns</h3>
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
                  <button key={c.id} onClick={() => { setSelectedCampaign(c); setView('campaign-progress'); }}
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
        </>
      );
    }

    if (view === 'smtp') return <SmtpSettings />;
    if (view === 'templates') return <TemplateManager />;
    if (view === 'compose') return <ComposeEmail smtpConfigs={smtpConfigs} onBack={goToDashboard} />;
    if (view === 'campaign-new') {
      return (
        <CampaignBuilder
          smtpConfigs={smtpConfigs}
          onBack={goToDashboard}
          onCreated={(campaign) => { setSelectedCampaign(campaign); setView('campaign-progress'); }}
        />
      );
    }
    if (view === 'campaign-progress' && selectedCampaign) {
      return <CampaignProgress campaign={selectedCampaign} onBack={goToDashboard} />;
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
                onClick={() => { if (item.key === 'dashboard') goToDashboard(); else setView(item.key); }}
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
