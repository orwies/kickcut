// Main App component. Handles high-level routing and global toast notifications.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import FeedPage from './components/FeedPage';
import ChatPage from './components/ChatPage';
import { useState } from 'react';

/**
 * Component for handling app-wide routing, auth state, and toast notifications.
 * Takes no props directly, but utilizes Auth context.
 * Renders the top-level layout including Navbar, routes to Chat or Feed, and handles the global toast overlay.
 * Returns the JSX layout tree.
 */
function AppRoutes() {
  const { user, loading } = useAuth();
  const [toast, setToast] = useState(null);

  /**
   * Displays a temporary notification popup (toast).
   * Receives a 'message' string and an optional 'type' string (defaulting to 'success').
   * Sets the toast state to make it visible and schedules a timeout to clear it after 3 seconds.
   * Returns nothing.
   */
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="spinner-wrap" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginPage showToast={showToast} />;

  return (
    <div className="app-layout">
      <div className="page-glow" />
      <Navbar showToast={showToast} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<FeedPage showToast={showToast} />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Root application component.
 * Takes no props.
 * Wraps the entire application tree with the AuthProvider and BrowserRouter to enable global state and navigation.
 * Returns the fully wrapped React element tree.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
