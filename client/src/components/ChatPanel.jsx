import { useState, useEffect, useRef } from 'react';
import { getChatMessages } from '../api';
import { sendChat } from '../ws';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';

/**
 * Helper to extract the 24-hour clock time from a date string.
 * Receives a valid 'dateStr' string.
 * Returns the formatted time string (e.g., '14:30').
 */
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Displays a minimal text-based avatar for the chat panel.
 * Receives the 'username' string.
 * Slices the first two letters of the name to create a visual badge.
 * Returns the JSX element for the avatar.
 */
function Avatar({ username }) {
  return (
    <div className="chat-avatar" aria-hidden="true">
      {username?.slice(0, 2).toUpperCase()}
    </div>
  );
}

/**
 * Floating chat panel component available globally across the application.
 * Takes no props.
 * Manages opening/closing the chat overlay, tracking unread messages, and sending quick chat replies to the 'general' channel.
 * Returns the JSX layout for the floating chat window.
 */
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

  // Real-time incoming messages — only general channel (kickbot messages stay private)
  useWebSocket('chat_message', (msg) => {
    const ch = msg.channel || 'general';
    if (ch !== 'general') return;
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
    if (!open) setUnread((n) => n + 1);
  });

  /**
   * Toggles the visibility of the floating chat panel.
   * Takes no arguments.
   * Flips the open state boolean and resets the unread message counter if opening.
   * Returns nothing.
   */
  function toggleOpen() {
    setOpen((v) => !v);
    if (!open) setUnread(0);
  }

  /**
   * Handles sending a message from the panel to the general channel.
   * Receives the form submit event 'e'.
   * Prevents default form submission, trims input, calls the sendChat WebSocket helper, and refocuses the input field.
   * Returns nothing.
   */
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
