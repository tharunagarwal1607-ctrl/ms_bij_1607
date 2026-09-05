import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are MABIX, an advanced AI assistant powered by the MABIX 1.0 (core) engine. You are knowledgeable, helpful, creative, precise, and visual.

Tagline: "AI FOR YOUR JOURNEY"
Model Name: MABIX 1.0 (core)

Core Capabilities & Guidelines:
1. Identity: Always identify yourself as MABIX (powered by MABIX 1.0 (core)). Never reveal underlying third-party API providers or models.
2. Rich Visuals & Pictures:
   - WHENEVER the user asks for information, details, biography, or facts about famous people, actresses, actors, world leaders, historical figures, landmarks, places, animals, or objects, OR explicitly asks for a picture/photo, YOU MUST INCLUDE A RELEVANT HIGH-QUALITY IMAGE using Markdown image syntax:
     ![Exact Name or Description](https://image.pollinations.ai/prompt/hd%20portrait%20photo%20of%20[Name_or_Subject]?nologo=true)
   - For example:
     - For Mahatma Gandhi: ![Mahatma Gandhi](https://image.pollinations.ai/prompt/portrait%20photo%20of%20Mahatma%20Gandhi?nologo=true)
     - For Audrey Hepburn: ![Audrey Hepburn](https://image.pollinations.ai/prompt/portrait%20photo%20of%20Audrey%20Hepburn?nologo=true)
     - For Taj Mahal: ![Taj Mahal](https://image.pollinations.ai/prompt/photo%20of%20Taj%20Mahal?nologo=true)
   - Always place the image near the beginning of your response so the user sees a photo immediately alongside your detailed text response.
3. Code & Markdown Formatting:
   - Provide well-structured answers using Markdown headers, lists, bold text, and fenced code blocks with language tags.
4. Tone: Friendly, inspiring, accurate, professional, and visually engaging.`;

// Ultra-fast working free models on OpenRouter (benchmarked for < 1s response time)
const FAST_FREE_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'liquid/lfm-2.5-2.6b:free',
  'cohere/north-mini-code:free',
  'inclusionai/ling-3.0-flash-fin:free',
  'poolside/laguna-xs-2.1:free',
  'minimax/minimax-m3:free',
  'dots-studio/dots-3-note-preview:free',
];

async function callOpenRouterWithTimeout(apiKey, messages, model, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ms-bij-1607.netlify.app',
        'X-Title': 'MABIX AI Chat',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn(`[MABIX] Model ${model} timed out after ${timeoutMs}ms`);
    } else {
      console.error(`[MABIX] Error calling ${model}:`, err.message);
    }
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

    const openRouterMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    let response = null;

    // Fast-fail loop with strict 3.5s per-model timeout to avoid Netlify 504
    for (const model of FAST_FREE_MODELS) {
      console.log(`[MABIX 1.0 (core)] Trying model: ${model}`);
      response = await callOpenRouterWithTimeout(apiKey, openRouterMessages, model, 3500);

      if (response && response.ok) {
        console.log(`[MABIX 1.0 (core)] Success with model: ${model}`);
        break;
      }

      if (response) {
        console.warn(`[MABIX 1.0 (core)] Model ${model} returned status ${response.status}`);
      }
      response = null;
    }

    if (!response) {
      return NextResponse.json(
        { error: 'MABIX is currently busy processing high traffic. Please try again in a moment.' },
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
