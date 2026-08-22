'use client';

export default function Header({ onToggleSidebar }) {
  return (
    <header className="chat-header">
      <button className="mobile-menu-btn" onClick={onToggleSidebar}>
        ☰
      </button>
      <h1 className="header-title">ms_bij_1607</h1>
      <div className="model-selector">
        <span>ms_bij_1607 Pro</span>
        <span className="dropdown-arrow">▾</span>
      </div>
    </header>
  );
}
