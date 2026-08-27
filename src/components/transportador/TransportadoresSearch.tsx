import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function TransportadoresSearch({ value, onChange }: Props) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        placeholder="Buscar..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:max-w-md"
      />
    </div>
  );
}
