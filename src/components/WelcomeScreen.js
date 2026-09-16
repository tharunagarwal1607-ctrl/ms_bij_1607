'use client';

export default function WelcomeScreen({ onSuggestionClick }) {
  const pills = [
    {
      icon: '</>',
      label: 'Code',
      prompt: 'Help me write, debug, or optimize code for my project.',
    },
    {
      icon: '🎓',
      label: 'Learn',
      prompt: 'Teach me a complex concept step-by-step with clear real-world examples.',
    },
    {
      icon: '📈',
      label: 'Strategize',
      prompt: 'Help me build a step-by-step strategic plan and roadmap.',
    },
    {
      icon: '✏️',
      label: 'Write',
      prompt: 'Help me write and refine high-quality professional content.',
    },
    {
      icon: '☕',
      label: 'Life stuff',
      prompt: 'Give me practical tips, productivity routines, and daily advice.',
    },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-logo-container">
        <img src="/logo.png" alt="MABIX Emblem" className="welcome-logo-img" />
      </div>
      <h2 className="welcome-title">How can I help you today?</h2>
      <p className="welcome-subtitle">AI FOR YOUR JOURNEY</p>

      {/* Modern Action Pills */}
      <div className="action-pills-container">
        {pills.map((pill, idx) => (
          <button
            key={idx}
            type="button"
            className="action-pill-btn"
            onClick={() => onSuggestionClick(pill.prompt)}
          >
            <span className="action-pill-icon">{pill.icon}</span>
            <span className="action-pill-label">{pill.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
