import React, { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';

const ChatPanel = ({ messages, onSend, onClose, myEmailId }) => {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <span>In-call messages</span>
        <button onClick={onClose} className="icon-btn">
          <X size={16} />
        </button>
      </div>

      <div className="chat-panel__list" ref={listRef}>
        {messages.length === 0 && <div className="chat-panel__empty">No messages yet. Say hi!</div>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.emailId === myEmailId ? 'chat-msg--mine' : ''}`}>
            <div className="chat-msg__meta">
              <span className="chat-msg__author">{m.emailId === myEmailId ? 'You' : m.emailId}</span>
              <span className="chat-msg__time">
                {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="chat-msg__body">{m.message}</div>
          </div>
        ))}
      </div>

      <form className="chat-panel__input" onSubmit={submit}>
        <input
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="icon-btn">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
