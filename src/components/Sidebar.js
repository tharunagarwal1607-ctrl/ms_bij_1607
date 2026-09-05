'use client';

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onToggle,
}) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="MABIX Logo" className="sidebar-logo-img" />
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">MABIX</span>
              <span className="sidebar-brand-tagline">AI FOR YOUR JOURNEY</span>
            </div>
          </div>
          <button className="new-chat-btn" onClick={onNewChat}>
            <span className="plus-icon">+</span> New Chat
          </button>
        </div>

        <div className="sidebar-chats">
          <div className="chats-label">Recent Conversations</div>
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => onSelectChat(chat.id)}
            >
              <span className="chat-icon">💬</span>
              <span className="chat-title">{chat.title}</span>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                title="Delete chat"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <img src="/logo.png" alt="MABIX" className="user-avatar-img" />
            <div className="profile-info">
              <span className="user-name">MABIX</span>
              <span className="user-model-badge">MABIX 1.0 (core)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
      />
    </>
  );
}
