import { useMemo, useState } from "react";
import { CheckCircle, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Activity } from "./RecentActivityCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos os tipos" },
  { value: "contrato", label: "Contratos" },
  { value: "cadastro", label: "Cadastros" },
  { value: "documento", label: "Documentos" },
  { value: "cobranca", label: "Cobranças" },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function TodasAtividadesDialog({ open, onOpenChange, activities }: Props) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");

  const filtradas = useMemo(() => {
    const termo = normalize(busca.trim());
    return activities.filter((activity) => {
      if (tipo !== "todos" && activity.type !== tipo) return false;
      if (!termo) return true;
      return normalize(`${activity.title} ${activity.description}`).includes(termo);
    });
  }, [activities, busca, tipo]);

  const getActivityIcon = (type: Activity["type"]) => {
    const icons = {
      contrato: <FileTextIcon />,
      cadastro: <UserPlusIcon />,
      documento: <SendIcon />,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Todas as atividades</DialogTitle>
          <DialogDescription>
            Histórico completo de movimentações realizadas no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar atividade..."
              className="pl-9"
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {filtradas.length > 0 ? (
            <div className="divide-y divide-border">
              {filtradas.map((activity) => (
                <div key={activity.id} className="p-4 transition-colors hover:bg-muted/30">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        getActivityColor(activity.type),
                      )}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="mt-0.5 break-words text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground sm:whitespace-nowrap">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhuma atividade encontrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tente ajustar a busca ou o filtro de tipo.
              </p>
            </div>
          )}
        </div>

        <p className="shrink-0 text-xs text-muted-foreground">
          {filtradas.length} de {activities.length} atividades
        </p>
      </DialogContent>
    </Dialog>
  );
}

function FileTextIcon() {
  return <FileText className="h-4 w-4" />;
}
function UserPlusIcon() {
  return <UserPlus className="h-4 w-4" />;
}
function SendIcon() {
  return <Send className="h-4 w-4" />;
}
