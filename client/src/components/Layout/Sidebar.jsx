import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';

export default function Sidebar({ open, onClose, darkMode, onToggleDarkMode }) {
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
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="Logo" className="h-12 object-contain" />
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-brand-200 mt-2 font-medium">{agent?.displayName}</p>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        <NavLink to="/" end className={linkClass} onClick={onClose}>
          My Dashboard
        </NavLink>
        <NavLink to="/dashboard" className={linkClass} onClick={onClose}>
          Overall Dashboard
        </NavLink>
        <NavLink to="/profile" className={linkClass} onClick={onClose}>
          My Profile
        </NavLink>
        <NavLink to="/history" className={linkClass} onClick={onClose}>
          Call History
        </NavLink>
        <NavLink to="/contacts" className={linkClass} onClick={onClose}>
          Contacts
        </NavLink>
        <NavLink to="/phone-lists" className={linkClass} onClick={onClose}>
          Leads
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
          className="w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-left transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
