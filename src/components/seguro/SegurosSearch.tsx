import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SegurosSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function SegurosSearch({ value, onChange }: SegurosSearchProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        placeholder="Buscar por seguradora, tipo, segurado ou apólice..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:max-w-md"
      />
    </div>
  );
}
