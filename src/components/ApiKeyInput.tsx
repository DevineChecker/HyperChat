import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, ExternalLink } from "lucide-react";

export function ApiKeyInput({ onSave }: { onSave: (key: string) => void }) {
  const [key, setKey] = useState("");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Hyperchat
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter your Groq API key to start chatting with lightning-fast AI models.
          </p>
        </div>

        <div className="space-y-3">
          <Input
            type="password"
            placeholder="gsk_..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            onClick={() => key.trim() && onSave(key.trim())}
            disabled={!key.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Start Chatting
          </Button>
        </div>

        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Get your API key <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
