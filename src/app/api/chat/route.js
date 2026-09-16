import { NextResponse } from 'next/server';

function getSystemPrompt() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const currentYear = now.getFullYear();

  return `You are MABIX, an ultra-intelligent, lightning-fast AI assistant created to operate with the capability, speed, and real-time knowledge of modern state-of-the-art AI.

Tagline: "AI FOR YOUR JOURNEY"
Engine: MABIX 1.0 (core)
Temporal Anchor: Today's current date is ${dateStr}. The current year is ${currentYear}.

Core Persona & Rules:
1. Identity: You are MABIX. Never mention third-party AI models, platforms, or APIs.
2. Present & Real-Time Knowledge:
   - Always prioritize CURRENT / PRESENT information as of ${currentYear}.
   - If asked about current leaders, ministers, presidents, awards, sports champions, latest movies, releases, or events, always provide the present, up-to-date answer.
   - When real-time web search or Wikipedia context is provided below, treat it as authoritative, factual truth.
3. Real Photos & Images:
   - When answering questions about people (actresses, actors, politicians, leaders, scientists, historical figures, places, landmarks, animals, objects) or when asked for a photo/picture, embed the provided REAL OFFICIAL PHOTO at the top of your response using markdown:
     ![Title](REAL_IMAGE_URL)
   - Never generate hallucinated or fake image URLs. Use the exact real image URL provided in context.
4. Response Format & Style:
   - Clean, direct, structured, and fast.
   - Use rich markdown: bold key points, bullet lists, headers, and formatted code blocks where helpful.`;
}

// High-speed, high-intelligence models on OpenRouter
const FAST_MODELS = [
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'nvidia/nemotron-3.5-lightning:free',
  'liquid/lfm-2.5-2.6b:free',
  'inclusionai/ling-3.0-flash-fin:free',
  'cohere/north-mini-code:free',
];

// Real-Time Web & Wikipedia Intelligence Fetcher (< 1.5s in parallel)
async function fetchRealTimeIntelligence(query) {
  let webSnippets = [];
  let wikiResults = [];
  let imageUrl = null;
  let imageTitle = null;

  // 1. DuckDuckGo Web Search for latest news, present status, and facts
  const webPromise = (async () => {
    try {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(2200),
      });
      const html = await res.text();
      const regex = /<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
      let match;
      while ((match = regex.exec(html)) !== null && webSnippets.length < 4) {
        const clean = match[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (clean && clean.length > 20) {
          webSnippets.push(clean);
        }
      }
    } catch {
      // Ignore web search errors gracefully
    }
  })();

  // 2. Wikipedia API for authoritative summaries + official high-resolution photos
  const wikiPromise = (async () => {
    try {
      const cleanQ =
        query
          .replace(
            /who is|what is|tell me about|show me a picture of|show photo of|picture of|photo of|image of|details of|current|present|latest|recent/gi,
            ''
          )
          .trim() || query;

      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanQ
      )}&utf8=&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(2000) });
      const searchData = await searchRes.json();
      const results = searchData.query?.search || [];
      if (!results.length) return;

      const titles = results.slice(0, 2).map((r) => r.title).join('|');
      const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        titles
      )}&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=1000&format=json&origin=*`;
      const pageRes = await fetch(pageUrl, { signal: AbortSignal.timeout(2000) });
      const pageData = await pageRes.json();
      const pages = Object.values(pageData.query?.pages || {});

      for (const p of pages) {
        if (p.extract) {
          wikiResults.push({
            title: p.title,
            extract: p.extract.slice(0, 450),
          });
        }
        if (!imageUrl && p.thumbnail?.source) {
          imageUrl = p.thumbnail.source;
          imageTitle = p.title;
        }
      }
    } catch {
      // Ignore wiki search errors gracefully
    }
  })();

  await Promise.allSettled([webPromise, wikiPromise]);

  return { webSnippets, wikiResults, imageUrl, imageTitle };
}

async function callOpenRouterWithTimeout(apiKey, messages, model, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mabix.netlify.app',
        'X-Title': 'MABIX AI Chat',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.5,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set OPENROUTER_API_KEY.' },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Fetch live web search snippets + Wikipedia facts + real photo
    let liveContext = '';
    if (lastUserMsg && lastUserMsg.trim().length > 1) {
      const intel = await fetchRealTimeIntelligence(lastUserMsg);

      const parts = [];
      if (intel.webSnippets.length > 0) {
        parts.push(`[LIVE WEB SEARCH RESULTS - PRESENT STATUS]:\n${intel.webSnippets.join('\n---\n')}`);
      }
      if (intel.wikiResults.length > 0) {
        const wikiText = intel.wikiResults.map((w) => `• ${w.title}: ${w.extract}`).join('\n');
        parts.push(`[ENCYCLOPEDIC REFERENCE]:\n${wikiText}`);
      }
      if (intel.imageUrl) {
        parts.push(
          `[REAL OFFICIAL PHOTO AVAILABLE]:\nTitle: ${intel.imageTitle || 'Photo'}\nImage URL: ${intel.imageUrl}\nINSTRUCTION: Embed this real photo at the very beginning of your answer:\n![${intel.imageTitle || 'Image'}](${intel.imageUrl})`
        );
      }

      if (parts.length > 0) {
        liveContext = `\n\n=== REAL-TIME GROUND TRUTH INTELLIGENCE ===\n${parts.join('\n\n')}\n===========================================`;
      }
    }

    const fullSystemPrompt = getSystemPrompt() + liveContext;

    const openRouterMessages = [
      { role: 'system', content: fullSystemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    let response = null;

    // Fast failover loop (3.5s limit per model call)
    for (const model of FAST_MODELS) {
      response = await callOpenRouterWithTimeout(apiKey, openRouterMessages, model, 3500);
      if (response && response.ok) {
        break;
      }
      response = null;
    }

    if (!response) {
      return NextResponse.json(
        { error: 'MABIX is experiencing high network load. Please resend your message.' },
        { status: 503 }
      );
    }

    // Stream SSE back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data: ')) continue;

              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                  );
                }
              } catch {
                // Skip partial JSON chunks
              }
            }
          }
        } catch (err) {
          console.error('[MABIX] Streaming error:', err);
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[MABIX] Handler error:', error);
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
