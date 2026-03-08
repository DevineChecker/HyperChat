import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Plus, Settings, Trash2 } from "lucide-react";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { ModelSelector } from "@/components/ModelSelector";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { streamGroqChat, type Message } from "@/lib/groq";
import { toast } from "sonner";

const Index = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("groq_api_key") || "");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem("groq_api_key", key);
    setApiKey(key);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    let assistantContent = "";
    const controller = new AbortController();
    abortRef.current = controller;

    const upsert = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      await streamGroqChat({
        apiKey,
        model,
        messages: newMessages,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e.message || "Failed to get response");
      }
      setIsLoading(false);
    }
  }, [input, isLoading, messages, apiKey, model]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  if (!apiKey) return <ApiKeyInput onSave={handleSaveKey} />;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
            GroqChat
          </h1>
          <ModelSelector value={model} onChange={setModel} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMessages([])}
            className="text-muted-foreground hover:text-foreground"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              localStorage.removeItem("groq_api_key");
              setApiKey("");
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Change API key"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Lightning-fast AI
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Powered by Groq's LPU inference engine. Ask anything.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            className="flex-1 resize-none bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
