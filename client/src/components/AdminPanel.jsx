import { useState, useEffect } from 'react';
import { getPendingHighlights, approveHighlight, deleteHighlight } from '../api';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminPanel({ onClose, showToast }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getPendingHighlights();
        setPending(data);
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to load pending highlights', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleApprove(id) {
    setActionId(id);
    try {
      await approveHighlight(id);
      setPending((prev) => prev.filter((h) => h._id !== id));
      showToast('✅ Highlight approved and published!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Approval failed', 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id) {
    if (!window.confirm('Are you sure you want to reject and delete this highlight?')) return;
    setActionId(id);
    try {
      await deleteHighlight(id);
      setPending((prev) => prev.filter((h) => h._id !== id));
      showToast('🗑️ Highlight rejected and removed.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Rejection failed', 'error');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="admin-overlay" id="admin-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Admin panel">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>🛡️ Admin Panel</h2>
            <p style={{ fontSize: '0.875rem', marginTop: 4 }}>
              {loading ? 'Loading…' : `${pending.length} highlight${pending.length !== 1 ? 's' : ''} awaiting review`}
            </p>
          </div>
          <button id="admin-close-btn" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : pending.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-icon">✅</div>
            <h3>All clear!</h3>
            <p>No highlights pending review.</p>
          </div>
        ) : (
          <div className="pending-list" id="pending-highlights-list">
            {pending.map((h) => (
              <div key={h._id} className="pending-card" id={`pending-${h._id}`}>
                {h.thumbnailPath ? (
                  <img className="pending-thumb" src={h.thumbnailPath} alt="thumb" />
                ) : (
                  <div className="pending-thumb">⚽</div>
                )}

                <div className="pending-info">
                  <div className="pending-teams">
                    {h.homeTeam} {h.score?.home ?? 0} – {h.score?.away ?? 0} {h.awayTeam}
                  </div>
                  <div className="pending-meta">
                    {h.competition} · {h.date ? formatDate(h.date) : '?'}
                    {h.videoPath && <span style={{ marginLeft: 8 }}>🎬 Has video</span>}
                  </div>
                </div>

                <div className="pending-actions">
                  <button
                    id={`approve-btn-${h._id}`}
                    className="btn btn-primary btn-sm"
                    disabled={actionId === h._id}
                    onClick={() => handleApprove(h._id)}
                  >
                    {actionId === h._id ? '…' : '✅ Approve'}
                  </button>
                  <button
                    id={`reject-btn-${h._id}`}
                    className="btn btn-danger btn-sm"
                    disabled={actionId === h._id}
                    onClick={() => handleReject(h._id)}
                  >
                    {actionId === h._id ? '…' : '❌ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
