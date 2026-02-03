import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, FileText, CreditCard, AlertTriangle, Calendar, TrendingUp } from "lucide-react";

// Mock data
const mockAlerts = [
  { id: "1", type: "cnh" as const, motorista: "João Silva", documento: "CNH", vencimento: "15/02/2024", diasRestantes: -5 },
  { id: "2", type: "mopp" as const, motorista: "Carlos Santos", documento: "MOPP", vencimento: "20/02/2024", diasRestantes: 3 },
  { id: "3", type: "antt" as const, motorista: "Pedro Oliveira", documento: "ANTT", vencimento: "28/02/2024", diasRestantes: 11 },
  { id: "4", type: "cnh" as const, motorista: "André Costa", documento: "CNH", vencimento: "01/03/2024", diasRestantes: 12 },
  { id: "5", type: "mopp" as const, motorista: "Ricardo Lima", documento: "MOPP", vencimento: "05/03/2024", diasRestantes: 16 },
];

const mockActivities = [
  { id: "1", type: "contrato" as const, title: "Contrato enviado", description: "Transportadora ABC Ltda", time: "Há 5 min" },
  { id: "2", type: "cadastro" as const, title: "Novo motorista", description: "Marcos Pereira cadastrado", time: "Há 15 min" },
  { id: "3", type: "boleto" as const, title: "Boleto enviado", description: "Ref. Jan/2024 - R$ 2.500,00", time: "Há 30 min" },
  { id: "4", type: "documento" as const, title: "Documento empresa", description: "CND Federal atualizada", time: "Há 1 hora" },
  { id: "5", type: "cobranca" as const, title: "Cobrança realizada", description: "Transportadora XYZ - Pago", time: "Há 2 horas" },
];

export default function Index() {
  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema de gestão de transportadores</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Motoristas Ativos"
            value={127}
            subtitle="12 novos este mês"
            icon={Users}
            variant="default"
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Contratos Vigentes"
            value={89}
            subtitle="5 pendentes de assinatura"
            icon={FileText}
            variant="success"
          />
          <StatCard
            title="Boletos Pendentes"
            value={23}
            subtitle="R$ 45.670,00 em aberto"
            icon={CreditCard}
            variant="warning"
          />
          <StatCard
            title="Docs Vencidos"
            value={7}
            subtitle="Requer atenção imediata"
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <StatCard
            title="Renovações Agendadas"
            value={15}
            subtitle="Próximos 30 dias"
            icon={Calendar}
            variant="default"
          />
          <StatCard
            title="Faturamento Enviado"
            value="R$ 234k"
            subtitle="Janeiro 2024"
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="PINS Lançados"
            value={42}
            subtitle="Este mês"
            icon={TrendingUp}
            variant="default"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Alerts - Takes 2 columns */}
          <div className="lg:col-span-2">
            <AlertCard alerts={mockAlerts} />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6">
          <RecentActivityCard activities={mockActivities} />
        </div>
      </div>
    </MainLayout>
  );
}
