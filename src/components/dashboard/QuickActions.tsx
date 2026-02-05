import { 
  UserPlus, 
  FileText, 
  Send, 
  CreditCard, 
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { name: "Novo Motorista", icon: UserPlus, color: "bg-primary hover:bg-primary/90" },
  { name: "Enviar Contrato", icon: FileText, color: "bg-success hover:bg-success/90" },
  { name: "Enviar Boleto", icon: CreditCard, color: "bg-warning hover:bg-warning/90 text-foreground" },
  { name: "Enviar Documento", icon: Send, color: "bg-sidebar-primary hover:bg-sidebar-primary/90" },
  { name: "Agendar Renovação", icon: Calendar, color: "bg-primary hover:bg-primary/90" },
];

export function QuickActions() {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-foreground mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action) => (
          <Button
            key={action.name}
            className={`h-auto flex-col gap-2 py-4 ${action.color} text-primary-foreground`}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{action.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
