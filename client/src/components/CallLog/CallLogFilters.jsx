import { useState, useEffect, useRef } from 'react';
import { exportCallsCsv } from '../../api/calls';

export default function CallLogFilters({ filters, onFilterChange }) {
  const [search, setSearch] = useState(filters.search || '');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ ...filters, search: search || undefined });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value || undefined });
  };

  const clearAll = () => {
    setSearch('');
    onFilterChange({});
  };

  const hasFilters = filters.search || filters.direction || filters.status || filters.dateFrom || filters.dateTo;

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search phone or agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-52"
        />

        <select
          value={filters.direction || ''}
          onChange={(e) => handleChange('direction', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>

        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="no-answer">No Answer</option>
          <option value="busy">Busy</option>
          <option value="failed">Failed</option>
          <option value="canceled">Canceled</option>
        </select>

        <input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => handleChange('dateFrom', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Date from"
        />

        <input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => handleChange('dateTo', e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="Date to"
        />

        <div className="flex items-center gap-2 ml-auto">
          {hasFilters && (
            <button
              onClick={clearAll}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => exportCallsCsv(filters)}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
