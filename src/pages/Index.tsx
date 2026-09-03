import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertCard, type DashboardAlert } from "@/components/dashboard/AlertCard";
import { AlertasArquivadosDialog } from "@/components/dashboard/AlertasArquivadosDialog";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Users, FileText, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reportDbError } from "@/lib/dbError";
import {
  alertaKey,
  useAlertasArquivados,
  useArquivarAlerta,
} from "@/hooks/useAlertasArquivados";

export default function Index() {
  const [stats, setStats] = useState({
    motoristas: 0,
    contratos: 0,
    docsVencidos: 0,
    certificados: 0,
  });
  const [allAlerts, setAllAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [arquivadosOpen, setArquivadosOpen] = useState(false);
  const { data: arquivados = [] } = useAlertasArquivados();
  const arquivarAlerta = useArquivarAlerta();

  const alerts = useMemo(() => {
    const arquivadosSet = new Set(
      arquivados.map((a) => alertaKey(a.entidade_id, a.tipo_documento, a.vencimento))
    );
    return allAlerts.filter(
      (a) => !arquivadosSet.has(alertaKey(a.entidadeId, a.documento, a.vencimentoISO))
    );
  }, [allAlerts, arquivados]);


  useEffect(() => {
    const fetchStats = async () => {
      const hoje = new Date();

      const { count: motoristasCount, error: motoristasError } = await supabase
        .from("motoristas")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      const { count: contratosCount, error: contratosError } = await supabase
        .from("contratos")
        .select("*", { count: "exact", head: true })
        .in("status", ["assinado", "enviado"]);




      const { data: motoristas, error: docsError } = await supabase
        .from("motoristas")
        .select("id, nome, cnh_vencimento, mopp_vencimento, antt_vencimento");

      reportDbError("carregar indicadores do painel", motoristasError || contratosError || docsError);

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

      const { count: certCount, error: certError } = await supabase
        .from("certificados")
        .select("*", { count: "exact", head: true });

      setStats({
        motoristas: motoristasCount || 0,
        contratos: contratosCount || 0,
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Visão geral do sistema de gestão de transportadores</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            title="Docs Vencidos"
            value={stats.docsVencidos}
            subtitle={stats.docsVencidos > 0 ? "Requer atenção imediata" : "Todos em dia!"}
            icon={AlertTriangle}
            variant={stats.docsVencidos > 0 ? "danger" : "success"}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {alerts.length > 0 ? (
              <AlertCard alerts={alerts} />
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-success" />
                <h3 className="mb-2 font-semibold text-foreground">Tudo em dia!</h3>
                <p className="text-muted-foreground">Nenhum documento próximo do vencimento.</p>
              </div>
            )}
          </div>

          <div>
            <QuickActions />
          </div>
        </div>

        <div>
          <RecentActivityCard activities={mockActivities} />
        </div>
      </div>
    </MainLayout>
  );
}
