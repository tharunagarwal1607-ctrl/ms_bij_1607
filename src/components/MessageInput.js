'use client';

import { useState, useRef, useEffect } from 'react';

export default function MessageInput({ onSend, isLoading }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-area">
      <div className="input-container">
        <button className="attach-btn" title="Attach file or image prompt">
          📎
        </button>
        <textarea
          ref={textareaRef}
          className="message-input"
          placeholder="Ask MABIX"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <button
          className={`send-btn ${input.trim() ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          title="Send message"
        >
          ➤
        </button>
      </div>
      <p className="input-disclaimer">
        MABIX 1.0 (core) &bull; MABIX can make mistakes. Consider verifying important information.
      </p>
    </div>
  );
}
