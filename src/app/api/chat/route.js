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

// Free models on OpenRouter — ordered by preference. If one hits rate limit, try the next.
const FREE_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'minimax/minimax-m3:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
];

async function callOpenRouter(apiKey, messages, model) {
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
      temperature: 0.9,
      max_tokens: 8192,
    }),
  });
  return response;
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set the OPENROUTER_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
    }

    // Build messages array with system prompt
    const openRouterMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    // Try each free model until one works
    let response = null;
    let lastError = '';

    for (const model of FREE_MODELS) {
      console.log(`Trying model: ${model}`);
      response = await callOpenRouter(apiKey, openRouterMessages, model);

      if (response.ok) {
        console.log(`Success with model: ${model}`);
        break;
      }

      // If rate limited (429) or quota exceeded, try next model
      if (response.status === 429) {
        const errorText = await response.text();
        console.warn(`Model ${model} rate limited: ${errorText}`);
        lastError = errorText;
        response = null;
        continue;
      }

      // For other errors, don't retry
      break;
    }

    if (!response) {
      return NextResponse.json(
        { error: 'All AI models are currently at capacity. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);

      let userMessage = 'Failed to get a response from the AI.';
      if (response.status === 429) userMessage = 'Rate limit reached. Please wait a moment and try again.';
      else if (response.status === 401) userMessage = 'Invalid API key. Please check your OPENROUTER_API_KEY.';
      else if (response.status === 402) userMessage = 'Insufficient credits on OpenRouter account.';

      return NextResponse.json({ error: userMessage }, { status: response.status });
    }

    // Stream the OpenAI-format SSE back to client
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
                // Skip malformed chunks
              }
            }
          }
        } catch (err) {
          console.error('Stream reading error:', err);
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
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
