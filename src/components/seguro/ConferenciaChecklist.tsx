import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ConferenciaItem } from "@/components/seguro/types";

interface ConferenciaChecklistProps {
  itens?: ConferenciaItem[];
  filteredItens?: ConferenciaItem[];
  isLoading: boolean;
  isMobile: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  cobertosCount: number;
  totalItens: number;
  cobertura: number;
  onToggleCoberto: (itemId: string, coberto: boolean) => void;
  onUpdateObservacoes: (itemId: string, observacoes: string) => void;
}

export function ConferenciaChecklist({
  filteredItens,
  isLoading,
  isMobile,
  searchTerm,
  onSearchTermChange,
  cobertosCount,
  totalItens,
  cobertura,
  onToggleCoberto,
  onUpdateObservacoes,
}: ConferenciaChecklistProps) {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Cobertura: {cobertosCount}/{totalItens} motoristas</span>
          <span className={`font-bold ${cobertura === 100 ? "text-success" : cobertura >= 80 ? "text-warning" : "text-destructive"}`}>
            {cobertura}%
          </span>
        </div>
        <Progress value={cobertura} className="h-3 mt-2" />
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar motorista por nome ou CPF..." value={searchTerm} onChange={(e) => onSearchTermChange(e.target.value)} className="max-w-md" />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredItens?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum motorista encontrado</div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredItens?.map((item) => (
            <div key={item.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={item.coberto} onCheckedChange={(checked) => onToggleCoberto(item.id, !!checked)} />
                  <div>
                    <p className="font-medium text-foreground">{item.motoristas?.nome}</p>
                    <p className="text-xs text-muted-foreground">{item.motoristas?.cpf}</p>
                  </div>
                </div>
                {item.coberto ? (
                  <Badge className="bg-success text-success-foreground text-xs">Coberto</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Descoberto</Badge>
                )}
              </div>
              <Input
                placeholder="Observação..."
                defaultValue={item.observacoes || ""}
                className="h-8 text-sm"
                onBlur={(e) => {
                  if (e.target.value !== (item.observacoes || "")) {
                    onUpdateObservacoes(item.id, e.target.value);
                  }
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Coberto</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItens?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox checked={item.coberto} onCheckedChange={(checked) => onToggleCoberto(item.id, !!checked)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.motoristas?.nome}</span>
                      {item.coberto ? (
                        <Badge className="bg-success text-success-foreground text-xs">Coberto</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Descoberto</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.motoristas?.cpf}</TableCell>
                  <TableCell>
                    <Input
                      placeholder="Obs..."
                      defaultValue={item.observacoes || ""}
                      className="h-8 text-sm"
                      onBlur={(e) => {
                        if (e.target.value !== (item.observacoes || "")) {
                          onUpdateObservacoes(item.id, e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
