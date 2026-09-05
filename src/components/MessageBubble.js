'use client';

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Process code blocks first so inner characters aren't touched
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const language = lang || 'code';
    // Escape HTML in code block
    const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBlocks.push(`<div class="code-block-wrapper"><div class="code-block-header"><span>${language}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('code').textContent).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)})">Copy</button></div><pre><code>${escapedCode.trim()}</code></pre></div>`);
    return `___CODEBLOCK_${idx}___`;
  });

  // Process inline code next
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escaped}</code>`);
    return `___INLINECODE_${idx}___`;
  });

  // Markdown Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const cleanUrl = url.trim();
    const cleanAlt = alt || 'MABIX Image';
    return `<div class="chat-image-card"><img src="${cleanUrl}" alt="${cleanAlt}" class="chat-response-image" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';"/><div class="image-caption">📷 ${cleanAlt}</div></div>`;
  });

  // Markdown Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/^(?!<[a-z/]|___CODEBLOCK)(.*\S.*)$/gm, '<p>$1</p>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  // Restore Code Blocks and Inline Code
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`___CODEBLOCK_${idx}___`, block);
  });
  inlineCodes.forEach((code, idx) => {
    html = html.replace(`___INLINECODE_${idx}___`, code);
  });

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
      <div className="bot-avatar-container" title="MABIX 1.0 (core)">
        <img src="/logo.png" alt="MABIX Avatar" className="bot-avatar-img" />
      </div>
      <div className="message-content">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
      </div>
      <div className="message-time">{formatTime(message.timestamp)}</div>
    </div>
  );
}
