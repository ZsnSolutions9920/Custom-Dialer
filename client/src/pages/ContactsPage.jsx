import { useState, useEffect, useRef } from 'react';
import { getContacts, deleteContact, toggleFavorite } from '../api/contacts';
import { useCall } from '../context/CallContext';
import ContactsList from '../components/Contacts/ContactsList';
import ContactFormModal from '../components/Contacts/ContactFormModal';

export default function ContactsPage() {
  const [data, setData] = useState({ contacts: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const debounceRef = useRef(null);
  const { makeCall } = useCall();

  const fetchContacts = async (page = 1, searchVal = search) => {
    setLoading(true);
    try {
      const result = await getContacts({ page, limit: 50, search: searchVal || undefined });
      setData(result);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchContacts(1, search);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await deleteContact(id);
      fetchContacts(data.page, search);
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await toggleFavorite(id);
      fetchContacts(data.page, search);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingContact(null);
    fetchContacts(data.page, search);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Contacts</h1>
        <button
          onClick={() => { setEditingContact(null); setShowForm(true); }}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Add Contact
        </button>
      </div>

      <input
        type="text"
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100"
      />

      <ContactsList
        data={data}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCall={makeCall}
        onToggleFavorite={handleToggleFavorite}
        onPageChange={(page) => fetchContacts(page, search)}
      />

      {showForm && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => { setShowForm(false); setEditingContact(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
