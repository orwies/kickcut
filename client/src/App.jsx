import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import FeedPage from './components/FeedPage';
import ChatPanel from './components/ChatPanel';
import { useState } from 'react';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [toast, setToast] = useState(null);

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ChatPanel />
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
