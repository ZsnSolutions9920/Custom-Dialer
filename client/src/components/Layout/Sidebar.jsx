import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';

export default function Sidebar() {
  const { agent, logout } = useAuth();
  const { connected } = useSocket();
  const { deviceReady } = useCall();

  return (
    <aside className="w-64 bg-gradient-to-b from-brand-900 to-brand-950 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-white/10">
        <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
        <p className="text-sm text-brand-200 mt-2 font-medium">{agent?.displayName}</p>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `block px-3 py-2.5 rounded-lg text-sm font-medium ${
              isActive ? 'sidebar-active text-white' : 'text-white/70 sidebar-hover transition-colors'
            }`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `block px-3 py-2.5 rounded-lg text-sm font-medium ${
              isActive ? 'sidebar-active text-white' : 'text-white/70 sidebar-hover transition-colors'
            }`
          }
        >
          Call History
        </NavLink>
        <NavLink
          to="/contacts"
          className={({ isActive }) =>
            `block px-3 py-2.5 rounded-lg text-sm font-medium ${
              isActive ? 'sidebar-active text-white' : 'text-white/70 sidebar-hover transition-colors'
            }`
          }
        >
          Contacts
        </NavLink>
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-white/50">Socket {connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${deviceReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
          <span className="text-white/50">Phone {deviceReady ? 'Ready' : 'Initializing'}</span>
        </div>
        <button
          onClick={logout}
          className="w-full mt-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-left transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
