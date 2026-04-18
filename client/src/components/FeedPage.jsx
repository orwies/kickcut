import { useState, useEffect, useCallback } from 'react';
import { getHighlights, getTrendingHighlights, getAIFact } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import HighlightCard from './HighlightCard';
import FilterBar from './FilterBar';

export default function FeedPage({ showToast }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [trending, setTrending] = useState([]);
  const [aiFact, setAiFact] = useState('');

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

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    loadHighlights(newFilters);
  }

  function handleLikeUpdate(updatedHighlight) {
    setHighlights((prev) =>
      prev.map((h) => (h._id === updatedHighlight._id ? updatedHighlight : h))
    );
  }

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
                    <div key={t._id} className="trending-item" style={{ cursor: 'pointer' }} onClick={() => t.videoPath && window.open(t.videoPath, '_blank')}>
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
    </div>
  );
}
