import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getMyProfile, updateMyProfile } from '../api/agents';

export default function AgentProfilePage() {
  const { updateAgent } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    department: '',
    bio: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        setProfile(data);
        setForm({
          displayName: data.display_name || '',
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
          bio: data.bio || '',
        });
      } catch (err) {
        console.error('Failed to load profile:', err);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const updated = await updateMyProfile(form);
      setProfile(updated);
      updateAgent({ displayName: updated.display_name });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
          <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded w-32 mb-5" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded w-24 mb-2" />
                <div className="h-9 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">My Profile</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSave} className="space-y-4">
          {[
            { field: 'displayName', label: 'Display Name', type: 'text', required: true },
            { field: 'email', label: 'Email', type: 'email', placeholder: 'agent@company.com' },
            { field: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
            { field: 'department', label: 'Department', type: 'text', placeholder: 'Sales' },
          ].map(({ field, label, type, placeholder, required }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={handleChange(field)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100"
                placeholder={placeholder}
                required={required}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={handleChange('bio')}
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
              placeholder="A short bio about yourself..."
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {success && (
              <span className="text-sm text-green-600 dark:text-green-400">Profile updated!</span>
            )}
          </div>
        </form>
      </div>

      {profile?.created_at && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Account Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400 dark:text-gray-500">Username</span>
              <span className="text-gray-700 dark:text-gray-200 font-medium">{profile.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 dark:text-gray-500">Twilio Identity</span>
              <span className="text-gray-700 dark:text-gray-200 font-medium font-mono text-xs">{profile.twilio_identity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 dark:text-gray-500">Member Since</span>
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
