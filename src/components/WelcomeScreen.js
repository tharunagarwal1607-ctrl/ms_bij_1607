'use client';

export default function WelcomeScreen({ onSuggestionClick }) {
  const suggestions = [
    {
      icon: '📸',
      title: 'Show a picture & details',
      desc: 'of a famous leader or actress',
      prompt: 'Tell me about Audrey Hepburn and show her picture',
    },
    {
      icon: '💡',
      title: 'Explain a complex topic',
      desc: 'like quantum computing in simple terms',
      prompt: 'Explain quantum computing in simple terms',
    },
    {
      icon: '</>',
      title: 'Write a script',
      desc: 'to scrape data or build a web app in Python',
      prompt: 'Write a Python script to scrape website data',
    },
    {
      icon: '📊',
      title: 'Analyze & Brainstorm',
      desc: 'pros and cons of renewable energy sources',
      prompt: 'Analyze the pros and cons of renewable energy sources',
    },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-logo-container">
        <img src="/logo.png" alt="MABIX Emblem" className="welcome-logo-img" />
      </div>
      <h2 className="welcome-title">Hello, I&apos;m MABIX</h2>
      <p className="welcome-subtitle">
        AI FOR YOUR JOURNEY &bull; Powered by <strong>MABIX 1.0 (core)</strong>
        <br />
        Ask me anything &mdash; write code, analyze topics, or ask for photos and details of famous people!
      </p>
      <div className="suggestion-cards">
        {suggestions.map((item, idx) => (
          <div
            key={idx}
            className="suggestion-card"
            onClick={() => onSuggestionClick(item.prompt)}
          >
            <span className="card-icon">{item.icon}</span>
            <div className="card-content">
              <div className="card-title">{item.title}</div>
              <div className="card-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
