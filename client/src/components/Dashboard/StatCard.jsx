export default function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
