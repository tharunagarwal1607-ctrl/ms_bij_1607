'use client';

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatArea({ messages, isLoading }) {
  const chatEndRef = useRef(null);
  const chatAreaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-area" ref={chatAreaRef}>
      <div className="messages-container">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isLoading && (
          <div className="message bot-message">
            <div className="bot-avatar-container" title="MABIX 1.0 (core)">
              <img src="/logo.png" alt="MABIX Avatar" className="bot-avatar-img glowing-avatar" />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
