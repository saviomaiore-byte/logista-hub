import { Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface DashboardAlert {
  id: string;
  type: string;
  motorista: string;
  documento: string;
  vencimento: string;
  vencimentoISO: string;
  entidade: string;
  entidadeId: string;
  diasRestantes: number;
}

interface AlertCardProps {
  alerts: DashboardAlert[];
  onArquivar?: (alert: DashboardAlert) => void;
  onVerArquivados?: () => void;
  arquivadosCount?: number;
  totalCount?: number;
  onVerTodas?: () => void;
}

export function AlertCard({
  alerts,
  onArquivar,
  onVerArquivados,
  arquivadosCount = 0,
  totalCount,
  onVerTodas,
}: AlertCardProps) {
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
    name.toLocaleLowerCase("pt-BR").replace(/(^|\s)(\S)/g, (_, space, letter) => `${space}${letter.toLocaleUpperCase("pt-BR")}`);

  const initials = (name: string) =>
    name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      .format(new Date(`${iso}T12:00:00`))
      .replace(" de ", " ");

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pendências prioritárias</h3>
          <p className="mt-1 text-xs text-muted-foreground">Itens que precisam de atenção imediata</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="hidden shrink-0 grid-cols-[minmax(0,2.4fr)_minmax(90px,0.9fr)_minmax(120px,1fr)_minmax(130px,1fr)_32px] gap-3 border-b border-border bg-muted/15 px-5 py-3 text-[11px] font-medium text-muted-foreground md:grid">
          <span className="pl-11">Motorista</span>
          <span>Documento</span>
          <span>Vencimento</span>
          <span>Prazo</span>
          <span />
        </div>
        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {alerts.map((alert) => (
            <div key={alert.id} className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20 md:grid-cols-[minmax(0,2.4fr)_minmax(90px,0.9fr)_minmax(120px,1fr)_minmax(130px,1fr)_32px] md:items-center md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-[10px] font-semibold text-primary">
                  {initials(alert.motorista)}
                </div>
                <p className="truncate text-[13px] font-medium text-foreground">{formatName(alert.motorista)}</p>
              </div>
              <span className="text-xs text-foreground">{alert.documento}</span>
              <span className="text-xs text-foreground">{formatDate(alert.vencimentoISO)}</span>
              <span className={cn("status-badge w-fit gap-1 text-[10px]", getStatusColor(alert.diasRestantes))}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {getStatusText(alert.diasRestantes)}
              </span>
              {onArquivar && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Arquivar alerta">
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Arquivar este alerta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O documento continuará registrado. Apenas o alerta será removido do Dashboard.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onArquivar(alert)}>Arquivar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
        {(onVerTodas || onVerArquivados) && (
          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-border px-5 py-3">
            {onVerTodas && (
              <button className="text-xs font-medium text-primary hover:underline" onClick={onVerTodas}>
                Ver todas{typeof totalCount === "number" && totalCount > 0 ? ` (${totalCount})` : ""}
              </button>
            )}
            {onVerTodas && onVerArquivados && <span className="text-xs text-border">|</span>}
            {onVerArquivados && (
              <button
                className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                onClick={onVerArquivados}
              >
                Ver arquivados{arquivadosCount > 0 ? ` (${arquivadosCount})` : ""}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
