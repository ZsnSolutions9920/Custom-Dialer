import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ActiveCallBanner from '../Dialer/ActiveCallBanner';
import IncomingCallModal from '../Dialer/IncomingCallModal';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <ActiveCallBanner />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
      <IncomingCallModal />
    </div>
  );
}
