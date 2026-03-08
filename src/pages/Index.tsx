import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { ModelSelector } from "@/components/ModelSelector";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { ChatSidebar } from "@/components/ChatSidebar";
import { streamGroqChat, type Message } from "@/lib/groq";
import { loadChats, saveChats, createChat, getChatTitle, type Chat } from "@/lib/chatHistory";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

const Index = () => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("groq_api_key") || "");
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const saved = loadChats();
    return saved.length > 0 ? saved[0].id : null;
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const messages = activeChat?.messages || [];

  // Persist chats
  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSaveKey = (key: string) => {
    localStorage.setItem("groq_api_key", key);
    setApiKey(key);
  };

  const updateChatMessages = (chatId: string, msgs: Message[]) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: msgs, title: getChatTitle(msgs), updatedAt: Date.now() }
          : c
      )
    );
  };

  const handleNewChat = () => {
    const chat = createChat(model);
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    const chat = chats.find((c) => c.id === id);
    if (chat) setModel(chat.model);
  };

  const handleDeleteChat = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    let chatId = activeChatId;
    if (!chatId) {
      const chat = createChat(model);
      setChats((prev) => [chat, ...prev]);
      setActiveChatId(chat.id);
      chatId = chat.id;
    }

    const userMsg: Message = { role: "user", content: input.trim() };
    const currentChat = chats.find((c) => c.id === chatId);
    const newMessages = [...(currentChat?.messages || []), userMsg];

    updateChatMessages(chatId, newMessages);
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
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: assistantContent };
          } else {
            msgs.push({ role: "assistant", content: assistantContent });
          }
          return { ...c, messages: msgs, title: getChatTitle(msgs), updatedAt: Date.now() };
        })
      );
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
  }, [input, isLoading, activeChatId, chats, apiKey, model]);

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
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onChangeApiKey={() => {
            localStorage.removeItem("groq_api_key");
            setApiKey("");
          }}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <h1 className="text-lg font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                GroqChat
              </h1>
              <ModelSelector value={model} onChange={setModel} />
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
      </div>
    </SidebarProvider>
  );
};

export default Index;
