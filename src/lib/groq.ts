export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "LLaMA 3.3 70B", description: "Most capable general model" },
  { id: "llama-3.1-8b-instant", name: "LLaMA 3.1 8B", description: "Fast & efficient" },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", description: "OpenAI flagship open-weight" },
  { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", description: "OpenAI fast & affordable" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "LLaMA 4 Scout 17B", description: "Latest LLaMA 4" },
  { id: "qwen/qwen3-32b", name: "Qwen3 32B", description: "Reasoning & math" },
  { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2", description: "Moonshot AI, 262k ctx" },
  { id: "groq/compound", name: "Groq Compound", description: "Agentic with web search" },
  { id: "groq/compound-mini", name: "Groq Compound Mini", description: "Lightweight agentic" },
];

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function streamGroqChat({
  apiKey,
  model,
  messages,
  onDelta,
  onDone,
  signal,
}: {
  apiKey: string;
  model: string;
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Groq API error (${resp.status}): ${err}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {}
    }
  }
  onDone();
}
