import { Plus, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversa } from "@/hooks/useAssistente";

interface Props {
  conversas: Conversa[];
  ativaId?: string;
  carregando?: boolean;
  onNova: () => void;
  onSelecionar: (id: string) => void;
  onExcluir: (id: string) => void;
}

export function ConversasPanel({
  conversas,
  ativaId,
  carregando,
  onNova,
  onSelecionar,
  onExcluir,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button className="w-full justify-start gap-2" onClick={onNova}>
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 px-3 pb-3">
          {carregando && <p className="px-2 py-4 text-sm text-muted-foreground">Carregando...</p>}
          {!carregando && conversas.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              Nenhuma conversa ainda. Comece uma nova.
            </p>
          )}
          {conversas.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                ativaId === c.id && "bg-accent",
              )}
            >
              <button
                type="button"
                onClick={() => onSelecionar(c.id)}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.titulo}</span>
                  <span className="block text-xs text-muted-foreground">
                    {format(new Date(c.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Excluir conversa ${c.titulo}`}
                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onExcluir(c.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
