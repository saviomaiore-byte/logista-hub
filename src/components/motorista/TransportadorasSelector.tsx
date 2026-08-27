import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, X } from "lucide-react";
import type { Transportadora } from "./types";

type Props = {
  transportadoras: Transportadora[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

export function TransportadorasSelector({ transportadoras, selected, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label>Transportadoras vinculadas</Label>
      <Select
        value=""
        onValueChange={(value) => {
          if (!selected.includes(value)) {
            onChange([...selected, value]);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma transportadora..." />
        </SelectTrigger>
        <SelectContent>
          {transportadoras
            .filter((t) => !selected.includes(t.id))
            .map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.razao_social} ({t.cpf_cnpj})
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((id) => {
            const t = transportadoras.find((tr) => tr.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                <Building2 className="h-3 w-3" />
                {t?.razao_social || id}
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((x) => x !== id))}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
