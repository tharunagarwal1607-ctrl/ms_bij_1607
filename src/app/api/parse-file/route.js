import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

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

    // 1. PDF Parsing
    if (fileName.toLowerCase().endsWith('.pdf') || fileType.includes('pdf')) {
      try {
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        const textResult = await parser.getText();
        extractedText = typeof textResult === 'string' ? textResult : textResult?.text || '';
      } catch (pdfErr) {
        console.warn('PDF parsing error:', pdfErr.message);
        return NextResponse.json({
          error: 'Could not extract text from PDF. It may be scanned or encrypted.',
          fileName,
        }, { status: 422 });
      }
    }
    // 2. DOCX Parsing
    else if (
      fileName.toLowerCase().endsWith('.docx') ||
      fileName.toLowerCase().endsWith('.doc') ||
      fileType.includes('wordprocessingml') ||
      fileType.includes('msword')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } catch (docErr) {
        console.warn('DOCX parsing error:', docErr.message);
        return NextResponse.json({
          error: 'Could not parse Word document.',
          fileName,
        }, { status: 422 });
      }
    }
    // 3. Plain Text / CSV / Markdown / Code files
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
