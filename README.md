# ms_bij_1607 — AI Chatbot

A premium AI chatbot powered by Google Gemini API with a beautiful dark-themed interface.

## Features

- 🤖 Intelligent AI responses powered by Google Gemini 2.0 Flash
- 💬 Multiple chat conversations with localStorage persistence
- ✨ Premium dark UI with glassmorphism effects and smooth animations
- 📝 Markdown rendering with syntax-highlighted code blocks
- 📱 Fully responsive design (desktop & mobile)
- ⚡ Real-time streaming responses

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Local Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```
4. Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deploy to Netlify

### Option 1: Netlify CLI (Recommended)

1. Install the Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Login to Netlify:
   ```bash
   netlify login
   ```
3. Initialize and deploy:
   ```bash
   netlify init
   netlify deploy --prod
   ```
4. Set the environment variable in Netlify Dashboard:
   - Go to **Site settings** → **Environment variables**
   - Add `GEMINI_API_KEY` with your API key value

### Option 2: GitHub + Netlify Dashboard

1. Push this project to a GitHub repository
2. Go to [Netlify](https://app.netlify.com) and click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repo
4. Build settings will be auto-detected from `netlify.toml`
5. Add environment variable `GEMINI_API_KEY` in the deploy settings
6. Click **Deploy**

## Tech Stack

- **Frontend**: Next.js (App Router), React, Vanilla CSS
- **Backend**: Next.js API Routes (serverless)
- **AI**: Google Gemini 2.0 Flash API
- **Deployment**: Netlify

## License

MIT
