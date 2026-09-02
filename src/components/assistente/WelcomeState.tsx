import { AlertTriangle, CalendarClock, Truck, FileText, Building2, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import logo from "@/assets/assistente-maiore.png";

export const SUGESTOES = [
  {
    icon: AlertTriangle,
    titulo: "Principais problemas",
    pergunta: "Quais são os principais problemas da operação?",
  },
  {
    icon: CalendarClock,
    titulo: "Vencimentos",
    pergunta: "O que vence nos próximos 30 dias?",
  },
  {
    icon: Truck,
    titulo: "Motoristas",
    pergunta: "Quais motoristas estão com pendências?",
  },
  {
    icon: FileText,
    titulo: "Contratos",
    pergunta: "Quais contratos estão pendentes?",
  },
  {
    icon: Building2,
    titulo: "Transportadores",
    pergunta: "Quais transportadores precisam de atenção?",
  },
  {
    icon: BarChart3,
    titulo: "Resumo operacional",
    pergunta: "Faça um resumo da operação.",
  },
];

export function WelcomeState({ onSugestao }: { onSugestao: (pergunta: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-10 text-center">
      <img
        src={logo}
        alt="Assistente Maiore"
        width={512}
        height={512}
        loading="lazy"
        className="h-16 w-16 object-contain"
      />
      <h1 className="mt-4 text-2xl font-semibold text-foreground">Assistente Maiore</h1>
      <p className="text-sm font-medium text-muted-foreground">Seu assistente operacional</p>
      <p className="mt-3 max-w-lg text-sm text-muted-foreground">
        Posso consultar e analisar os dados operacionais da empresa — motoristas, transportadores,
        contratos, seguros, vencimentos e pendências.
      </p>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUGESTOES.map((s) => (
          <Card
            key={s.titulo}
            role="button"
            tabIndex={0}
            onClick={() => onSugestao(s.pergunta)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSugestao(s.pergunta);
              }
            }}
            className="cursor-pointer p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold text-foreground">{s.titulo}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.pergunta}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
