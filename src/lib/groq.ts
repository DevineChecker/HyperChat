export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "LLaMA 3.3 70B", description: "Most capable general model" },
  { id: "llama-3.1-8b-instant", name: "LLaMA 3.1 8B", description: "Fast & efficient" },
  { id: "llama-3.2-1b-preview", name: "LLaMA 3.2 1B", description: "Ultra lightweight" },
  { id: "llama-3.2-3b-preview", name: "LLaMA 3.2 3B", description: "Lightweight preview" },
  { id: "llama-3.2-11b-vision-preview", name: "LLaMA 3.2 11B Vision", description: "Vision capable" },
  { id: "llama-3.2-90b-vision-preview", name: "LLaMA 3.2 90B Vision", description: "Large vision model" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", description: "MoE architecture, 32k ctx" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", description: "Google's efficient model" },
  { id: "llama-guard-3-8b", name: "LLaMA Guard 3 8B", description: "Safety classifier" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B", description: "Reasoning model" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "LLaMA 4 Scout 17B", description: "Latest LLaMA 4" },
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
