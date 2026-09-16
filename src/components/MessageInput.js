'use client';

import { useState, useRef, useEffect } from 'react';

export default function MessageInput({ onSend, isLoading }) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const processFile = async (file) => {
    const isImage = file.type.startsWith('image/');
    const fileName = file.name;
    const fileSize = file.size;

    // 1. Process Image
    if (isImage) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Math.random().toString(36).substring(2, 9),
            name: fileName,
            size: fileSize,
            type: file.type,
            isImage: true,
            dataUrl: e.target.result,
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // 2. Process Plain Text / CSV / Code
    const textExtensions = ['.txt', '.csv', '.json', '.md', '.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.xml', '.sql', '.log'];
    const isTextFile = textExtensions.some((ext) => fileName.toLowerCase().endsWith(ext)) || file.type.startsWith('text/');

    if (isTextFile) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Math.random().toString(36).substring(2, 9),
            name: fileName,
            size: fileSize,
            type: file.type || 'text/plain',
            isImage: false,
            textContent: e.target.result,
          });
        };
        reader.readAsText(file);
      });
    }

    // 3. Process PDF & DOCX via server-side /api/parse-file
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.text) {
        return {
          id: Math.random().toString(36).substring(2, 9),
          name: fileName,
          size: fileSize,
          type: file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/docx'),
          isImage: false,
          textContent: data.text,
        };
      } else {
        alert(data.error || `Could not parse text from ${fileName}.`);
        return null;
      }
    } catch (err) {
      console.error('File parsing error:', err);
      alert(`Failed to parse ${fileName}.`);
      return null;
    }
  };

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessingFiles(true);

    const newAttachments = [];
    for (const file of Array.from(fileList)) {
      // Limit file size to 25MB
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 25MB limit.`);
        continue;
      }
      const item = await processFile(file);
      if (item) newAttachments.push(item);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsProcessingFiles(false);
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Clipboard paste support (e.g. pasting screenshot)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || isProcessingFiles) return;

    onSend(trimmed || (attachments.some((a) => a.isImage) ? 'Please analyze this attached image in detail.' : 'Please analyze the attached document.'), attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📑';
      case 'csv':
      case 'xlsx': return '📊';
      case 'txt': return '📝';
      case 'json':
      case 'js':
      case 'py':
      case 'html':
      case 'css': return '💻';
      default: return '📎';
    }
  };

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isLoading && !isProcessingFiles;

  return (
    <div
      className={`input-area ${isDragging ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md,.py,.js,.jsx,.ts,.tsx,.html,.css,.xml,.sql,.log"
        style={{ display: 'none' }}
      />

      <div className="input-container">
        {/* Attachments Preview Shelf */}
        {attachments.length > 0 && (
          <div className="attachments-shelf">
            {attachments.map((att) => (
              <div key={att.id} className="attachment-chip">
                {att.isImage ? (
                  <div className="attachment-thumb-wrapper">
                    <img src={att.dataUrl} alt={att.name} className="attachment-thumb" />
                  </div>
                ) : (
                  <span className="attachment-icon">{getFileIcon(att.name)}</span>
                )}
                <div className="attachment-details">
                  <span className="attachment-name" title={att.name}>
                    {att.name}
                  </span>
                  <span className="attachment-size">{formatFileSize(att.size)}</span>
                </div>
                <button
                  type="button"
                  className="attachment-remove-btn"
                  onClick={() => removeAttachment(att.id)}
                  title="Remove attachment"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {isProcessingFiles && (
          <div className="attachment-loading">
            <span className="loading-spinner"></span>
            <span>Processing and extracting file content...</span>
          </div>
        )}

        <div className="input-row">
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image, PDF, DOCX, TXT, CSV, or Code"
          >
            <span className="attach-icon">📎</span>
            <span className="attach-label">Upload</span>
          </button>

          <textarea
            ref={textareaRef}
            className="message-input"
            placeholder="Ask MABIX, or upload an image/document..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            disabled={isLoading}
          />

          <button
            className={`send-btn ${canSend ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!canSend}
            title="Send message (Enter)"
          >
            ➤
          </button>
        </div>
      </div>

      <p className="input-disclaimer">
        MABIX 1.0 (core) &bull; Multimodal AI with Vision & Document Understanding &bull; Verify important facts
      </p>
    </div>
  );
}
