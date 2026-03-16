export default function StatCard({ icon, label, value, subtitle, trend }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-gray-800 dark:text-white tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
