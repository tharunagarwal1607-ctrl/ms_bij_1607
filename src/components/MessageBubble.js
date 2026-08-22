'use client';

import { useCallback } from 'react';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks: ```lang\ncode\n```
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const language = lang || 'code';
      return `<div class="code-block-wrapper"><div class="code-block-header"><span>${language}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)})">Copy</button></div><pre><code>${code.trim()}</code></pre></div>`;
    }
  );

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs: wrap remaining lines (that aren't already wrapped in tags)
  html = html.replace(/^(?!<[a-z/])(.*\S.*)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="message user-message">
        <div className="message-content">
          <p>{message.content}</p>
        </div>
        <div className="message-time">{formatTime(message.timestamp)}</div>
      </div>
    );
  }

  return (
    <div className="message bot-message">
      <div className="bot-avatar">M</div>
      <div className="message-content">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
      </div>
      <div className="message-time">{formatTime(message.timestamp)}</div>
    </div>
  );
}
