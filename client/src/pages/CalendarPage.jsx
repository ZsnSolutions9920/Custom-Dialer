import FollowUpCalendar from '../components/Dashboard/FollowUpCalendar';

export default function CalendarPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Follow-Ups</h1>
      <FollowUpCalendar />
    </div>
  );
}
