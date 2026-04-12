import { useState, useEffect, useCallback } from 'react';
import { getHighlights } from '../api';
import { useWebSocket } from '../hooks/useWebSocket';
import HighlightCard from './HighlightCard';
import FilterBar from './FilterBar';

export default function FeedPage({ showToast }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});

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

  useEffect(() => { loadHighlights(); }, []);

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

  return (
    <div className="feed-page">
      <div className="container">
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
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
