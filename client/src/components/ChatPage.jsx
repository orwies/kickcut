import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getChatMessages } from '../api';
import { sendWS } from '../ws';
import { useWebSocket } from '../hooks/useWebSocket';

const CHANNELS = [
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
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState({ general: [], kickbot: [] });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [botTyping, setBotTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    inputRef.current?.focus();
    if (activeChannel === 'kickbot') setBotTyping(true);
    sendWS({ type: 'chat', channel: activeChannel, text });
  }

  const currentMessages = messages[activeChannel] || [];
  const activeChannelInfo = CHANNELS.find((c) => c.id === activeChannel);

  return (
    <div className="dc-layout">
      {/* ── Left Sidebar ── */}
      <aside className="dc-sidebar">
        <div className="dc-server-header">
          <div className="dc-server-icon">⚽</div>
          <div className="dc-server-info">
            <span className="dc-server-name">KickCut</span>
            <span className="dc-server-tag">Football Community</span>
          </div>
        </div>

        <div className="dc-section-label">Channels</div>
        <nav className="dc-channels">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              className={`dc-channel-btn ${activeChannel === ch.id ? 'dc-channel-active' : ''}`}
              onClick={() => setActiveChannel(ch.id)}
            >
              <span className="dc-channel-icon">{ch.icon}</span>
              <span className="dc-channel-name">{ch.label}</span>
              {ch.id === 'kickbot' && <span className="dc-ai-tag">AI</span>}
            </button>
          ))}
        </nav>

        <div className="dc-section-label">Online</div>
        <div className="dc-member">
          <div className="dc-member-dot" />
          <span className="dc-member-name">@{user?.username}</span>
          {user?.role === 'admin' && <span className="dc-admin-tag">Admin</span>}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="dc-main">
        {/* Header */}
        <header className="dc-header">
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
            placeholder={
              activeChannel === 'kickbot'
                ? 'Ask KickBot anything about football...'
                : `Message #${activeChannelInfo?.label}`
            }
            autoComplete="off"
            maxLength={500}
          />
          <button className="dc-send-btn" type="submit" disabled={!input.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </form>
      </main>
    </div>
  );
}
