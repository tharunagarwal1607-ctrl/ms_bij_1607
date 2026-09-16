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

  return `You are MABIX, an ultra-intelligent, lightning-fast multimodal AI assistant built to operate with the power, speed, visual understanding, and real-time knowledge of modern state-of-the-art AI.

Tagline: "AI FOR YOUR JOURNEY"
Engine: MABIX 1.0 (core)
Temporal Anchor: Today's date is ${dateStr}. Current year is ${currentYear}.

Core Capabilities & Guidelines:
1. Identity: You are MABIX. Never mention third-party AI models, platforms, or APIs.
2. Multimodal & Vision Understanding:
   - When the user uploads an image (diagram, code screenshot, architecture flowchart, chart, photo, handwritten note, exam question paper, math formula, object, UI mockup, or document scan), analyze it with deep precision and detail.
   - If asked "Explain this diagram", break down the components, flow, data structures, and concepts step-by-step.
   - If asked "What is wrong with this code?", identify the exact bugs, syntax errors, logic flaws, and provide the corrected code with explanation.
   - If asked "Read this question paper" or to solve problems from an image, extract questions accurately and provide thorough, step-by-step solutions and answers.
3. Document Understanding (PDF, DOCX, TXT, CSV, Code):
   - When documents or data files are attached, analyze their text content thoroughly.
   - Summarize, answer questions, extract data points, analyze CSV tabular data, explain contracts, review code files, and solve questions from attached documents.
4. Present & Real-Time Knowledge:
   - Always prioritize CURRENT / PRESENT facts as of ${currentYear}.
   - When real-time web search or Wikipedia context is provided below, treat it as authoritative, factual truth.
5. Real Photos & Images:
   - When answering questions about people (actresses, actors, politicians, leaders, scientists, places, landmarks) or when asked for photos, embed the provided REAL OFFICIAL PHOTO at the top of your response:
     ![Title](REAL_IMAGE_URL)
6. Response Style:
   - Extremely fast, precise, well-structured, and helpful.
   - Use rich markdown: bolding, bullet points, headers, tables, and formatted code blocks with syntax highlighting.`;
}

// Multimodal and High-Speed models on OpenRouter
const FAST_MODELS = [
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-small-24b-instruct-2501:free',
  'meta-llama/llama-3.3-70b-instruct:free',
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

async function callOpenRouterWithTimeout(apiKey, messages, model, timeoutMs = 4500) {
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

    const lastUserMsgObj = [...messages].reverse().find((m) => m.role === 'user');
    const lastUserText =
      typeof lastUserMsgObj?.content === 'string'
        ? lastUserMsgObj.content
        : Array.isArray(lastUserMsgObj?.content)
        ? lastUserMsgObj.content.find((c) => c.type === 'text')?.text || ''
        : '';

    // Fetch live web search snippets + Wikipedia facts + real photo if text query is present
    let liveContext = '';
    const hasAttachments = Boolean(
      lastUserMsgObj?.attachments?.length ||
        (Array.isArray(lastUserMsgObj?.content) &&
          lastUserMsgObj.content.some((c) => c.type === 'image_url'))
    );

    if (lastUserText && lastUserText.trim().length > 2 && !hasAttachments) {
      const intel = await fetchRealTimeIntelligence(lastUserText);

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

    // Convert client messages to OpenAI / OpenRouter Multimodal format
    const openRouterMessages = [
      { role: 'system', content: fullSystemPrompt },
      ...messages.map((m) => {
        const role = m.role === 'assistant' ? 'assistant' : 'user';

        // Check if message has attached images or text documents
        const attachments = m.attachments || [];
        const imageAttachments = attachments.filter((a) => a.isImage && a.dataUrl);
        const docAttachments = attachments.filter((a) => !a.isImage && a.textContent);

        let userText = typeof m.content === 'string' ? m.content : '';

        // Append document contents to the user text prompt
        if (docAttachments.length > 0) {
          const docSection = docAttachments
            .map(
              (doc) =>
                `\n\n--- [ATTACHED FILE: ${doc.name} (${doc.type || 'document'})] ---\n${doc.textContent}\n--- [END OF ${doc.name}] ---`
            )
            .join('\n');
          userText = (userText ? userText + '\n' : '') + docSection;
        }

        // If message has images, use Multimodal Content Array format
        if (imageAttachments.length > 0) {
          const contentArray = [
            { type: 'text', text: userText || 'Please analyze this attached image in detail.' },
            ...imageAttachments.map((img) => ({
              type: 'image_url',
              image_url: {
                url: img.dataUrl,
              },
            })),
          ];
          return { role, content: contentArray };
        }

        // If already in array content format
        if (Array.isArray(m.content)) {
          return { role, content: m.content };
        }

        return { role, content: userText || m.content || '' };
      }),
    ];

    let response = null;

    // Fast failover loop (4s limit per model call)
    for (const model of FAST_MODELS) {
      response = await callOpenRouterWithTimeout(apiKey, openRouterMessages, model, 4000);
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
