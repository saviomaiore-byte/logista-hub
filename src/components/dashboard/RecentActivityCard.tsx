import { FileText, Send, UserPlus, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Activity {
  id: string;
  type: "contrato" | "cadastro" | "documento" | "cobranca";
  title: string;
  description: string;
  time: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
  title?: string;
  subtitle?: string;
  emptyText?: string;
}

export function RecentActivityCard({
  activities,
  title = "Atividades recentes",
  subtitle = "Movimentações realizadas no sistema",
  emptyText = "As movimentações realizadas no sistema aparecerão aqui.",
}: RecentActivityCardProps) {
  const getActivityIcon = (type: Activity["type"]) => {
    const icons = {
      contrato: <FileText className="h-4 w-4" />,
      cadastro: <UserPlus className="h-4 w-4" />,
      documento: <Send className="h-4 w-4" />,
      cobranca: <CheckCircle className="h-4 w-4" />,
    };
    return icons[type];
  };

  const getActivityColor = (type: Activity["type"]) => {
    const colors = {
      contrato: "bg-primary/10 text-primary",
      cadastro: "bg-sidebar-primary/10 text-sidebar-primary",
      documento: "bg-warning/10 text-warning",
      cobranca: "bg-success/10 text-success",
    };
    return colors[type];
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {activities.length > 0 ? (
        <div className="divide-y divide-border">
          {activities.map((activity) => (
            <div key={activity.id} className="p-4 transition-colors hover:bg-muted/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    getActivityColor(activity.type)
                  )}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="mt-0.5 break-words text-sm text-muted-foreground">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground sm:whitespace-nowrap">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Nenhuma atividade registrada</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            {emptyText}
          </p>
        </div>
      )}
    </div>
  );
}
