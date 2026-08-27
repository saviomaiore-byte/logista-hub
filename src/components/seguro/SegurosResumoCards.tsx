import { Shield, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import type { Seguro } from "./types";

interface SegurosResumoCardsProps {
  seguros?: Seguro[];
}

export function SegurosResumoCards({ seguros }: SegurosResumoCardsProps) {
  const total = seguros?.length || 0;

  const ativos =
    seguros?.filter((s) =>
      s.vigencia_fim ? differenceInDays(parseISO(s.vigencia_fim), new Date()) > 30 : s.status === "ativo"
    ).length || 0;

  const vencendo =
    seguros?.filter((s) => {
      if (!s.vigencia_fim) return false;
      const dias = differenceInDays(parseISO(s.vigencia_fim), new Date());
      return dias >= 0 && dias <= 30;
    }).length || 0;

  const vencidos =
    seguros?.filter((s) =>
      s.vigencia_fim ? differenceInDays(parseISO(s.vigencia_fim), new Date()) < 0 : false
    ).length || 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Seguros</p>
            <p className="text-2xl font-bold text-foreground">{total}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold text-foreground">{ativos}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vencendo em 30 dias</p>
            <p className="text-2xl font-bold text-foreground">{vencendo}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vencidos</p>
            <p className="text-2xl font-bold text-foreground">{vencidos}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
