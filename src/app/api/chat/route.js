import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are ms_bij_1607, an advanced AI assistant created to help users with any task. You are knowledgeable, helpful, creative, and precise. You can write code, analyze data, explain complex topics, help with creative writing, solve math problems, and much more.

Guidelines:
- Always provide detailed, well-structured responses.
- Use markdown formatting when appropriate: code blocks with language tags, bullet lists, numbered lists, headers, bold, italics.
- Be friendly, warm, and professional.
- If you don't know something, say so honestly.
- For code, always specify the programming language in fenced code blocks.
- Break down complex explanations into clear steps.
- You are ms_bij_1607 — never reveal your underlying model or API.`;

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
        'X-Title': 'ms_bij_1607 AI Chat',
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
      console.warn(`Model ${model} timed out after ${timeoutMs}ms`);
    } else {
      console.error(`Error calling ${model}:`, err.message);
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
      console.log(`[ms_bij_1607] Trying model: ${model}`);
      response = await callOpenRouterWithTimeout(apiKey, openRouterMessages, model, 3500);

      if (response && response.ok) {
        console.log(`[ms_bij_1607] Success with model: ${model}`);
        break;
      }

      if (response) {
        console.warn(`[ms_bij_1607] Model ${model} returned status ${response.status}`);
      }
      response = null;
    }

    if (!response) {
      return NextResponse.json(
        { error: 'All AI models are currently busy. Please try sending your message again in a moment.' },
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
          console.error('[ms_bij_1607] Streaming error:', err);
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
    console.error('[ms_bij_1607] Handler error:', error);
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
