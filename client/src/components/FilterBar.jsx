import { useState } from 'react';

const COMPETITIONS = [
  '', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga',
  'Ligue 1', 'Champions League', 'Europa League', 'World Cup', 'Other',
];

export default function FilterBar({ onFilter }) {
  const [competition, setCompetition] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function handleApply(e) {
    e.preventDefault();
    onFilter({ competition, homeTeam, awayTeam, dateFrom, dateTo });
  }

  function handleReset() {
    setCompetition(''); setHomeTeam(''); setAwayTeam('');
    setDateFrom(''); setDateTo('');
    onFilter({});
  }

  return (
    <div className="filter-bar" role="search" aria-label="Filter highlights">
      <form onSubmit={handleApply}>
        <div className="filter-bar-row">
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
            <label className="form-label" htmlFor="filter-home">Home Team</label>
            <input
              id="filter-home"
              className="form-input"
              type="text"
              placeholder="e.g. Arsenal"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="filter-away">Away Team</label>
            <input
              id="filter-away"
              className="form-input"
              type="text"
              placeholder="e.g. Chelsea"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
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

          <div className="form-group" style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', minWidth: 'auto' }}>
            <button id="filter-apply-btn" className="btn btn-primary" type="submit">
              🔍 Filter
            </button>
            <button id="filter-reset-btn" className="btn btn-ghost" type="button" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
