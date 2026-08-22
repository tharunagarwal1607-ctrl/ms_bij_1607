'use client';

export default function WelcomeScreen({ onSuggestionClick }) {
  const suggestions = [
    {
      icon: '💡',
      title: 'Explain a complex topic',
      desc: 'like quantum computing in simple terms',
      prompt: 'Explain quantum computing in simple terms',
    },
    {
      icon: '</>',
      title: 'Write a script',
      desc: 'to scrape a website in Python',
      prompt: 'Write a Python script to scrape a website',
    },
    {
      icon: '✉️',
      title: 'Draft an email',
      desc: 'professional email to your manager',
      prompt:
        'Help me write a professional email to my manager about a project update',
    },
    {
      icon: '📊',
      title: 'Analyze a topic',
      desc: 'pros and cons of renewable energy',
      prompt: 'Analyze the pros and cons of renewable energy sources',
    },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-logo">
        <div className="logo-gradient" />
      </div>
      <h2 className="welcome-title">Hello, I&apos;m ms_bij_1607</h2>
      <p className="welcome-subtitle">
        How can I help you today? I can write code, analyze data, or help you
        brainstorm ideas.
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
