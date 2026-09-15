import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIME_TRIBUTARIO_OPTIONS } from "./types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  regime: string;
  onRegimeChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
};

export function TransportadoresSearch({ value, onChange, regime, onRegimeChange, status, onStatusChange }: Props) {
  return (
    <div className="my-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 rounded-xl bg-card pl-9 text-sm"
        />
      </div>
      <Select value={regime} onValueChange={onRegimeChange}>
        <SelectTrigger className="h-10 w-full rounded-xl bg-card text-xs sm:w-52">
          <SlidersHorizontal className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="Regime: Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Regime: Todos</SelectItem>
          {REGIME_TRIBUTARIO_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-10 w-full rounded-xl bg-card text-xs sm:w-40">
          <SelectValue placeholder="Status: Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Status: Todos</SelectItem>
          <SelectItem value="ativo">Ativos</SelectItem>
          <SelectItem value="inativo">Inativos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
