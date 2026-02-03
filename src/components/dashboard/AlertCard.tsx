import { AlertTriangle, Clock, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "mopp" | "cnh" | "antt";
  motorista: string;
  documento: string;
  vencimento: string;
  diasRestantes: number;
}

interface AlertCardProps {
  alerts: Alert[];
}

export function AlertCard({ alerts }: AlertCardProps) {
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
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-foreground">Documentos com Atenção</h3>
          <span className="ml-auto status-badge status-warning">{alerts.length} alertas</span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                {getTypeIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{alert.motorista}</p>
                <p className="text-sm text-muted-foreground">
                  {alert.documento} • Venc: {alert.vencimento}
                </p>
              </div>
              <span className={cn("status-badge", getStatusColor(alert.diasRestantes))}>
                {getStatusText(alert.diasRestantes)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {alerts.length > 5 && (
        <div className="p-3 text-center border-t border-border">
          <button className="text-sm text-primary hover:underline font-medium">
            Ver todos os alertas
          </button>
        </div>
      )}
    </div>
  );
}
