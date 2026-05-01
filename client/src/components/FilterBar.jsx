// Filter component for the highlights feed. Supports filtering by team, date, and competition.
import { useState } from 'react';

const COMPETITIONS = [
  '', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga',
  'Ligue 1', 'Champions League', 'Europa League', 'World Cup', 'Other',
];

// Interactive filter bar for refining the highlights feed by team, competition, and date.
export default function FilterBar({ onFilter }) {
  const [team, setTeam] = useState('');
  const [competition, setCompetition] = useState('');
  const [matchStage, setMatchStage] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleApply(e) {
    e.preventDefault();
    onFilter({ team, competition, matchStage, dateFrom, dateTo });
  }

  function handleReset() {
    setTeam(''); setCompetition(''); setMatchStage('');
    setDateFrom(''); setDateTo('');
    setShowAdvanced(false);
    onFilter({});
  }

  const hasAdvanced = competition || matchStage || dateFrom || dateTo;

  return (
    <div className="filter-bar" role="search" aria-label="Filter highlights">
      <form onSubmit={handleApply}>
        {/* ── Primary row: Team search + action buttons ── */}
        <div className="filter-bar-primary">
          <div className="filter-team-wrap">
            <span className="filter-team-icon">🔍</span>
            <input
              id="filter-team"
              className="filter-team-input"
              type="text"
              placeholder="Search by team (e.g. Arsenal, Real Madrid…)"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              autoComplete="off"
            />
            {team && (
              <button
                type="button"
                className="filter-team-clear"
                onClick={() => { setTeam(''); onFilter({ competition, matchStage, dateFrom, dateTo }); }}
                aria-label="Clear team search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-bar-actions">
            <button id="filter-apply-btn" className="btn btn-primary" type="submit">
              Filter
            </button>
            <button
              id="filter-advanced-btn"
              className={`btn btn-ghost filter-advanced-toggle${showAdvanced ? ' active' : ''}${hasAdvanced ? ' has-value' : ''}`}
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              ⚙️ {showAdvanced ? 'Less' : 'More'}
            </button>
            {(team || hasAdvanced) && (
              <button id="filter-reset-btn" className="btn btn-ghost" type="button" onClick={handleReset}>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Advanced filters (collapsible) ── */}
        {showAdvanced && (
          <div className="filter-bar-advanced">
            <div className="form-group">
              <label className="form-label" htmlFor="filter-competition">Competition</label>
              <select
                id="filter-competition"
                className="form-input"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
              >
                {COMPETITIONS.map((c) => (
                  <option key={c} value={c}>{c || 'All Competitions'}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="filter-matchStage">Match Stage</label>
              <input
                id="filter-matchStage"
                className="form-input"
                type="text"
                placeholder="e.g. Final, GW32"
                value={matchStage}
                onChange={(e) => setMatchStage(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="filter-from">From Date</label>
              <input
                id="filter-from"
                className="form-input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="filter-to">To Date</label>
              <input
                id="filter-to"
                className="form-input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
