import { useState, useEffect, useRef } from 'react';
import { getContacts, deleteContact, toggleFavorite } from '../api/contacts';
import { useCall } from '../context/CallContext';
import { useToast } from '../context/ToastContext';
import ContactsList from '../components/Contacts/ContactsList';
import ContactFormModal from '../components/Contacts/ContactFormModal';
import UploadModal from '../components/PhoneLists/UploadModal';
import ListsGrid from '../components/PhoneLists/ListsGrid';
import LeadsList from '../components/PhoneLists/LeadsList';
import ClientProfile from '../components/PhoneLists/ClientProfile';

const TABS = [
  { key: 'contacts', label: 'Individual Contacts' },
  { key: 'lists', label: 'Uploaded Lists' },
];

export default function ContactsPage() {
  const [tab, setTab] = useState('contacts');
  const [data, setData] = useState({ contacts: [], total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedListName, setSelectedListName] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const debounceRef = useRef(null);
  const refreshListsRef = useRef(null);
  const { makeCall } = useCall();
  const toast = useToast();

  const fetchContacts = async (page = 1, searchVal = search) => {
    setLoading(true);
    try {
      const result = await getContacts({ page, limit: 50, search: searchVal || undefined });
      setData(result);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchContacts(1, search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await deleteContact(id);
      fetchContacts(data.page, search);
    } catch (err) {
      console.error('Failed to delete contact:', err);
      toast.error('Failed to delete contact');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await toggleFavorite(id);
      fetchContacts(data.page, search);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      toast.error('Failed to update favorite');
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

  const handleUploaded = () => {
    setShowUpload(false);
    if (refreshListsRef.current) refreshListsRef.current();
  };

  // Client Profile view (within lists tab)
  if (tab === 'lists' && selectedEntryId) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Contacts</h1>
        <ClientProfile
          entryId={selectedEntryId}
          onBack={() => setSelectedEntryId(null)}
          toast={toast}
        />
      </div>
    );
  }

  // Leads List view (within lists tab)
  if (tab === 'lists' && selectedListId) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Contacts</h1>
        <LeadsList
          listId={selectedListId}
          listName={selectedListName}
          onBack={() => { setSelectedListId(null); setSelectedListName(''); }}
          onViewProfile={(entryId) => setSelectedEntryId(entryId)}
          toast={toast}
          showDialActions={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Contacts</h1>
        {tab === 'contacts' && (
          <button
            onClick={() => { setEditingContact(null); setShowForm(true); }}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors"
          >
            Add Contact
          </button>
        )}
        {tab === 'lists' && (
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors"
          >
            Upload List
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Individual Contacts tab */}
      {tab === 'contacts' && (
        <>
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-gray-100"
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
        </>
      )}

      {/* Uploaded Lists tab */}
      {tab === 'lists' && (
        <ListsGrid
          onSelectList={(id, name) => { setSelectedListId(id); setSelectedListName(name); }}
          onUploaded={refreshListsRef}
          showUploadButton={true}
          toast={toast}
        />
      )}

      {showForm && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => { setShowForm(false); setEditingContact(null); }}
          onSaved={handleSaved}
        />
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} toast={toast} />}
    </div>
  );
}
