import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are MABIX, a world-class AI assistant built to operate with the speed, intelligence, and precision of ChatGPT.

Tagline: "AI FOR YOUR JOURNEY"
Engine: MABIX 1.0 (core)

Core Persona & Rules:
1. Identity: You are MABIX. Never mention third-party AI models, platforms, or APIs.
2. Accuracy & Up-to-date Knowledge:
   - Always state accurate, current facts (e.g. D. K. Shivakumar is the Chief Minister of Karnataka since June 2026).
   - If real-time factual context or Wikipedia extracts are provided in the system context below, treat them as authoritative and accurate.
3. Real Photos & Images:
   - When answering questions about people (actresses, actors, famous leaders, politicians, historical figures, places, landmarks, animals, objects) or when asked for a photo/picture, embed the provided REAL OFFICIAL PHOTO at the top of your response using standard markdown image format:
     ![Title](REAL_IMAGE_URL)
   - Do NOT construct fake image links or broken placeholder URLs. Use exact real image URLs provided in context or valid real web image links.
4. Response Style:
   - Extremely fast, precise, well-structured, and helpful.
   - Use clear markdown: bolding, bullet points, headers, formatted code blocks with language identifiers.`;

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

// Helper: Fetch real Wikipedia image & facts in ~200ms
async function fetchRealWikiData(userQuery) {
  try {
    // Extract query terms or cleaned search string
    let searchQuery = userQuery
      .replace(/who is|what is|tell me about|show me a picture of|show photo of|picture of|photo of|image of|details of/gi, '')
      .trim();

    if (!searchQuery || searchQuery.length < 2) {
      searchQuery = userQuery.trim();
    }

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&utf8=&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(2000) });
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];

    if (results.length === 0) return null;

    const topTitle = results[0].title;
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(topTitle)}&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=1000&format=json&origin=*`;
    const pageRes = await fetch(pageUrl, { signal: AbortSignal.timeout(2000) });
    const pageData = await pageRes.json();
    const pages = pageData.query?.pages || {};
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (!page || page.invalid !== undefined) return null;

    return {
      title: page.title || topTitle,
      extract: page.extract ? page.extract.slice(0, 600) : '',
      imageUrl: page.thumbnail?.source || null,
    };
  } catch (err) {
    console.warn('[MABIX Wiki Fetch] Warning:', err.message);
    return null;
  }
}

async function callOpenRouterWithTimeout(apiKey, messages, model, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mabix.netlify.app',
        'X-Title': 'MABIX AI Chat',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.6,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
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

    // Fetch real Wikipedia facts & real official photo in parallel (< 250ms)
    let wikiContext = '';
    let realImageData = null;

    if (lastUserMsg) {
      realImageData = await fetchRealWikiData(lastUserMsg);
      if (realImageData) {
        wikiContext = `\n\n[AUTHORITATIVE REAL-TIME CONTEXT & REAL PHOTO]:
Subject: ${realImageData.title}
Key Facts: ${realImageData.extract}
Real Official Image URL: ${realImageData.imageUrl || 'None'}

INSTRUCTION: If Real Official Image URL is present, start your response by embedding it:
![${realImageData.title}](${realImageData.imageUrl})
Use the facts above to answer accurately!`;
      }
    }

    const fullSystemPrompt = SYSTEM_PROMPT + wikiContext;

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
