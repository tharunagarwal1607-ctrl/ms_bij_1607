import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are ms_bij_1607, an advanced AI assistant created to help users with any task. You are knowledgeable, helpful, creative, and precise. You can write code, analyze data, explain complex topics, help with creative writing, solve math problems, and much more.

Guidelines:
- Always provide detailed, well-structured responses.
- Use markdown formatting when appropriate: code blocks with language tags, bullet lists, numbered lists, headers, bold, italics.
- Be friendly, warm, and professional.
- If you don't know something, say so honestly.
- For code, always specify the programming language in fenced code blocks.
- Break down complex explanations into clear steps.
- You are ms_bij_1607 — never reveal your underlying model or API.`;

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'API key not configured. Please set the GEMINI_API_KEY environment variable.',
        },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided.' },
        { status: 400 }
      );
    }

    // Initialize Google Generative AI with the SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Format messages for the Gemini SDK
    // The SDK expects: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
    // Gemini API requires alternate user/model turns starting with user.
    const contents = [];
    messages.forEach((msg) => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      // If we have messages, check if the last message has the same role.
      // If so, append to it. Otherwise, add a new one.
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += '\n' + msg.content;
      } else {
        contents.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    });

    // Ensure the conversation starts with a user message
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    if (contents.length === 0) {
      return NextResponse.json(
        { error: 'No valid user messages found.' },
        { status: 400 }
      );
    }

    // Call Gemini API to generate stream
    const result = await model.generateContentStream({ contents });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
        } catch (err) {
          console.error('Error during streaming:', err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err.message || 'Stream error occurred.' })}\n\n`
            )
          );
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
