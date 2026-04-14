"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export function ChatClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/chat");
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch {
        // silent fail
      } finally {
        setInitialLoading(false);
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: "temp-" + Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();

      // Replace temp message with real ones
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, data.userMessage, data.assistantMessage];
      });
    } catch (err) {
      // Remove temp message, show error
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...filtered,
          tempUserMsg,
          {
            id: "error-" + Date.now(),
            role: "assistant",
            content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
            createdAt: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function handleClear() {
    if (!confirm("Clear all chat history?")) return;

    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages([]);
    } catch {
      // silent fail
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatContent(content: string) {
    // Simple markdown rendering
    const html = content
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="chat-code-block"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
    return html;
  }

  if (initialLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col sm:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)]">
            <Bot className="h-4 w-4 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              AI IELTS Tutor
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Powered by StudyWithRaissov materials
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
              <Bot className="h-8 w-8 text-[var(--primary)]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
              AI IELTS Tutor
            </h3>
            <p className="max-w-sm text-sm text-[var(--text-secondary)]">
              Ask me anything about IELTS preparation, English grammar, vocabulary,
              writing practice, or study strategies. I have access to all platform materials!
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                "How to improve my IELTS Writing score?",
                "Explain the difference between 'affect' and 'effect'",
                "Give me speaking Part 2 tips",
                "Help me plan my IELTS preparation",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)]">
                    <Bot className="h-3.5 w-3.5 text-[var(--primary)]" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div
                      className="chat-ai-content"
                      dangerouslySetInnerHTML={{
                        __html: formatContent(msg.content),
                      }}
                    />
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)]">
                    <User className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)]">
                  <Bot className="h-3.5 w-3.5 text-[var(--primary)]" />
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)] [animation-delay:0ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)] [animation-delay:150ms]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)] [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input — safe area aware on mobile */}
      <div className="border-t border-[var(--border)] px-3 py-2.5 sm:px-4 sm:py-3" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about IELTS, grammar, vocabulary..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] focus:outline-none sm:px-4 sm:text-sm"
            style={{
              maxHeight: "120px",
              height: "auto",
              overflow: input.includes("\n") ? "auto" : "hidden",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="sm"
            className="h-11 w-11 shrink-0 rounded-xl p-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-[var(--text-secondary)]">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
