import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, FileText, CreditCard, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [stats, setStats] = useState({
    motoristas: 0,
    contratos: 0,
    boletosPendentes: 0,
    valorPendente: 0,
    docsVencidos: 0,
    certificados: 0,
    
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const hoje = new Date();

      // Motoristas
      const { count: motoristasCount } = await supabase
        .from("motoristas")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      // Contratos
      const { count: contratosCount } = await supabase
        .from("contratos")
        .select("*", { count: "exact", head: true })
        .in("status", ["assinado", "enviado"]);

      // Boletos pendentes
      const { data: boletos } = await supabase
        .from("boletos")
        .select("valor")
        .in("status", ["pendente", "enviado", "vencido"]);

      const valorPendente = boletos?.reduce((acc, b) => acc + (b.valor || 0), 0) || 0;

      // Documentos vencidos (motoristas)
      const { data: motoristas } = await supabase
        .from("motoristas")
        .select("id, nome, cnh_vencimento, mopp_vencimento, antt_vencimento");

      let docsVencidos = 0;
      const alertsList: any[] = [];

      motoristas?.forEach((m) => {
        const checkDoc = (tipo: string, vencimento: string | null) => {
          if (!vencimento) return;
          const venc = new Date(vencimento);
          const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0) {
            docsVencidos++;
            alertsList.push({
              id: `${m.id}-${tipo}`,
              type: tipo.toLowerCase(),
              motorista: m.nome,
              documento: tipo,
              vencimento: new Date(vencimento).toLocaleDateString("pt-BR"),
              diasRestantes: diff,
            });
          } else if (diff <= 30) {
            alertsList.push({
              id: `${m.id}-${tipo}`,
              type: tipo.toLowerCase(),
              motorista: m.nome,
              documento: tipo,
              vencimento: new Date(vencimento).toLocaleDateString("pt-BR"),
              diasRestantes: diff,
            });
          }
        };

        checkDoc("CNH", m.cnh_vencimento);
        checkDoc("MOPP", m.mopp_vencimento);
        checkDoc("ANTT", m.antt_vencimento);
      });

      // Certificados
      const { count: certCount } = await supabase
        .from("certificados")
        .select("*", { count: "exact", head: true });


      setStats({
        motoristas: motoristasCount || 0,
        contratos: contratosCount || 0,
        boletosPendentes: boletos?.length || 0,
        valorPendente,
        docsVencidos,
        certificados: certCount || 0,
        
      });

      alertsList.sort((a, b) => a.diasRestantes - b.diasRestantes);
      setAlerts(alertsList.slice(0, 5));
      setLoading(false);
    };

    fetchStats();
  }, []);

  const mockActivities = [
    { id: "1", type: "contrato" as const, title: "Sistema iniciado", description: "Dashboard carregado", time: "Agora" },
  ];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

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
            value={stats.motoristas}
            subtitle="Cadastrados no sistema"
            icon={Users}
            variant="default"
          />
          <StatCard
            title="Contratos Vigentes"
            value={stats.contratos}
            subtitle="Assinados ou enviados"
            icon={FileText}
            variant="success"
          />
          <StatCard
            title="Boletos Pendentes"
            value={stats.boletosPendentes}
            subtitle={`R$ ${stats.valorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em aberto`}
            icon={CreditCard}
            variant="warning"
          />
          <StatCard
            title="Docs Vencidos"
            value={stats.docsVencidos}
            subtitle={stats.docsVencidos > 0 ? "Requer atenção imediata" : "Todos em dia!"}
            icon={AlertTriangle}
            variant={stats.docsVencidos > 0 ? "danger" : "success"}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <StatCard
            title="Certificados"
            value={stats.certificados}
            subtitle="Cadastrados"
            icon={Calendar}
            variant="default"
          />
          <StatCard
            title="Alertas Ativos"
            value={alerts.length}
            subtitle="Documentos com atenção"
            icon={AlertTriangle}
            variant={alerts.length > 0 ? "warning" : "success"}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Alerts - Takes 2 columns */}
          <div className="lg:col-span-2">
            {alerts.length > 0 ? (
              <AlertCard alerts={alerts} />
            ) : (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Tudo em dia!</h3>
                <p className="text-muted-foreground">Nenhum documento próximo do vencimento.</p>
              </div>
            )}
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
