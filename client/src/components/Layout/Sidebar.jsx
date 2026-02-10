import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';

export default function Sidebar({ open, onClose }) {
  const { agent, logout } = useAuth();
  const { connected } = useSocket();
  const { deviceReady } = useCall();

  const linkClass = ({ isActive }) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium ${
      isActive ? 'sidebar-active text-white' : 'text-white/70 sidebar-hover transition-colors'
    }`;

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-brand-900 to-brand-950 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        md:static md:translate-x-0 md:min-h-screen
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <img src="/logo.png" alt="Logo" className="h-12 object-contain" />
          <p className="text-sm text-brand-200 mt-2 font-medium">{agent?.displayName}</p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        <NavLink to="/" end className={linkClass} onClick={onClose}>
          Dashboard
        </NavLink>
        <NavLink to="/history" className={linkClass} onClick={onClose}>
          Call History
        </NavLink>
        <NavLink to="/contacts" className={linkClass} onClick={onClose}>
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
