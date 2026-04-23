import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getChatMessages, getChannels, createChannel, deleteChannel } from '../api';
import { sendWS } from '../ws';
import { useWebSocket } from '../hooks/useWebSocket';

const DEFAULT_CHANNELS = [
  { id: 'general', label: 'general', icon: '#', desc: 'Live match chat — talk football with everyone' },
  { id: 'kickbot', label: 'kickbot-ai', icon: '⚽', desc: 'Ask KickBot anything about football' },
];

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getAvatar(username, isBot) {
  if (isBot) return { text: '🤖', gradient: 'linear-gradient(135deg, #00c853, #1b5e20)' };
  const colors = [
    'linear-gradient(135deg, #6c63ff, #3f3d56)',
    'linear-gradient(135deg, #f72585, #7209b7)',
    'linear-gradient(135deg, #4cc9f0, #4361ee)',
    'linear-gradient(135deg, #f8961e, #f3722c)',
    'linear-gradient(135deg, #43aa8b, #277da1)',
    'linear-gradient(135deg, #9ef01a, #38b000)',
  ];
  const idx = username.charCodeAt(0) % colors.length;
  return { text: username[0].toUpperCase(), gradient: colors[idx] };
}

function Message({ msg, prevMsg }) {
  const avatar = getAvatar(msg.username, msg.isBot);
  const showHeader = !prevMsg || prevMsg.userId !== msg.userId ||
    (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) > 5 * 60 * 1000;
  const showDateDivider = !prevMsg || formatDate(msg.createdAt) !== formatDate(prevMsg.createdAt);

  return (
    <>
      {showDateDivider && (
        <div className="dc-date-divider">
          <span>{formatDate(msg.createdAt)}</span>
        </div>
      )}
      <div className={`dc-msg ${!showHeader ? 'dc-msg-compact' : ''} ${msg.isBot ? 'dc-msg-bot' : ''}`}>
        {showHeader ? (
          <div className="dc-msg-avatar" style={{ background: avatar.gradient }}>
            {avatar.text}
          </div>
        ) : (
          <div className="dc-msg-avatar-spacer" />
        )}
        <div className="dc-msg-body">
          {showHeader && (
            <div className="dc-msg-header">
              <span className={`dc-msg-name ${msg.isBot ? 'dc-msg-name-bot' : ''}`}>{msg.username}</span>
              <span className="dc-msg-time">{formatTime(msg.createdAt)}</span>
              {msg.isBot && <span className="dc-bot-badge">AI</span>}
            </div>
          )}
          <p className="dc-msg-text">{msg.text}</p>
        </div>
      </div>
    </>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState({ general: [], kickbot: [] });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [botTyping, setBotTyping] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChan, setNewChan] = useState({ id: '', label: '', desc: '', adminOnly: false });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  async function loadChannels() {
    try {
      const fetched = await getChannels();
      const custom = fetched.filter(c => c.id !== 'general' && c.id !== 'kickbot');
      setChannels([DEFAULT_CHANNELS[0], ...custom, DEFAULT_CHANNELS[1]]);
    } catch {}
  }

  useEffect(() => {
    loadChannels();
  }, []);

  // Load history when channel changes
  useEffect(() => {
    setLoading(true);
    getChatMessages(activeChannel)
      .then((msgs) => setMessages((prev) => ({ ...prev, [activeChannel]: msgs })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, botTyping]);

  // Receive new messages over WebSocket
  useWebSocket('chat_message', useCallback((msg) => {
    if (!msg.channel) msg.channel = 'general';
    if (msg.isBot) setBotTyping(false);
    setMessages((prev) => {
      const ch = msg.channel;
      const existing = prev[ch] || [];
      if (existing.some((m) => m._id === msg._id)) return prev;
      return { ...prev, [ch]: [...existing, msg] };
    });
  }, []));

  useWebSocket('online_users', useCallback((users) => {
    setOnlineUsers(users || []);
  }, []));

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    inputRef.current?.focus();
    if (activeChannel === 'kickbot') setBotTyping(true);
    sendWS({ type: 'chat', channel: activeChannel, text });
  }

  async function handleCreateChannel(e) {
    e.preventDefault();
    if (!newChan.id || !newChan.label) return;
    try {
      await createChannel({ ...newChan, id: newChan.id.toLowerCase().replace(/\s+/g, '-') });
      setShowAddModal(false);
      setNewChan({ id: '', label: '', desc: '', adminOnly: false });
      loadChannels();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create channel');
    }
  }

  async function handleDeleteChannel(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this channel entirely?')) return;
    try {
      await deleteChannel(id);
      if (activeChannel === id) setActiveChannel('general');
      loadChannels();
    } catch (err) {
      alert('Failed to delete channel');
    }
  }

  const currentMessages = messages[activeChannel] || [];
  const activeChannelInfo = channels.find((c) => c.id === activeChannel);

  return (
    <div className="dc-layout">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="dc-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Left Sidebar ── */}
      <aside className={`dc-sidebar ${sidebarOpen ? 'dc-sidebar-open' : ''}`}>
        <div className="dc-server-header">
          <div className="dc-server-icon">⚽</div>
          <div className="dc-server-info">
            <span className="dc-server-name">KickCut</span>
            <span className="dc-server-tag">Football Community</span>
          </div>
        </div>

        <div className="dc-section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Channels</span>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setShowAddModal(true)}
              style={{ background: 'none', border: 'none', color: '#8e9297', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
              title="Create Channel"
            >
              +
            </button>
          )}
        </div>
        <nav className="dc-channels">
          {channels.map((ch) => (
            <div key={ch.id} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                className={`dc-channel-btn ${activeChannel === ch.id ? 'dc-channel-active' : ''}`}
                onClick={() => { setActiveChannel(ch.id); setSidebarOpen(false); }}
                style={{ flex: 1 }}
              >
                <span className="dc-channel-icon">{ch.adminOnly ? '🔒' : ch.icon}</span>
                <span className="dc-channel-name">{ch.label}</span>
                {ch.id === 'kickbot' && <span className="dc-ai-tag">AI</span>}
              </button>
              {user?.role === 'admin' && ch.id !== 'general' && ch.id !== 'kickbot' && (
                <button 
                  onClick={(e) => handleDeleteChannel(ch.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5555', padding: '0 8px' }}
                  title="Delete Channel"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="dc-section-label">Always Online</div>
        <div className="dc-member">
          <div className="dc-member-dot" style={{ background: '#00c853' }} />
          <span className="dc-member-name">🤖 KickBot</span>
          <span className="dc-ai-tag" style={{ marginLeft: 6 }}>AI</span>
        </div>

        <div className="dc-section-label">Online</div>
        {onlineUsers.length > 0 ? onlineUsers.map((u) => (
          <div key={u.username} className="dc-member">
            <div className="dc-member-dot" />
            <span className="dc-member-name">@{u.username}</span>
            {u.role === 'admin' && <span className="dc-admin-tag">Admin</span>}
          </div>
        )) : (
          <div className="dc-member">
            <div className="dc-member-dot" />
            <span className="dc-member-name">@{user?.username}</span>
            {user?.role === 'admin' && <span className="dc-admin-tag">Admin</span>}
          </div>
        )}
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="dc-main">
        {/* Header */}
        <header className="dc-header">
          {/* Mobile sidebar toggle */}
          <button
            className="dc-sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle channels"
          >
            ☰
          </button>
          <span className="dc-header-icon">{activeChannelInfo?.icon}</span>
          <span className="dc-header-name">{activeChannelInfo?.label}</span>
          <span className="dc-header-desc">{activeChannelInfo?.desc}</span>
        </header>

        {/* Messages */}
        <div className="dc-messages">
          {loading ? (
            <div className="dc-loading"><div className="spinner" /></div>
          ) : (
            <>
              <div className="dc-welcome">
                <div className="dc-welcome-icon">{activeChannelInfo?.icon}</div>
                <h2>Welcome to #{activeChannelInfo?.label}</h2>
                <p>{activeChannelInfo?.desc}</p>
                {activeChannel === 'kickbot' && (
                  <p className="dc-kickbot-hint">
                    Ask me anything! Try: <em>"Who is the best striker of all time?"</em> or <em>"Explain the offside rule"</em>
                  </p>
                )}
              </div>

              {currentMessages.map((msg, i) => (
                <Message key={msg._id} msg={msg} prevMsg={currentMessages[i - 1]} />
              ))}

              {botTyping && (
                <div className="dc-msg dc-msg-bot">
                  <div className="dc-msg-avatar" style={{ background: 'linear-gradient(135deg, #00c853, #1b5e20)' }}>🤖</div>
                  <div className="dc-msg-body">
                    <div className="dc-msg-header">
                      <span className="dc-msg-name dc-msg-name-bot">KickBot ⚽</span>
                      <span className="dc-bot-badge">AI</span>
                    </div>
                    <div className="dc-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form className="dc-input-bar" onSubmit={handleSend}>
          <input
            ref={inputRef}
            className="dc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={activeChannelInfo?.adminOnly && user?.role !== 'admin'}
            placeholder={
              activeChannelInfo?.adminOnly && user?.role !== 'admin'
                ? 'Only admins can write in this channel.'
                : activeChannel === 'kickbot'
                ? 'Ask KickBot anything about football...'
                : `Message #${activeChannelInfo?.label}`
            }
            autoComplete="off"
            maxLength={500}
          />
          <button 
            className="dc-send-btn" 
            type="submit" 
            disabled={!input.trim() || (activeChannelInfo?.adminOnly && user?.role !== 'admin')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </form>
      </main>

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="upload-overlay" onClick={(e) => e.target.className === 'upload-overlay' && setShowAddModal(false)}>
          <div className="upload-modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Create Channel</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Channel ID (slug)</label>
                <input className="form-input" required value={newChan.id} onChange={e => setNewChan({...newChan, id: e.target.value})} placeholder="e.g. vip-chat" />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" required value={newChan.label} onChange={e => setNewChan({...newChan, label: e.target.value})} placeholder="e.g. VIP Lounge" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={newChan.desc} onChange={e => setNewChan({...newChan, desc: e.target.value})} placeholder="What is this channel about?" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
                <input type="checkbox" checked={newChan.adminOnly} onChange={e => setNewChan({...newChan, adminOnly: e.target.checked})} />
                Admin Only 🔒
              </label>
              <button type="submit" className="btn btn-primary">Create Channel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
