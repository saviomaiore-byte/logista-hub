import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArchiveRestore } from "lucide-react";
import { formatDateOnly } from "@/lib/utils";
import { useAlertasArquivados, useDesarquivarAlerta } from "@/hooks/useAlertasArquivados";

export interface AlertaAntigo {
  id: string;
  nome: string;
  tipoDocumento: string;
  vencimento: string;
  diasRestantes: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  antigos?: AlertaAntigo[];
}

export function AlertasArquivadosDialog({ open, onOpenChange, antigos = [] }: Props) {
  const { data: arquivados = [], isLoading } = useAlertasArquivados();
  const desarquivar = useDesarquivarAlerta();

  const situacao = (vencimento: string) => {
    const hoje = new Date().toISOString().slice(0, 10);
    return vencimento < hoje ? "Vencido" : "A vencer";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alertas arquivados</DialogTitle>
          <DialogDescription>
            Arquivar não altera o documento. Ao desarquivar, o alerta volta ao Dashboard caso ainda
            atenda aos critérios atuais.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : arquivados.length === 0 && antigos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum alerta arquivado.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {arquivados.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {a.entidade_nome || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.tipo_documento} • Venc: {formatDateOnly(a.vencimento)} •{" "}
                    {situacao(a.vencimento)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Arquivado em {formatDateOnly(a.created_at.slice(0, 10))}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={desarquivar.isPending}
                  onClick={() => desarquivar.mutate(a.id)}
                >
                  <ArchiveRestore className="mr-1.5 h-4 w-4" />
                  Desarquivar
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
