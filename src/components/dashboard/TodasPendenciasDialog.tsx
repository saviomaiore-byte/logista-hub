import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDateOnly } from "@/lib/utils";
import type { DashboardAlert } from "./AlertCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendencias: DashboardAlert[];
}

const getStatusColor = (dias: number) => {
  if (dias < 0) return "status-danger";
  if (dias <= 15) return "status-warning";
  return "status-success";
};

const getStatusText = (dias: number) => {
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dias`;
  if (dias === 0) return "Vence hoje";
  return `${dias} dias restantes`;
};

const formatName = (name: string) =>
  name
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)(\S)/g, (_, space, letter) => `${space}${letter.toLocaleUpperCase("pt-BR")}`);

export function TodasPendenciasDialog({ open, onOpenChange, pendencias }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Todas as pendências</DialogTitle>
          <DialogDescription>
            Todos os documentos pendentes, independente de há quantos dias estão vencidos.
          </DialogDescription>
        </DialogHeader>

        {pendencias.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma pendência registrada.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {pendencias.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{formatName(p.motorista)}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.documento} • Venc: {formatDateOnly(p.vencimentoISO)}
                  </p>
                </div>
                <span
                  className={cn(
                    "status-badge w-fit shrink-0 gap-1 text-[10px]",
                    getStatusColor(p.diasRestantes),
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {getStatusText(p.diasRestantes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
