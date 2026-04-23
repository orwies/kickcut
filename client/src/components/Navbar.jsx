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
  const [menuOpen, setMenuOpen] = useState(false);

  const onFeed = location.pathname === '/';
  const onChat = location.pathname === '/chat';

  function navTo(path) {
    navigate(path);
    setMenuOpen(false);
  }

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner">
          <a href="/" className="navbar-logo" id="nav-logo">
            <span className="logo-icon">⚽</span>
            <span><span className="logo-kick">Kick</span><span className="logo-cut">Cut</span></span>
          </a>

          {/* Desktop tabs — hidden on mobile */}
          <div className="navbar-tabs navbar-tabs-desktop">
            <button
              id="nav-tab-feed"
              className={`navbar-tab ${onFeed ? 'navbar-tab-active' : ''}`}
              onClick={() => navTo('/')}
            >
              🎬 Highlights
            </button>
            <button
              id="nav-tab-chat"
              className={`navbar-tab ${onChat ? 'navbar-tab-active' : ''}`}
              onClick={() => navTo('/chat')}
            >
              💬 Chat
            </button>
          </div>

          {/* Desktop right actions — hidden on mobile */}
          <div className="navbar-right navbar-right-desktop">
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

          {/* Hamburger — mobile only */}
          <button
            id="nav-hamburger"
            className="navbar-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="navbar-mobile-menu">
            <div className="navbar-mobile-user">
              <span className="navbar-username">@{user?.username}</span>
              {user?.role === 'admin' && <span className="navbar-admin-badge">Admin</span>}
            </div>

            <button
              className={`navbar-mobile-tab ${onFeed ? 'navbar-tab-active' : ''}`}
              onClick={() => navTo('/')}
            >
              🎬 Highlights
            </button>
            <button
              className={`navbar-mobile-tab ${onChat ? 'navbar-tab-active' : ''}`}
              onClick={() => navTo('/chat')}
            >
              💬 Chat
            </button>

            <div className="navbar-mobile-divider" />

            <button
              className="navbar-mobile-tab"
              onClick={() => { setShowUpload(true); setMenuOpen(false); }}
            >
              ＋ Upload Highlight
            </button>

            {user?.role === 'admin' && (
              <button
                className="navbar-mobile-tab"
                onClick={() => { setShowAdmin(true); setMenuOpen(false); }}
              >
                🛡️ Admin Panel
              </button>
            )}

            <button
              className="navbar-mobile-tab navbar-mobile-logout"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Overlay to close menu by tapping outside */}
      {menuOpen && (
        <div className="navbar-menu-backdrop" onClick={() => setMenuOpen(false)} />
      )}

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
