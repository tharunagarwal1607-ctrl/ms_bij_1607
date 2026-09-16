import { NextResponse } from 'next/server';
import zlib from 'zlib';
import mammoth from 'mammoth';

function extractPdfText(buffer) {
  let text = '';
  try {
    const raw = buffer.toString('binary');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;

    while ((match = streamRegex.exec(raw)) !== null) {
      const streamBytes = Buffer.from(match[1], 'binary');
      try {
        const decompressed = zlib.inflateSync(streamBytes).toString('utf-8');
        // Extract text between BT and ET blocks
        const textMatches = decompressed.match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g);
        if (textMatches) {
          for (const tm of textMatches) {
            const clean = tm
              .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
              .replace(/\\(.)/g, '$1')
              .replace(/[()\[\]]|Tj|TJ/g, '')
              .trim();
            if (clean) text += clean + ' ';
          }
        }
      } catch {
        // Not a valid zlib stream or raw text
      }
    }

    if (!text.trim()) {
      const directMatches = raw.match(/\((.*?)\)\s*Tj/g);
      if (directMatches) {
        text = directMatches.map((m) => m.replace(/[()]/g, '').replace(/Tj/g, '').trim()).join(' ');
      }
    }
  } catch (err) {
    console.warn('PDF extraction notice:', err.message);
  }
  return text.trim();
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name || 'document';
    const fileType = file.type || '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    // 1. PDF File
    if (fileName.toLowerCase().endsWith('.pdf') || fileType.includes('pdf')) {
      extractedText = extractPdfText(buffer);
      if (!extractedText) {
        extractedText = `[PDF Document: ${fileName} (Binary PDF content parsed)]`;
      }
    }
    // 2. Word DOCX File
    else if (
      fileName.toLowerCase().endsWith('.docx') ||
      fileName.toLowerCase().endsWith('.doc') ||
      fileType.includes('wordprocessingml') ||
      fileType.includes('msword')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } catch {
        extractedText = buffer.toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    // 3. Plain Text / CSV / Markdown / Code / JSON
    else {
      try {
        extractedText = buffer.toString('utf-8');
      } catch {
        extractedText = '';
      }
    }

    return NextResponse.json({
      success: true,
      fileName,
      fileSize: file.size,
      text: extractedText,
      charCount: extractedText.length,
    });
  } catch (error) {
    console.error('File parsing handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}
