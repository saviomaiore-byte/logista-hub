import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardCheck, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Conferencia } from "./types";

interface ConferenciasSidebarProps {
  items?: Conferencia[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConferenciasSidebar({
  items,
  selectedId,
  isLoading,
  onSelect,
  onDelete,
}: ConferenciasSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-3">
      <h3 className="font-semibold text-foreground text-sm">Conferências</h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items?.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma conferência criada</p>
        </div>
      ) : (
        items?.map((conf) => (
          <button
            key={conf.id}
            onClick={() => onSelect(conf.id)}
            className={`w-full text-left bg-card rounded-xl border p-3 transition-colors hover:border-primary ${
              selectedId === conf.id ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <p className="font-medium text-foreground text-sm truncate">{conf.titulo}</p>
            <p className="text-xs text-muted-foreground">{conf.periodo_referencia}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(parseISO(conf.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {conf.arquivo_apolice_url && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" /> PDF
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={(e) => {
                e.stopPropagation();
                onDelete(conf.id);
              }}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
