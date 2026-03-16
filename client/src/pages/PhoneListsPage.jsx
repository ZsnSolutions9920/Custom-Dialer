import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { usePowerDialer } from '../context/PowerDialerContext';
import ListsGrid from '../components/PhoneLists/ListsGrid';
import LeadsList from '../components/PhoneLists/LeadsList';
import ClientProfile from '../components/PhoneLists/ClientProfile';

export default function PhoneListsPage() {
  const [selectedListId, setSelectedListId] = useState(null);
  const [selectedListName, setSelectedListName] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const toast = useToast();
  const { startSession, isActive: powerDialActive } = usePowerDialer();

  // Client Profile view
  if (selectedEntryId) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Dialer</h1>
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
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Dialer</h1>
        <LeadsList
          listId={selectedListId}
          listName={selectedListName}
          onBack={() => { setSelectedListId(null); setSelectedListName(''); }}
          onViewProfile={(entryId) => setSelectedEntryId(entryId)}
          toast={toast}
          showDialActions={true}
        />
      </div>
    );
  }

  // Lists selection view
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Dialer</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a list from your contacts to start calling</p>
      </div>

      <ListsGrid
        onSelectList={(id, name) => { setSelectedListId(id); setSelectedListName(name); }}
        showUploadButton={false}
        showPowerDial={true}
        startSession={startSession}
        powerDialActive={powerDialActive}
        toast={toast}
      />
    </div>
  );
}
