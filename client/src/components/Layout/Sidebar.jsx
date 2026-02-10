import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';

export default function Sidebar() {
  const { agent, logout } = useAuth();
  const { connected } = useSocket();
  const { deviceReady } = useCall();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Sales Dialer</h1>
        <p className="text-sm text-gray-400 mt-1">{agent?.displayName}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-md text-sm ${
              isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `block px-3 py-2 rounded-md text-sm ${
              isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          Call History
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-gray-400">Socket {connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${deviceReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
          <span className="text-gray-400">Phone {deviceReady ? 'Ready' : 'Initializing'}</span>
        </div>
        <button
          onClick={logout}
          className="w-full mt-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-md text-left"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
