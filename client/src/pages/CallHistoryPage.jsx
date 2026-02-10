import CallLogTable from '../components/CallLog/CallLogTable';

export default function CallHistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Call History</h1>
      <CallLogTable />
    </div>
  );
}
