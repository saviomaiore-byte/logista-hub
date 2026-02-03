import { FileText, Send, CreditCard, UserPlus, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "contrato" | "boleto" | "cadastro" | "documento" | "cobranca";
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
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-foreground">Atividades Recentes</h3>
      </div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0",
                  getActivityColor(activity.type)
                )}
              >
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{activity.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
