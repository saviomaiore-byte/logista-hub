import { Card, CardContent } from "@/components/ui/card";
import { Truck, Users, CheckCircle2, XCircle, MapPin, Navigation } from "lucide-react";

export interface ResumoRelatorio {
  totalMotoristas: number;
  aptos: number;
  inaptos: number;
  emPraca: number;
  emViagem: number;
  totalTransportadoras: number;
}

interface RelatorioResumoCardsProps {
  resumo: ResumoRelatorio;
}

export function RelatorioResumoCards({ resumo }: RelatorioResumoCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Transportadoras</span>
          </div>
          <p className="text-2xl font-bold mt-1">{resumo.totalTransportadoras}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Motoristas</span>
          </div>
          <p className="text-2xl font-bold mt-1">{resumo.totalMotoristas}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Aptos</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{resumo.aptos}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Inaptos</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-destructive">{resumo.inaptos}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Em Praça</span>
          </div>
          <p className="text-2xl font-bold mt-1">{resumo.emPraca}</p>
        </CardContent>
      </Card>
      <Card>
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
