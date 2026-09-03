import { AlertTriangle, Clock, FileWarning, Archive } from "lucide-react";
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
}

export function AlertCard({ alerts, onArquivar, onVerArquivados, arquivadosCount = 0 }: AlertCardProps) {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mopp":
        return <FileWarning className="h-4 w-4" />;
      case "cnh":
        return <Clock className="h-4 w-4" />;
      case "antt":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileWarning className="h-4 w-4" />;
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-foreground">Documentos com Atenção</h3>
          <span className="status-badge status-warning sm:ml-auto">{alerts.length} alertas</span>
          {onVerArquivados && (
            <Button variant="ghost" size="sm" onClick={onVerArquivados}>
              <Archive className="mr-1.5 h-4 w-4" />
              Ver arquivados{arquivadosCount > 0 ? ` (${arquivadosCount})` : ""}
            </Button>
          )}
        </div>
      </div>
      <div className="divide-y divide-border">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 transition-colors hover:bg-muted/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                {getTypeIcon(alert.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{alert.motorista}</p>
                <p className="text-sm text-muted-foreground">
                  {alert.documento} • Venc: {alert.vencimento}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("status-badge w-fit", getStatusColor(alert.diasRestantes))}>
                  {getStatusText(alert.diasRestantes)}
                </span>
                {onArquivar && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" title="Arquivar alerta">
                        <Archive className="h-4 w-4" />
                        <span className="ml-1.5"></span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Arquivar este alerta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Este documento continuará registrado e, caso esteja vencido, continuará vencido. Apenas o
                          alerta será removido do Dashboard.
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
            </div>
          </div>
        ))}
      </div>
      {alerts.length > 5 && (
        <div className="border-t border-border p-3 text-center">
          <button className="text-sm font-medium text-primary hover:underline">Ver todos os alertas</button>
        </div>
      )}
    </div>
  );
}
