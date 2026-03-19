import {
  UserPlus,
  FileText,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const actions = [
  { name: "Novo Motorista", icon: UserPlus, color: "bg-primary hover:bg-primary/90", path: "/motoristas", action: "new" },
  { name: "Enviar Contrato", icon: FileText, color: "bg-success hover:bg-success/90", path: "/contratos", action: "new" },
  { name: "Agendar Renovação", icon: Calendar, color: "bg-primary hover:bg-primary/90", path: "/certificados", action: "new" },
];

export function QuickActions() {
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 font-semibold text-foreground">Ações Rápidas</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => (
          <Button
            key={action.name}
            onClick={() => handleAction(action.path)}
            className={`h-auto justify-start gap-3 px-4 py-4 text-left ${action.color} text-primary-foreground`}
          >
            <action.icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium leading-tight">{action.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
