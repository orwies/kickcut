import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AdminPanel from './AdminPanel';
import UploadForm from './UploadForm';

export default function Navbar({ showToast }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const onFeed = location.pathname === '/';
  const onChat = location.pathname === '/chat';

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner">
          <a href="/" className="navbar-logo" id="nav-logo">
            <span className="logo-icon">⚽</span>
            <span><span className="logo-kick">Kick</span><span className="logo-cut">Cut</span></span>
          </a>

          {/* Page tabs */}
          <div className="navbar-tabs">
            <button
              id="nav-tab-feed"
              className={`navbar-tab ${onFeed ? 'navbar-tab-active' : ''}`}
              onClick={() => navigate('/')}
            >
              🎬 Highlights
            </button>
            <button
              id="nav-tab-chat"
              className={`navbar-tab ${onChat ? 'navbar-tab-active' : ''}`}
              onClick={() => navigate('/chat')}
            >
              💬 Chat
            </button>
          </div>

          <div className="navbar-right">
            {user?.role === 'admin' && (
              <span className="navbar-admin-badge">Admin</span>
            )}
            <span className="navbar-username">@{user?.username}</span>

            {user?.role === 'admin' && (
              <button
                id="nav-admin-btn"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAdmin(true)}
              >
                🛡️ Admin Panel
              </button>
            )}

            <button
              id="nav-upload-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowUpload(true)}
            >
              ＋ Upload
            </button>

            <button
              id="nav-logout-btn"
              className="btn btn-ghost btn-sm"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {showUpload && (
        <UploadForm
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            showToast(user?.role === 'admin' ? 'Highlight published!' : 'Highlight submitted for review!');
          }}
          showToast={showToast}
        />
      )}

      {showAdmin && (
        <AdminPanel
          onClose={() => setShowAdmin(false)}
          showToast={showToast}
        />
      )}
    </>
  );
}
