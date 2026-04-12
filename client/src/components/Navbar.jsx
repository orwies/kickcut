import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminPanel from './AdminPanel';
import UploadForm from './UploadForm';

export default function Navbar({ showToast }) {
  const { user, logout } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner">
          <a href="/" className="navbar-logo" id="nav-logo">
            <span className="logo-icon">⚽</span>
            <span><span className="logo-kick">Kick</span><span className="logo-cut">Cut</span></span>
          </a>

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
          onSuccess={() => { setShowUpload(false); showToast('Highlight submitted for review!'); }}
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
