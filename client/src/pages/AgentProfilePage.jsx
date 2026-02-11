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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-8 animate-pulse">
          <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded w-32 mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-24 mb-2" />
                <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Profile</h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6 sm:p-8">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={handleChange('displayName')}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="agent@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange('phone')}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={handleChange('department')}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Sales"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={handleChange('bio')}
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
              placeholder="A short bio about yourself..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {success && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Profile updated!</span>
            )}
          </div>
        </form>
      </div>

      {profile?.created_at && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card border border-gray-100/80 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Account Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Username</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{profile.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Twilio Identity</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium font-mono text-xs">{profile.twilio_identity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Member Since</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">
                {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
