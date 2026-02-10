export default function ContactsList({ data, loading, onEdit, onDelete, onPageChange }) {
  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : data.contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No contacts yet.</td>
              </tr>
            ) : (
              data.contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-brand-50/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{contact.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{contact.phone_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.email || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{contact.company || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(contact)}
                        className="px-2.5 py-1 text-xs font-medium text-brand-600 bg-brand-50 rounded-md hover:bg-brand-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(contact.id)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {data.page} of {totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
