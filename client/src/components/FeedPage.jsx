/**
 * The main highlights feed. Shows trending clips and an AI match fact in the sidebar.
 * Automatically adds new highlights when they're approved.
 */
import { useState, useEffect, useCallback } from 'react';

import { getHighlights, getTrendingHighlights, getAIFact } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import HighlightCard from './HighlightCard';
import FilterBar from './FilterBar';

/**
 * Main Feed Page component that displays the highlights grid and trending sidebar.
 * Receives 'showToast' for notifications.
 * Fetches initial highlight data, manages filter states, and listens for live highlight approvals over WebSockets.
 * Returns the JSX elements rendering the entire feed view.
 */
export default function FeedPage({ showToast }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [trending, setTrending] = useState([]);
  const [aiFact, setAiFact] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);

  /**
   * Loads the highlights from the API based on current filters.
   * Receives an optional 'f' object containing the active filter criteria.
   * Dispatches the API GET request, updates local highlights state, and manages the loading spinner.
   * Returns nothing.
   */
  const loadHighlights = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const data = await getHighlights(f);
      setHighlights(data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load highlights', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    loadHighlights();
    getTrendingHighlights().then(setTrending).catch(() => { });
    getAIFact().then((data) => setAiFact(data.fact)).catch(() => { });
  }, []);

  // Real-time: add newly approved highlights from WebSocket
  useWebSocket('highlight_approved', (newHighlight) => {
    setHighlights((prev) => {
      if (prev.find((h) => h._id === newHighlight._id)) return prev;
      showToast('🎉 New highlight just approved!');
      return [newHighlight, ...prev];
    });
  });

  /**
   * Handles updates to the search filters from the FilterBar component.
   * Receives the 'newFilters' object.
   * Stores the filters in local state and immediately triggers a fresh API load.
   * Returns nothing.
   */
  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    loadHighlights(newFilters);
  }

  /**
   * Updates the state of a specific highlight when its like count changes.
   * Receives the 'updatedHighlight' object from the API response.
   * Maps over the existing highlights array and replaces the matching document to reflect new like counts.
   * Returns nothing.
   */
  function handleLikeUpdate(updatedHighlight) {
    setHighlights((prev) =>
      prev.map((h) => (h._id === updatedHighlight._id ? updatedHighlight : h))
    );
  }

  /**
   * Removes a specific highlight from the local state after deletion.
   * Receives the 'deletedId' string of the removed document.
   * Filters the state array to purge the deleted highlight from the UI without reloading.
   * Returns nothing.
   */
  function handleDeleteHighlight(deletedId) {
    setHighlights((prev) => prev.filter((h) => h._id !== deletedId));
  }

  return (
    <div className="feed-page">
      <div className="feed-layout-grid container">
        <div className="feed-main-content">
          <div className="feed-header">
            <h1 className="feed-title">
              🏟️ Highlights Feed
              {!loading && (
                <span className="feed-count">{highlights.length} clips</span>
              )}
            </h1>
          </div>

          <FilterBar onFilter={handleFilterChange} />

          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : highlights.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>No highlights found</h3>
              <p>Try adjusting your filters or upload the first one!</p>
            </div>
          ) : (
            <div className="highlights-grid" id="highlights-grid">
              {highlights.map((h) => (
                <HighlightCard
                  key={h._id}
                  highlight={h}
                  onLikeUpdate={handleLikeUpdate}
                  onDelete={handleDeleteHighlight}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="feed-right-sidebar">
          <div className="widget-card widget-fact">
            <div className="widget-header">
              <h3>🤖 AI Match Day Fact</h3>
            </div>
            <div className="widget-body">
              {aiFact ? <p>{aiFact}</p> : <div className="dc-typing"><span /><span /><span /></div>}
            </div>
          </div>

          <div className="widget-card widget-trending">
            <div className="widget-header">
              <h3>🔥 Trending Clips</h3>
            </div>
            <div className="widget-body">
              {trending.length === 0 ? (
                <p className="dc-kickbot-hint">No trending clips yet.</p>
              ) : (
                <div className="trending-list">
                  {trending.map((t, idx) => (
                    <div key={t._id} className="trending-item" style={{ cursor: 'pointer' }} onClick={() => t.videoPath && setPlayingVideo(t)}>
                      <span className="trending-rank">#{idx + 1}</span>
                      <div className="trending-info">
                        <div className="trending-teams">
                          {t.homeTeam} {t.score?.home ?? '-'}-{t.score?.away ?? '-'} {t.awayTeam}
                        </div>
                        <div className="trending-stats" style={{ marginBottom: 4 }}>
                          {t.matchStage ? `${t.matchStage} • ` : ''}
                          {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="trending-stats">❤️ {(t.likes && t.likes.length) || 0} likes</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Inline video modal for trending clips */}
      {playingVideo && (
        <div
          className="video-modal-overlay"
          onClick={() => setPlayingVideo(null)}
        >
          <div className="video-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button
              className="video-modal-close"
              onClick={() => setPlayingVideo(null)}
              aria-label="Close video"
            >
              ✕
            </button>
            <div className="video-modal-title">
              {playingVideo.homeTeam} vs {playingVideo.awayTeam}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem', marginLeft: 10 }}>
                {playingVideo.competition}
              </span>
            </div>
            <video
              className="video-modal-player"
              src={`/highlights/video/${playingVideo.videoPath.split('/').pop()}`}
              controls
              autoPlay
              playsInline
              preload="auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
