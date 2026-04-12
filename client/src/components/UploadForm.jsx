import { useState, useRef } from 'react';
import { uploadHighlight } from '../api';

const COMPETITIONS = [
  'Premier League', 'La Liga', 'Serie A', 'Bundesliga',
  'Ligue 1', 'Champions League', 'Europa League', 'World Cup', 'Other',
];

export default function UploadForm({ onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    homeTeam: '', awayTeam: '', competition: COMPETITIONS[0],
    date: '', scoreHome: '0', scoreAway: '0',
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef();
  const thumbRef = useRef();

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.homeTeam || !form.awayTeam || !form.date) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (videoFile) fd.append('video', videoFile);
      if (thumbFile) fd.append('thumbnail', thumbFile);
      await uploadHighlight(fd);
      onSuccess();
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload-overlay" id="upload-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Upload highlight">
        <div className="modal-header">
          <h2 style={{ fontSize: '1.25rem' }}>📹 Upload Highlight</h2>
          <button id="upload-close-btn" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="upload-form" onSubmit={handleSubmit} id="upload-form">
          <div className="form-group">
            <label className="form-label" htmlFor="upload-competition">Competition *</label>
            <select id="upload-competition" className="form-input" value={form.competition}
              onChange={(e) => update('competition', e.target.value)}>
              {COMPETITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="upload-home">Home Team *</label>
              <input id="upload-home" className="form-input" type="text" placeholder="Arsenal"
                value={form.homeTeam} onChange={(e) => update('homeTeam', e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="upload-away">Away Team *</label>
              <input id="upload-away" className="form-input" type="text" placeholder="Chelsea"
                value={form.awayTeam} onChange={(e) => update('awayTeam', e.target.value)} required />
            </div>
          </div>

          <div className="score-row">
            <div className="form-group">
              <label className="form-label" htmlFor="upload-score-home">Home Score</label>
              <input id="upload-score-home" className="form-input" type="number" min="0" max="99"
                value={form.scoreHome} onChange={(e) => update('scoreHome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="upload-score-away">Away Score</label>
              <input id="upload-score-away" className="form-input" type="number" min="0" max="99"
                value={form.scoreAway} onChange={(e) => update('scoreAway', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label" htmlFor="upload-date">Match Date *</label>
              <input id="upload-date" className="form-input" type="date"
                value={form.date} onChange={(e) => update('date', e.target.value)} required />
            </div>
          </div>

          {/* Video file drop zone */}
          <div className="form-group">
            <label className="form-label">Video File</label>
            <div
              className={`file-drop-zone${videoFile ? ' has-file' : ''}`}
              id="video-drop-zone"
            >
              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                id="upload-video"
                onChange={(e) => setVideoFile(e.target.files[0])}
              />
              <div className="drop-icon">🎬</div>
              <p className="drop-text">
                {videoFile ? `✅ ${videoFile.name}` : 'Click or drag a video file here'}
              </p>
              <p className="drop-hint">MP4, WebM, AVI (max 500 MB)</p>
            </div>
          </div>

          {/* Thumbnail drop zone */}
          <div className="form-group">
            <label className="form-label">Thumbnail Image</label>
            <div
              className={`file-drop-zone${thumbFile ? ' has-file' : ''}`}
              id="thumbnail-drop-zone"
            >
              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                id="upload-thumbnail"
                onChange={(e) => setThumbFile(e.target.files[0])}
              />
              <div className="drop-icon">🖼️</div>
              <p className="drop-text">
                {thumbFile ? `✅ ${thumbFile.name}` : 'Click or drag an image here'}
              </p>
              <p className="drop-hint">JPEG, PNG, WebP (max 5 MB)</p>
            </div>
          </div>

          <button
            id="upload-submit-btn"
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Uploading…
              </span>
            ) : '🚀 Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
