import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search } from "lucide-react";
import type { Transportadora } from "./types";

type Props = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  transportadoraFilter: string;
  onTransportadoraFilterChange: (value: string) => void;
  transportadoras: Transportadora[];
  onClearFilters: () => void;
};

export function MotoristasFilters({
  searchTerm,
  onSearchTermChange,
  showFilters,
  onToggleFilters,
  statusFilter,
  onStatusFilterChange,
  transportadoraFilter,
  onTransportadoraFilterChange,
  transportadoras,
  onClearFilters,
}: Props) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2" onClick={onToggleFilters}>
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transportadora</Label>
            <Select value={transportadoraFilter} onValueChange={onTransportadoraFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as transportadoras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as transportadoras</SelectItem>
                {transportadoras.map((transportadora) => (
                  <SelectItem key={transportadora.id} value={transportadora.id}>
                    {transportadora.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClearFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
