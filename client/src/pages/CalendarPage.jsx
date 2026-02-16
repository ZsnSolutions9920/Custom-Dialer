import FollowUpCalendar from '../components/Dashboard/FollowUpCalendar';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Follow-Ups</h1>
      <FollowUpCalendar />
    </div>
  );
}
