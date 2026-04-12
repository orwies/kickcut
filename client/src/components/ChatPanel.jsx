import { useState, useEffect, useRef } from 'react';
import { getChatMessages } from '../api';
import { sendChat } from '../ws';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ username }) {
  return (
    <div className="chat-avatar" aria-hidden="true">
      {username?.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function ChatPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef();
  const inputRef = useRef();

  // Load history when opening
  useEffect(() => {
    if (!open) return;
    setUnread(0);
    getChatMessages()
      .then(setMessages)
      .catch(() => {});
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Real-time incoming messages
  useWebSocket('chat_message', (msg) => {
    setMessages((prev) => [...prev, msg]);
    if (!open) setUnread((n) => n + 1);
  });

  function toggleOpen() {
    setOpen((v) => !v);
    if (!open) setUnread(0);
  }

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendChat(text);
    setInput('');
    inputRef.current?.focus();
  }

  return (
    <>
      {/* Floating chat toggle button */}
      <button
        id="chat-toggle-btn"
        className="chat-toggle"
        onClick={toggleOpen}
        aria-label={open ? 'Close chat' : 'Open chat'}
        title="Live Chat"
      >
        {open ? '✕' : '💬'}
        {unread > 0 && !open && (
          <span className="chat-unread">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel" id="chat-panel" role="dialog" aria-label="Live chat">
          <div className="chat-header">
            <span className="chat-title">⚡ Live Chat</span>
            <div className="chat-status">
              <div className="chat-dot" />
              Live
            </div>
          </div>

          <div className="chat-messages" id="chat-messages" aria-live="polite">
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 24 }}>
                No messages yet. Say hi! 👋
              </p>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.userId === user?.id;
              return (
                <div key={msg._id || i} className={`chat-msg${isOwn ? ' own' : ''}`}>
                  <Avatar username={msg.username} />
                  <div className="chat-bubble">
                    {!isOwn && <span className="chat-bubble-name">{msg.username}</span>}
                    {msg.text}
                    <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend} id="chat-form">
            <input
              ref={inputRef}
              id="chat-input"
              className="chat-input"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              autoComplete="off"
            />
            <button
              id="chat-send-btn"
              className="chat-send"
              type="submit"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
