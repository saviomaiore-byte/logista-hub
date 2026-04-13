import { FileText, Send, CreditCard, UserPlus, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "contrato" | "cadastro" | "documento" | "cobranca";
  title: string;
  description: string;
  time: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  const getActivityIcon = (type: Activity["type"]) => {
    const icons = {
      contrato: <FileText className="h-4 w-4" />,
      boleto: <CreditCard className="h-4 w-4" />,
      cadastro: <UserPlus className="h-4 w-4" />,
      documento: <Send className="h-4 w-4" />,
      cobranca: <CheckCircle className="h-4 w-4" />,
    };
    return icons[type];
  };

  const getActivityColor = (type: Activity["type"]) => {
    const colors = {
      contrato: "bg-primary/10 text-primary",
      boleto: "bg-success/10 text-success",
      cadastro: "bg-sidebar-primary/10 text-sidebar-primary",
      documento: "bg-warning/10 text-warning",
      cobranca: "bg-success/10 text-success",
    };
    return colors[type];
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 p-4">
        <h3 className="font-semibold text-foreground">Atividades Recentes</h3>
      </div>
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
                <p className="mt-0.5 text-sm text-muted-foreground break-words">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground sm:whitespace-nowrap">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
