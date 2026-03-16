export default function StatCard({ icon, label, value, subtitle }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-semibold text-gray-800 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
