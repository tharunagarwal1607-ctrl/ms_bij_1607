'use client';

export default function Header({ onToggleSidebar }) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onToggleSidebar}>
          ☰
        </button>
        <div className="header-brand">
          <img src="/logo.png" alt="MABIX Logo" className="header-logo-img" />
          <h1 className="header-title">MABIX</h1>
        </div>
      </div>
      <div className="model-selector" title="Active AI Engine">
        <span className="model-status-dot"></span>
        <span>MABIX 1.0 (core)</span>
        <span className="dropdown-arrow">▾</span>
      </div>
    </header>
  );
}
