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

function SmtpSettings({ onConfigsChanged }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null = list view, 'new' = add form, number = edit form
  const [form, setForm] = useState({ label: '', host: '', port: 587, secure: false, username: '', password: '', from_email: '', from_name: '', is_default: true, imap_host: '', imap_port: 993, imap_secure: true });
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try { setConfigs(await emailApi.getSmtpConfigs()); } catch { setConfigs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const startAdd = () => {
    setForm({ label: '', host: '', port: 587, secure: false, username: '', password: '', from_email: '', from_name: '', is_default: true, imap_host: '', imap_port: 993, imap_secure: true });
    setEditingId('new');
  };

  const startAddGoogle = () => {
    setForm({ label: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true, username: '', password: '', from_email: '', from_name: '', is_default: true, imap_host: 'imap.gmail.com', imap_port: 993, imap_secure: true });
    setEditingId('new-google');
  };

  const startEdit = (cfg) => {
    setForm({ ...cfg, password: '' });
    setEditingId(cfg.id);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId === 'new' || editingId === 'new-google') {
        await emailApi.saveSmtpConfig(form);
      } else {
        await emailApi.updateSmtpConfig(editingId, form);
      }
      setEditingId(null);
      fetchConfigs();
      if (onConfigsChanged) onConfigsChanged();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleTest = async (id) => {
    setTestingId(id);
    setTestResults((prev) => ({ ...prev, [id]: null }));
    try {
      await emailApi.testSmtpConnection(id);
      setTestResults((prev) => ({ ...prev, [id]: { success: true } }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [id]: { success: false, error: err.response?.data?.error || 'Connection failed' } }));
    }
    setTestingId(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await emailApi.deleteSmtpConfig(deleteConfirm);
      setDeleteConfirm(null);
      fetchConfigs();
      if (onConfigsChanged) onConfigsChanged();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
    setDeleting(false);
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading...</p>;

  // Edit / Add form
  if (editingId !== null) {
    const isNew = editingId === 'new' || editingId === 'new-google';
    const isGoogle = editingId === 'new-google' || (form.host === 'smtp.gmail.com');
    return (
      <div className="max-w-lg mx-auto">
        <h3 className="text-base font-semibold mb-4 dark:text-white flex items-center gap-2">
          {isNew ? (isGoogle ? (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Add Google Account
            </>
          ) : 'Add SMTP Account') : 'Edit Account'}
        </h3>

        {isGoogle && isNew && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              SMTP & IMAP settings are pre-filled for Gmail. Enter your Gmail address and <strong>App Password</strong>.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              To generate an App Password: Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Outgoing (SMTP)</p>
          {[
            { key: 'label', label: 'Label', placeholder: isGoogle ? 'e.g. My Gmail' : 'e.g. Work Email' },
            { key: 'host', label: 'SMTP Host', placeholder: 'smtp.gmail.com', hidden: isGoogle && isNew },
            { key: 'port', label: 'SMTP Port', type: 'number', hidden: isGoogle && isNew },
            { key: 'username', label: isGoogle ? 'Gmail Address' : 'Username / Email', placeholder: isGoogle ? 'you@gmail.com' : '' },
            { key: 'password', label: isGoogle ? 'App Password' : 'Password', type: 'password', placeholder: !isNew ? '(leave blank to keep current)' : (isGoogle ? '16-character app password' : '') },
            { key: 'from_email', label: 'From Email', placeholder: isGoogle ? 'you@gmail.com' : '' },
            { key: 'from_name', label: 'From Name' },
          ].filter(f => !f.hidden).map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={form[key] || ''}
                onChange={(e) => {
                  const val = type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
                  const updates = { [key]: val };
                  // Auto-fill from_email when typing username for Google
                  if (isGoogle && key === 'username') updates.from_email = e.target.value;
                  setForm({ ...form, ...updates });
                }}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
          {!(isGoogle && isNew) && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} className="rounded" />
              Use TLS/SSL (SMTP)
            </label>
          )}

          {!(isGoogle && isNew) && (
            <>
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
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold dark:text-white">Email Accounts</h3>
        <div className="flex items-center gap-2">
          <button onClick={startAddGoogle}
            className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            + Google
          </button>
          <button onClick={startAdd} className="px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700">+ SMTP</button>
        </div>
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No email accounts configured yet.</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={startAddGoogle}
              className="px-4 py-2.5 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-2 shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Add Google Account
            </button>
            <button onClick={startAdd} className="px-4 py-2.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
              or add SMTP manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <div key={cfg.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">{cfg.label || 'SMTP Account'}</p>
                  {cfg.host === 'smtp.gmail.com' ? (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">SMTP</span>
                  )}
                </div>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium">Configured</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">SMTP Host</p>
                  <p className="font-medium text-gray-900 dark:text-white">{`${cfg.host}:${cfg.port}`}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">SMTP Security</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cfg.secure ? 'TLS/SSL' : 'STARTTLS'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Username</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cfg.username}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">From</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">IMAP Host</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cfg.imap_host ? `${cfg.imap_host}:${cfg.imap_port}` : <span className="text-yellow-600 dark:text-yellow-400">Not configured</span>}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">IMAP Security</p>
                  <p className="font-medium text-gray-900 dark:text-white">{cfg.imap_host ? (cfg.imap_secure ? 'TLS/SSL' : 'None') : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {testResults[cfg.id] && (
                  <span className={`text-xs font-medium mr-auto ${testResults[cfg.id].success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults[cfg.id].success ? 'Connection successful!' : testResults[cfg.id].error}
                  </span>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => handleTest(cfg.id)} disabled={testingId === cfg.id}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50">
                    {testingId === cfg.id ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button onClick={() => startEdit(cfg)}
                    className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700">Edit</button>
                  <button onClick={() => setDeleteConfirm(cfg.id)}
                    className="px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Email Account</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">Are you sure you want to delete this email account? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
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
        <h3 className="text-base font-semibold mb-4 dark:text-white">{editing === 'new' ? 'Create Template' : 'Edit Template'}</h3>
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
          <VariableBar onInsert={(v) => setForm({ ...form, body: form.body + v })} variables={DEFAULT_TEMPLATE_VARS} />
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
        <h3 className="text-base font-semibold dark:text-white">Email Templates</h3>
        <button onClick={() => { setForm({ name: '', subject: '', body: '' }); setEditing('new'); }}
          className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">+ New Template</button>
      </div>
      {loading ? <p className="text-gray-500 text-sm">Loading...</p> : templates.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No templates yet. Create one to speed up your email campaigns.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
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
  const vars = variables && variables.length > 0 ? variables : [];
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
  const [cc, setCc] = useState('');
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
      if (cc.trim()) fd.append('cc', cc.trim());
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
        <h3 className="text-base font-semibold dark:text-white">Compose Email</h3>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CC</label>
          <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com (separate multiple with commas)"
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
  const [leadSheetColumns, setLeadSheetColumns] = useState([]);
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
    if (source !== 'leads' || !listId) { setRecipientCount(null); setLeadSheetColumns([]); return; }
    emailApi.previewRecipients({ listId: parseInt(listId), statusFilter: statusFilter.length > 0 ? statusFilter : undefined })
      .then((r) => setRecipientCount(r.count)).catch(() => setRecipientCount(null));
    emailApi.getListColumns(parseInt(listId))
      .then((r) => setLeadSheetColumns(r.columns || []))
      .catch(() => setLeadSheetColumns([]));
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

  // Dynamic variables based on source — only show when a sheet is selected/uploaded
  const dynamicVars = source === 'upload' && uploadedHeaders.length > 0
    ? uploadedHeaders.map((h) => `{{${h}}}`)
    : source === 'leads' && leadSheetColumns.length > 0
      ? leadSheetColumns.map((c) => `{{${c}}}`)
      : [];

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
        <h3 className="text-base font-semibold dark:text-white">New Campaign</h3>
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

          {dynamicVars.length > 0 && <VariableBar onInsert={(v) => setBody(body + v)} variables={dynamicVars} />}

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

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
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
        <h3 className="text-base font-semibold dark:text-white">{campaignData.name}</h3>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
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
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{progress.current}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Processed</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
              <p className="text-xl font-semibold text-green-600">{progress.sentCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
              <p className="text-xl font-semibold text-red-600">{progress.failedCount}</p>
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

// ─── Thread Message (collapsible) ────────────────────────────────────

function ThreadMessage({ msg, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`${open ? '' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
      <div className="px-5 py-3 flex items-start gap-3" onClick={() => !open && setOpen(true)}>
        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex-shrink-0 flex items-center justify-center text-brand-700 dark:text-brand-300 font-semibold text-xs mt-0.5">
          {(msg.from_name || msg.from_address || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {msg.from_name || msg.from_address}
              {msg.folder === 'sent' && <span className="ml-1.5 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1 py-0.5 rounded">Sent</span>}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(msg.email_date).toLocaleString()}</span>
              {open && (
                <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {!open && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              To: {msg.to_address}
              {msg.body_text ? ` — ${msg.body_text.slice(0, 100)}` : ''}
            </p>
          )}
          {open && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              To: {msg.to_address}{msg.cc_address ? ` | CC: ${msg.cc_address}` : ''}
            </p>
          )}
        </div>
      </div>
      {open && (
        <div className="px-5 pb-4 pl-16">
          {msg.body_html ? (
            <div className="prose dark:prose-invert prose-sm max-w-none [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: msg.body_html }} />
          ) : (
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">{msg.body_text || '(No content)'}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inbox View (3-panel Thunderbird-style) ─────────────────────────

function Inbox() {
  // Account & folder state
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null); // null = all accounts
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [syncing, setSyncing] = useState(false);

  // Email list state
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const searchTimerRef = useRef(null);
  const limit = 30;

  // Detail state
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [emailDetail, setEmailDetail] = useState(null);
  const [thread, setThread] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reply / Forward state
  const [replyMode, setReplyMode] = useState(null); // 'reply' | 'forward' | null
  const [replyTo, setReplyTo] = useState('');
  const [replyCC, setReplyCC] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Mobile panel state
  const [mobilePanel, setMobilePanel] = useState('sidebar'); // 'sidebar' | 'list' | 'detail'

  // Fetch SMTP configs
  const fetchConfigs = useCallback(async () => {
    try {
      const cfgs = await emailApi.getSmtpConfigs();
      setSmtpConfigs(cfgs);
      // Auto-expand all accounts
      const expanded = {};
      cfgs.forEach((c) => { expanded[c.id] = true; });
      setExpandedAccounts(expanded);
    } catch { }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // Fetch emails
  const fetchEmails = useCallback(async (p = 1, s = search) => {
    setLoading(true);
    try {
      const data = await emailApi.getInboxEmails({
        folder: selectedFolder,
        page: p,
        limit,
        search: s,
        smtpConfigId: selectedAccountId || undefined,
      });
      setEmails(data.emails);
      setTotal(data.total);
      setPage(data.page);
    } catch { }
    setLoading(false);
  }, [selectedFolder, selectedAccountId]);

  useEffect(() => { fetchEmails(1, search); }, [selectedFolder, selectedAccountId]);

  // Sync
  const handleSync = async () => {
    setSyncing(true);
    try {
      await emailApi.syncInbox(selectedAccountId || undefined);
      await fetchEmails(1, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Sync failed. Make sure IMAP is configured in Settings.');
    }
    setSyncing(false);
  };

  // Search
  const handleSearch = (val) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchEmails(1, val), 300);
  };

  // Open email detail
  const openEmail = async (email) => {
    setSelectedEmailId(email.id);
    setReplyMode(null);
    setDetailLoading(true);
    setMobilePanel('detail');
    try {
      const [detail, threadData] = await Promise.all([
        emailApi.getEmailDetail(email.id),
        emailApi.getEmailThread(email.id),
      ]);
      setEmailDetail(detail);
      setThread(threadData);
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_read: true } : e));
    } catch { }
    setDetailLoading(false);
  };

  // Reply
  const startReply = () => {
    if (!emailDetail) return;
    setReplyMode('reply');
    setReplyTo(emailDetail.folder === 'sent' ? emailDetail.to_address : emailDetail.from_address);
    setReplyCC('');
    setReplyBody('');
  };

  // Forward
  const startForward = () => {
    setReplyMode('forward');
    setReplyTo('');
    setReplyCC('');
    setReplyBody('');
  };

  // Send reply/forward
  const handleSendReply = async () => {
    if (!emailDetail) return;
    setSending(true);
    try {
      if (replyMode === 'reply') {
        await emailApi.replyToEmail(emailDetail.id, { body: replyBody, cc: replyCC || undefined });
      } else {
        await emailApi.forwardEmail(emailDetail.id, { to: replyTo, cc: replyCC || undefined, body: replyBody });
      }
      setReplyMode(null);
      setReplyBody('');
      fetchEmails(page, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send');
    }
    setSending(false);
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await emailApi.deleteEmail(deleteConfirm);
      if (selectedEmailId === deleteConfirm) {
        setSelectedEmailId(null);
        setEmailDetail(null);
        setThread([]);
        setMobilePanel('list');
      }
      setDeleteConfirm(null);
      fetchEmails(page, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
    setDeleting(false);
  };

  // Select account + folder from sidebar
  const selectAccountFolder = (accountId, folder) => {
    setSelectedAccountId(accountId);
    setSelectedFolder(folder);
    setSelectedEmailId(null);
    setEmailDetail(null);
    setThread([]);
    setReplyMode(null);
    setPage(1);
    setMobilePanel('list');
  };

  const toggleAccount = (id) => {
    setExpandedAccounts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPages = Math.ceil(total / limit);

  // ─── Left Sidebar (Accounts + Folders) ───
  const renderSidebar = () => (
    <div className={`w-full lg:w-56 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700 flex flex-col ${mobilePanel !== 'sidebar' ? 'hidden lg:flex' : 'flex'}`}>
      {/* Sync button */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <button onClick={handleSync} disabled={syncing}
          className="w-full px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* All Accounts */}
        <button
          onClick={() => selectAccountFolder(null, 'all')}
          className={`w-full px-3 py-2 text-sm rounded-lg text-left flex items-center gap-2 transition-colors ${
            selectedAccountId === null && selectedFolder === 'all'
              ? 'bg-brand-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="truncate font-medium">All Accounts</span>
        </button>

        {/* Per-account sections */}
        {smtpConfigs.map((cfg) => (
          <div key={cfg.id}>
            {/* Account header */}
            <button
              onClick={() => toggleAccount(cfg.id)}
              className="w-full px-3 py-2 text-sm rounded-lg text-left flex items-center gap-2 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 flex-shrink-0 transition-transform ${expandedAccounts[cfg.id] ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
              <span className="truncate font-medium">{cfg.label || cfg.from_email}</span>
            </button>

            {/* Folder items */}
            {expandedAccounts[cfg.id] && (
              <div className="ml-4 space-y-0.5">
                <button
                  onClick={() => selectAccountFolder(cfg.id, 'inbox')}
                  className={`w-full px-3 py-1.5 text-xs rounded-md text-left flex items-center gap-2 transition-colors ${
                    selectedAccountId === cfg.id && selectedFolder === 'inbox'
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
                  </svg>
                  Inbox
                </button>
                <button
                  onClick={() => selectAccountFolder(cfg.id, 'sent')}
                  className={`w-full px-3 py-1.5 text-xs rounded-md text-left flex items-center gap-2 transition-colors ${
                    selectedAccountId === cfg.id && selectedFolder === 'sent'
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Sent
                </button>
              </div>
            )}
          </div>
        ))}

        {smtpConfigs.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-4 text-center">No email accounts configured. Go to Settings to add one.</p>
        )}
      </div>
    </div>
  );

  // ─── Middle Panel (Email List) ───
  const renderEmailList = () => (
    <div className={`w-full lg:w-80 xl:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900 ${mobilePanel !== 'list' && mobilePanel !== 'sidebar' ? 'hidden lg:flex' : mobilePanel === 'sidebar' ? 'hidden lg:flex' : 'flex'}`}>
      {/* Search + folder label */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={() => setMobilePanel('sidebar')} className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate capitalize">
              {selectedAccountId ? (smtpConfigs.find((c) => c.id === selectedAccountId)?.label || smtpConfigs.find((c) => c.id === selectedAccountId)?.from_email || 'Account') : 'All Accounts'}
              {' '}<span className="font-normal text-gray-500 dark:text-gray-400">/ {selectedFolder === 'all' ? 'All Mail' : selectedFolder}</span>
            </h4>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{total}</span>
        </div>
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500" />
        </div>
      </div>

      {/* Email rows */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-gray-500 text-xs py-8 text-center">Loading...</p>
        ) : emails.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 dark:text-gray-500 text-xs">No emails found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {emails.map((email) => (
              <button key={email.id} onClick={() => openEmail(email)}
                className={`w-full px-3 py-2.5 text-left transition-colors ${
                  selectedEmailId === email.id
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-brand-600'
                    : !email.is_read
                      ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent'
                }`}>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`text-xs truncate ${!email.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                    {email.folder === 'sent'
                      ? `To: ${email.to_address}`
                      : (email.from_name || email.from_address)}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                    {formatEmailDate(email.email_date)}
                  </span>
                </div>
                <p className={`text-xs truncate ${!email.is_read ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}`}>
                  {email.subject || '(No Subject)'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {!email.is_read && <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />}
                  {email.has_attachments && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                  {email.folder === 'sent' && (
                    <span className="text-[9px] font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1 py-0.5 rounded">Sent</span>
                  )}
                  {email.open_count > 0 && (
                    <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1 py-0.5 rounded flex items-center gap-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {email.open_count}
                    </span>
                  )}
                  {email.click_count > 0 && (
                    <span className="text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded flex items-center gap-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                      </svg>
                      {email.click_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => fetchEmails(page - 1, search)} disabled={page <= 1}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-400">
            Prev
          </button>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{page}/{totalPages}</span>
          <button onClick={() => fetchEmails(page + 1, search)} disabled={page >= totalPages}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-400">
            Next
          </button>
        </div>
      )}
    </div>
  );

  // ─── Right Panel (Email Detail + Reply) ───
  const renderDetail = () => (
    <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 min-w-0 ${mobilePanel !== 'detail' ? 'hidden lg:flex' : 'flex'}`}>
      {detailLoading ? (
        <div className="flex-1 flex items-center justify-center"><p className="text-gray-400 text-sm">Loading...</p></div>
      ) : !emailDetail ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Select an email to read</p>
        </div>
      ) : (
        <>
          {/* Action bar */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button onClick={() => { setMobilePanel('list'); setSelectedEmailId(null); setEmailDetail(null); setThread([]); setReplyMode(null); }}
              className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={startReply} className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply
            </button>
            <button onClick={startForward} className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Forward
            </button>
            <button onClick={() => setDeleteConfirm(emailDetail.id)} className="px-3 py-1.5 text-xs font-medium border border-red-200 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-1.5 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>

          {/* Subject header */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{emailDetail.subject || '(No Subject)'}</h3>
              {thread.length > 1 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{thread.length} messages</span>
              )}
            </div>
          </div>

          {/* Tracking stats for sent emails */}
          {emailDetail.folder === 'sent' && <EmailTrackingStats emailId={emailDetail.id} />}

          {/* Thread / Body */}
          <div className="flex-1 overflow-y-auto">
            {thread.length > 1 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {thread.map((msg, idx) => {
                  const isLast = idx === thread.length - 1;
                  const isSelected = msg.id === emailDetail.id;
                  return (
                    <ThreadMessage key={msg.id} msg={msg} defaultOpen={isLast || isSelected} />
                  );
                })}
              </div>
            ) : (
              <>
                {/* Single email header */}
                <div className="px-5 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900 flex-shrink-0 flex items-center justify-center text-brand-700 dark:text-brand-300 font-semibold text-sm">
                        {(emailDetail.from_name || emailDetail.from_address || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {emailDetail.from_name || emailDetail.from_address}
                          {emailDetail.from_name && <span className="text-gray-500 dark:text-gray-400 font-normal ml-1.5 text-xs">&lt;{emailDetail.from_address}&gt;</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">To: {emailDetail.to_address}</p>
                        {emailDetail.cc_address && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">CC: {emailDetail.cc_address}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">{new Date(emailDetail.email_date).toLocaleString()}</span>
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
                {/* Single email body */}
                <div className="px-5 py-4">
                  {emailDetail.body_html ? (
                    <div className="prose dark:prose-invert prose-sm max-w-none [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: emailDetail.body_html }} />
                  ) : (
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">{emailDetail.body_text || '(No content)'}</pre>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Reply / Forward composer */}
          {replyMode && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {replyMode === 'reply' ? 'Reply' : 'Forward'}
                </h4>
                <button onClick={() => setReplyMode(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Cancel</button>
              </div>

              {/* To field */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                <input type="text" value={replyTo} onChange={(e) => setReplyTo(e.target.value)}
                  readOnly={replyMode === 'reply'}
                  placeholder="recipient@example.com"
                  className={`w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${replyMode === 'reply' ? 'bg-gray-100 dark:bg-gray-600 cursor-default' : ''}`} />
              </div>

              {/* CC field */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CC</label>
                <input type="text" value={replyCC} onChange={(e) => setReplyCC(e.target.value)}
                  placeholder="cc@example.com (separate multiple with commas)"
                  className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>

              {/* Body */}
              <div className="[&_.ql-container]:max-h-40 [&_.ql-editor]:min-h-[80px]">
                <ReactQuill theme="snow" value={replyBody} onChange={setReplyBody} modules={QUILL_MODULES} placeholder="Write your message..." />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSendReply} disabled={sending || (replyMode === 'forward' && !replyTo)}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="flex h-[calc(100vh-120px)] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        {renderSidebar()}
        {renderEmailList()}
        {renderDetail()}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Email</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">Are you sure you want to delete this email? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
        <h3 className="text-base font-semibold dark:text-white">Campaigns</h3>
        <button onClick={onNewCampaign}
          className="px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">+ New Campaign</button>
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : campaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
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
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
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

// ─── Email Tracking Badge (shown on email detail) ───────────────────

function EmailTrackingStats({ emailId }) {
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!emailId) return;
    emailApi.getEmailTrackingStats(emailId).then(setStats).catch(() => {});
  }, [emailId]);

  // Real-time updates
  useEffect(() => {
    if (!socket || !emailId) return;
    const handler = (data) => {
      if (data.event?.email_id === emailId) {
        // Refresh stats
        emailApi.getEmailTrackingStats(emailId).then(setStats).catch(() => {});
      }
    };
    socket.on('email:tracking', handler);
    return () => socket.off('email:tracking', handler);
  }, [socket, emailId]);

  if (!stats || (stats.open_count === 0 && stats.click_count === 0)) return null;

  return (
    <div className="mx-5 my-2">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {stats.open_count > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-medium text-green-700 dark:text-green-400">Opened {stats.open_count}x</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.first_opened_at && `First: ${new Date(stats.first_opened_at).toLocaleString()}`}
                </span>
              </div>
            )}
            {stats.click_count > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span className="font-medium text-blue-700 dark:text-blue-400">Clicked {stats.click_count}x</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.first_clicked_at && `First: ${new Date(stats.first_clicked_at).toLocaleString()}`}
                </span>
              </div>
            )}
          </div>
          {stats.events?.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-amber-700 dark:text-amber-400 hover:underline">
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
        </div>
        {expanded && stats.events?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700 max-h-40 overflow-y-auto space-y-1">
            {stats.events.map((ev) => (
              <div key={ev.id || ev.created_at} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.event_type === 'open' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="font-medium">{ev.event_type === 'open' ? 'Opened' : 'Clicked'}</span>
                {ev.link_url && <span className="truncate text-gray-400 dark:text-gray-500">{ev.link_url}</span>}
                <span className="ml-auto whitespace-nowrap text-gray-400 dark:text-gray-500">{new Date(ev.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notifications View ─────────────────────────────────────────────

function Notifications() {
  const { socket } = useSocket();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await emailApi.getTrackingEvents({ page: p, limit });
      setEvents(data.events);
      setTotal(data.total);
      setPage(data.page);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Real-time: prepend new events
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      const ev = data.event;
      if (!ev) return;
      setEvents((prev) => [{ ...ev, email_subject: ev.email_subject || '', to_address: ev.recipient_email }, ...prev.slice(0, limit - 1)]);
      setTotal((t) => t + 1);
    };
    socket.on('email:tracking', handler);
    return () => socket.off('email:tracking', handler);
  }, [socket]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold dark:text-white">Email Notifications</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total} events</span>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm py-8 text-center">Loading...</p>
      ) : events.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No tracking events yet.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">You'll see notifications here when recipients open your emails or click links.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev, idx) => (
            <div key={ev.id || idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start gap-3">
              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                ev.event_type === 'open'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}>
                {ev.event_type === 'open' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  <span className="font-semibold">{ev.recipient_email}</span>
                  {' '}
                  {ev.event_type === 'open' ? 'opened your email' : 'clicked a link'}
                </p>
                {ev.email_subject && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    Subject: {ev.email_subject}
                  </p>
                )}
                {ev.event_type === 'click' && ev.link_url && (
                  <p className="text-xs text-blue-500 dark:text-blue-400 truncate mt-0.5">
                    {ev.link_url}
                  </p>
                )}
              </div>
              {/* Timestamp */}
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                {formatTrackingDate(ev.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => fetchEvents(page - 1)} disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-400">
            Prev
          </button>
          <span className="text-sm text-gray-400 dark:text-gray-500">{page}/{totalPages}</span>
          <button onClick={() => fetchEvents(page + 1)} disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-400">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function formatTrackingDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Main Page ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'compose', label: 'Compose' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'templates', label: 'Templates' },
  { key: 'smtp', label: 'Settings' },
];

export default function PowerEmailPage() {
  const [view, setView] = useState('inbox');
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [notifBadge, setNotifBadge] = useState(0);
  const { socket } = useSocket();

  const fetchConfigs = useCallback(async () => {
    try {
      setSmtpConfigs(await emailApi.getSmtpConfigs());
    } catch { }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // Real-time tracking notification badge
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      // Only increment badge if not currently on the notifications tab
      setNotifBadge((prev) => prev + 1);
    };
    socket.on('email:tracking', handler);
    return () => socket.off('email:tracking', handler);
  }, [socket]);

  // Clear badge when visiting notifications
  useEffect(() => {
    if (view === 'notifications') setNotifBadge(0);
  }, [view]);

  const goToInbox = () => { setView('inbox'); };

  const activeNav = view === 'campaign-new' || view === 'campaign-progress' ? 'campaigns' : view;

  // Track which tabs have been visited so we mount them lazily but keep them alive
  const [mountedTabs, setMountedTabs] = useState({ inbox: true });
  useEffect(() => {
    setMountedTabs((prev) => ({ ...prev, [view]: true }));
  }, [view]);

  const isCampaignSub = view === 'campaign-new' || view === 'campaign-progress';

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
                className={`relative px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeNav === item.key
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
                {item.key === 'notifications' && notifBadge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {notifBadge > 99 ? '99+' : notifBadge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Persistent tab panels — mounted once visited, hidden when inactive */}
      <div className={`flex-1 overflow-hidden p-4 sm:p-4 ${view === 'inbox' ? '' : 'hidden'}`}>
        <div className="h-full">
          {mountedTabs.inbox && <Inbox />}
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${view === 'smtp' ? '' : 'hidden'}`}>
        <div className="max-w-5xl mx-auto">
          {mountedTabs.smtp && <SmtpSettings onConfigsChanged={fetchConfigs} />}
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${view === 'templates' ? '' : 'hidden'}`}>
        <div className="max-w-5xl mx-auto">
          {mountedTabs.templates && <TemplateManager />}
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${view === 'compose' ? '' : 'hidden'}`}>
        <div className="max-w-5xl mx-auto">
          {mountedTabs.compose && <ComposeEmail smtpConfigs={smtpConfigs} onBack={goToInbox} />}
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${view === 'notifications' ? '' : 'hidden'}`}>
        <div className="max-w-5xl mx-auto">
          {mountedTabs.notifications && <Notifications />}
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${view === 'campaigns' && !isCampaignSub ? '' : 'hidden'}`}>
        <div className="max-w-5xl mx-auto">
          {mountedTabs.campaigns && (
            <CampaignsList
              onSelectCampaign={(c) => { setSelectedCampaign(c); setView('campaign-progress'); }}
              onNewCampaign={() => setView('campaign-new')}
            />
          )}
        </div>
      </div>
      {/* Campaign sub-views are transient — they unmount when you leave */}
      {view === 'campaign-new' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto">
            <CampaignBuilder
              smtpConfigs={smtpConfigs}
              onBack={() => setView('campaigns')}
              onCreated={(campaign) => { setSelectedCampaign(campaign); setView('campaign-progress'); }}
            />
          </div>
        </div>
      )}
      {view === 'campaign-progress' && selectedCampaign && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto">
            <CampaignProgress campaign={selectedCampaign} onBack={() => setView('campaigns')} />
          </div>
        </div>
      )}
    </div>
  );
}
