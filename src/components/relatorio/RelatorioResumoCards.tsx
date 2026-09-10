import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Truck, Users, CheckCircle2, XCircle, MapPin, Navigation } from "lucide-react";

export interface ResumoRelatorio {
  totalMotoristas: number;
  aptos: number;
  inaptos: number;
  emPraca: number;
  emViagem: number;
  totalTransportadoras: number;
}

export type FiltroRelatorio = "todos" | "aptos" | "inaptos" | "em_praca" | "em_viagem";

interface RelatorioResumoCardsProps {
  resumo: ResumoRelatorio;
  filtro?: FiltroRelatorio;
  onFiltroChange?: (filtro: FiltroRelatorio) => void;
}

export function RelatorioResumoCards({ resumo, filtro = "todos", onFiltroChange }: RelatorioResumoCardsProps) {
  const handleClick = (value: FiltroRelatorio) => {
    if (!onFiltroChange) return;
    onFiltroChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent, value: FiltroRelatorio) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(value);
    }
  };

  const cardBase = "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
  const cardClickable = "cursor-pointer hover:bg-muted/50";
  const cardActive = "ring-2 ring-primary bg-primary/5";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card className={cn(cardBase)}>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Transportadoras</span>
          </div>
          <p className="text-2xl font-bold mt-1">{resumo.totalTransportadoras}</p>
        </CardContent>
      </Card>

      <Card
        role="button"
        tabIndex={0}
        onClick={() => handleClick("todos")}
        onKeyDown={(e) => handleKeyDown(e, "todos")}
        className={cn(cardBase, cardClickable, filtro === "todos" && cardActive)}
      >
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Motoristas</span>
          </div>
          <p className="text-2xl font-bold mt-1">{resumo.totalMotoristas}</p>
        </CardContent>
      </Card>

      <Card
        role="button"
        tabIndex={0}
        onClick={() => handleClick("aptos")}
        onKeyDown={(e) => handleKeyDown(e, "aptos")}
        className={cn(cardBase, cardClickable, filtro === "aptos" && cardActive)}
      >
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Aptos</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{resumo.aptos}</p>
        </CardContent>
      </Card>

      <Card
        role="button"
        tabIndex={0}
        onClick={() => handleClick("inaptos")}
        onKeyDown={(e) => handleKeyDown(e, "inaptos")}
        className={cn(cardBase, cardClickable, filtro === "inaptos" && cardActive)}
      >
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Inaptos</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-destructive">{resumo.inaptos}</p>
        </CardContent>
      </Card>

      <Card
        role="button"
        tabIndex={0}
        onClick={() => handleClick("em_praca")}
        onKeyDown={(e) => handleKeyDown(e, "em_praca")}
        className={cn(cardBase, cardClickable, filtro === "em_praca" && cardActive)}
      >
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Em Praça</span>
          </div>
          <p className="text-2xl font-bold mt-1">{resumo.emPraca}</p>
        </CardContent>
      </Card>

      <Card
        role="button"
        tabIndex={0}
        onClick={() => handleClick("em_viagem")}
        onKeyDown={(e) => handleKeyDown(e, "em_viagem")}
        className={cn(cardBase, cardClickable, filtro === "em_viagem" && cardActive)}
      >
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Em Viagem</span>
          </div>
          <p className="text-2xl font-bold mt-1">{resumo.emViagem}</p>
        </CardContent>
      </Card>
    </div>
  );
}
