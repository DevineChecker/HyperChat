import { GROQ_MODELS } from "@/lib/groq";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu } from "lucide-react";

export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[260px] bg-secondary border-border text-foreground">
        <Cpu className="w-4 h-4 mr-2 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {GROQ_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} className="focus:bg-secondary">
            <div>
              <span className="font-medium">{m.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{m.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
