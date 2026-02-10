import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import LoginPage from './components/Auth/LoginPage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import MyDashboardPage from './pages/MyDashboardPage';
import DashboardPage from './pages/DashboardPage';
import AgentProfilePage from './pages/AgentProfilePage';
import CallHistoryPage from './pages/CallHistoryPage';
import ContactsPage from './pages/ContactsPage';

function AuthenticatedApp() {
  return (
    <SocketProvider>
      <CallProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<MyDashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<AgentProfilePage />} />
            <Route path="history" element={<CallHistoryPage />} />
            <Route path="contacts" element={<ContactsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CallProvider>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AuthenticatedApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
