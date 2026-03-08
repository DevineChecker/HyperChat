import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Bot, User } from "lucide-react";

// Preprocess LaTeX delimiters: \[...\] → $$...$$ and \(...\) → $...$
function preprocessLatex(content: string): string {
  // Convert \[...\] to $$...$$
  content = content.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
  // Convert \(...\) to $...$
  content = content.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  return content;
}


export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 py-4 px-4 ${isUser ? "" : "bg-card/50"}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser ? "bg-secondary" : "bg-primary/15"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-secondary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0 prose-chat text-foreground text-[0.935rem]">
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 py-4 px-4 bg-card/50">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex items-center gap-1 pt-2">
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}
