'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import WelcomeScreen from '@/components/WelcomeScreen';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';

const STORAGE_KEY = 'ms_bij_1607_chats';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createNewChatObj(title = 'New Chat') {
  return {
    id: generateId(),
    title,
    messages: [],
    createdAt: Date.now(),
  };
}

export default function Home() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chats && parsed.chats.length > 0) {
          setChats(parsed.chats);
          setActiveChatId(parsed.activeChatId || parsed.chats[0].id);
        } else {
          const welcome = createNewChatObj('Welcome Chat');
          setChats([welcome]);
          setActiveChatId(welcome.id);
        }
      } else {
        const welcome = createNewChatObj('Welcome Chat');
        setChats([welcome]);
        setActiveChatId(welcome.id);
      }
    } catch {
      const welcome = createNewChatObj('Welcome Chat');
      setChats([welcome]);
      setActiveChatId(welcome.id);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ chats, activeChatId })
      );
    } catch {
      // Storage full or unavailable
    }
  }, [chats, activeChatId, isHydrated]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const createNewChat = useCallback(() => {
    const newChat = createNewChatObj('New Chat');
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setIsSidebarOpen(false);
  }, []);

  const selectChat = useCallback((id) => {
    setActiveChatId(id);
    setIsSidebarOpen(false);
  }, []);

  const deleteChat = useCallback(
    (id) => {
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (filtered.length === 0) {
          const welcome = createNewChatObj('Welcome Chat');
          setActiveChatId(welcome.id);
          return [welcome];
        }
        if (activeChatId === id) {
          setActiveChatId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeChatId]
  );

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isLoading || !activeChatId) return;

      const userMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      // Add user message to the active chat
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat;
          const updated = {
            ...chat,
            messages: [...chat.messages, userMessage],
          };
          // Update title from first user message
          if (chat.messages.filter((m) => m.role === 'user').length === 0) {
            updated.title = text.trim().slice(0, 35) + (text.length > 35 ? '...' : '');
          }
          return updated;
        })
      );

      setIsLoading(true);

      try {
        // Get current messages for the API call
        const currentChat = chats.find((c) => c.id === activeChatId);
        const allMessages = [
          ...(currentChat?.messages || []),
          userMessage,
        ].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed with status ${response.status}`
          );
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botText = '';

        // Add an initial empty bot message
        const botTimestamp = Date.now();
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== activeChatId) return chat;
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  role: 'assistant',
                  content: '',
                  timestamp: botTimestamp,
                },
              ],
            };
          })
        );

        // Read stream
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.text) {
                  botText += parsed.text;

                  // Update the last bot message with accumulated text
                  setChats((prev) =>
                    prev.map((chat) => {
                      if (chat.id !== activeChatId) return chat;
                      const msgs = [...chat.messages];
                      const lastIdx = msgs.length - 1;
                      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                        msgs[lastIdx] = {
                          ...msgs[lastIdx],
                          content: botText,
                        };
                      }
                      return { ...chat, messages: msgs };
                    })
                  );
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        // If no response was received, add an error message
        if (!botText) {
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== activeChatId) return chat;
              const msgs = [...chat.messages];
              const lastIdx = msgs.length - 1;
              if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
                msgs[lastIdx] = {
                  ...msgs[lastIdx],
                  content:
                    "I'm sorry, I couldn't generate a response. Please try again.",
                };
              }
              return { ...chat, messages: msgs };
            })
          );
        }
      } catch (error) {
        console.error('Send message error:', error);
        // Add error message
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== activeChatId) return chat;
            // Remove the empty bot message if it exists, or update it
            const msgs = [...chat.messages];
            const lastIdx = msgs.length - 1;
            if (
              lastIdx >= 0 &&
              msgs[lastIdx].role === 'assistant' &&
              !msgs[lastIdx].content
            ) {
              msgs[lastIdx] = {
                ...msgs[lastIdx],
                content: `⚠️ ${error.message || 'Something went wrong. Please try again.'}`,
              };
            } else {
              msgs.push({
                role: 'assistant',
                content: `⚠️ ${error.message || 'Something went wrong. Please try again.'}`,
                timestamp: Date.now(),
              });
            }
            return { ...chat, messages: msgs };
          })
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeChatId, chats, isLoading]
  );

  const handleSuggestionClick = useCallback(
    (text) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  // Don't render until hydrated to avoid mismatch
  if (!isHydrated) {
    return (
      <div
        className="app-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  const hasMessages = activeChat && activeChat.messages.length > 0;

  return (
    <div className="app-container">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />

      <main className="main-content">
        <Header onToggleSidebar={toggleSidebar} />

        {hasMessages ? (
          <ChatArea
            messages={activeChat.messages}
            isLoading={isLoading}
          />
        ) : (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        )}

        <MessageInput onSend={sendMessage} isLoading={isLoading} />
      </main>
    </div>
  );
}
