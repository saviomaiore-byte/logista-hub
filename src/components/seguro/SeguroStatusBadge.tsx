import { Badge } from "@/components/ui/badge";
import { differenceInDays, parseISO } from "date-fns";
import type { Seguro } from "./types";

interface SeguroStatusBadgeProps {
  seguro: Seguro;
}

export function SeguroStatusBadge({ seguro }: SeguroStatusBadgeProps) {
  if (seguro.status === "cancelado") return <Badge variant="secondary">Cancelado</Badge>;
  if (seguro.status === "vencido") return <Badge variant="destructive">Vencido</Badge>;
  if (!seguro.vigencia_fim) return <Badge variant="outline">Sem vigência</Badge>;

  const diasRestantes = differenceInDays(parseISO(seguro.vigencia_fim), new Date());
  if (diasRestantes < 0) return <Badge variant="destructive">Vencido</Badge>;
  if (diasRestantes <= 30)
    return <Badge className="bg-warning text-warning-foreground">Vence em {diasRestantes} dias</Badge>;
  return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
}
