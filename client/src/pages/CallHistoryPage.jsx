import { useState } from 'react';
import CallLogTable from '../components/CallLog/CallLogTable';
import CallLogFilters from '../components/CallLog/CallLogFilters';

export default function CallHistoryPage() {
  const [filters, setFilters] = useState({});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Call History</h1>
      <CallLogFilters filters={filters} onFilterChange={setFilters} />
      <CallLogTable filters={filters} />
    </div>
  );
}
