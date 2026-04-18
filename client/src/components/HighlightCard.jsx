import { useState } from 'react';
import { likeHighlight, deleteHighlight } from '../api';
import { useAuth } from '../hooks/useAuth';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function HighlightCard({ highlight, onLikeUpdate, onDelete, showToast }) {
  const { user } = useAuth();
  const [liking, setLiking] = useState(false);

  const isLiked = highlight.likes?.includes(user?.id);
  const likeCount = highlight.likes?.length ?? 0;

  async function handleLike(e) {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    try {
      const updated = await likeHighlight(highlight._id);
      onLikeUpdate(updated);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to like', 'error');
    } finally {
      setLiking(false);
    }
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${highlight.homeTeam} vs ${highlight.awayTeam}?`)) return;
    try {
      await deleteHighlight(highlight._id);
      if (onDelete) onDelete(highlight._id);
      showToast('Highlight deleted permanently.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete highlight', 'error');
    }
  }

  function openVideo(e) {
    if (highlight.videoPath) {
      window.open(highlight.videoPath, '_blank');
    }
  }

  return (
    <article className="highlight-card" id={`highlight-card-${highlight._id}`} onClick={openVideo}>
      <div className="card-thumbnail">
        {highlight.thumbnailPath ? (
          <img
            src={highlight.thumbnailPath}
            alt={`${highlight.homeTeam} vs ${highlight.awayTeam}`}
            loading="lazy"
          />
        ) : (
          <div className="card-thumbnail-placeholder">⚽</div>
        )}

        {highlight.videoPath && (
          <div className="card-play-btn">
            <div className="play-icon">▶</div>
          </div>
        )}

        <div className="card-competition">
          {highlight.competition}{highlight.matchStage ? ` • ${highlight.matchStage}` : ''}
        </div>
      </div>

      <div className="card-body">
        <div className="card-teams">
          <span className="team-name">{highlight.homeTeam}</span>

          <div className="score-badge">
            <span>{highlight.score?.home ?? 0}</span>
            <span className="score-sep">–</span>
            <span>{highlight.score?.away ?? 0}</span>
          </div>

          <span className="team-name" style={{ textAlign: 'right' }}>{highlight.awayTeam}</span>
        </div>

        <div className="card-meta">
          <span className="card-date" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            📅 {highlight.date ? formatDate(highlight.date) : 'Unknown date'}
            {user?.role === 'admin' && (
              <button 
                onClick={handleDelete} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5555', fontSize: '1rem', padding: '0 4px' }}
                title="Delete Highlight"
              >
                🗑️
              </button>
            )}
          </span>

          <button
            id={`like-btn-${highlight._id}`}
            className={`like-btn${isLiked ? ' liked' : ''}`}
            onClick={handleLike}
            disabled={liking}
            aria-label={`${isLiked ? 'Unlike' : 'Like'} this highlight`}
          >
            <span className="heart">{isLiked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
