import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertCard, type DashboardAlert } from "@/components/dashboard/AlertCard";
import { AlertasArquivadosDialog } from "@/components/dashboard/AlertasArquivadosDialog";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import { Users, Truck, UserCheck, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reportDbError } from "@/lib/dbError";
import { checkMotoristaAptidao } from "@/lib/aptidao";
import { useAuth } from "@/contexts/AuthContext";
import { alertaKey, useAlertasArquivados, useArquivarAlerta } from "@/hooks/useAlertasArquivados";
import { useAtividadesRecentes } from "@/hooks/useAtividadesRecentes";

type DashboardStats = {
  transportadores: number;
  transportadoresAtivos: number;
  transportadoresInaptos: number;
  motoristas: number;
  motoristasAtivos: number;
  motoristasInaptos: number;
};

const initialStats: DashboardStats = {
  transportadores: 0,
  transportadoresAtivos: 0,
  transportadoresInaptos: 0,
  motoristas: 0,
  motoristasAtivos: 0,
  motoristasInaptos: 0,
};

const DIAS_LIMITE_VENCIDO = 60;
const MAX_ALERTAS_VISIVEIS = 5;

function diasEntreHoje(data: string, hoje: Date) {
  const [ano, mes, dia] = String(data).slice(0, 10).split("-").map(Number);
  const vencimento = new Date(ano, mes - 1, dia);
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((vencimento.getTime() - inicioHoje.getTime()) / 86_400_000);
}

export default function Index() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const { user } = useAuth();
  const displayName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";
  const firstName = displayName.trim().split(" ")[0];
  const dataAtual = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date()).toUpperCase();
  const [allDocuments, setAllDocuments] = useState<DashboardAlert[]>([]);
  const [allAlerts, setAllAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [arquivadosOpen, setArquivadosOpen] = useState(false);
  const { data: arquivados = [] } = useAlertasArquivados();
  const arquivarAlerta = useArquivarAlerta();
  const { data: atividadesRecentes = [] } = useAtividadesRecentes({ limit: 4 });

  const [mostrarTodas, setMostrarTodas] = useState(false);

  const naoArquivados = useMemo(() => {
    const arquivadosSet = new Set(
      arquivados.map((a) => alertaKey(a.entidade_id, a.tipo_documento, a.vencimento)),
    );
    return allAlerts.filter(
      (a) => !arquivadosSet.has(alertaKey(a.entidadeId, a.documento, a.vencimentoISO)),
    );
  }, [allAlerts, arquivados]);

  /** Prioridade: vence hoje, depois próximos vencimentos, depois vencidos recentes. */
  const alerts = useMemo(() => {
    const grupo = (dias: number) => (dias >= 0 ? 0 : 1);
    return naoArquivados
      .filter((a) => a.diasRestantes >= -DIAS_LIMITE_VENCIDO)
      .sort((a, b) => {
        const ga = grupo(a.diasRestantes);
        const gb = grupo(b.diasRestantes);
        if (ga !== gb) return ga - gb;
        return ga === 0 ? a.diasRestantes - b.diasRestantes : b.diasRestantes - a.diasRestantes;
      });
  }, [naoArquivados]);

  /** Vencidos há mais de 60 dias: saem das prioridades e ficam no histórico. */
  const alertsAntigos = useMemo(
    () => naoArquivados.filter((a) => a.diasRestantes < -DIAS_LIMITE_VENCIDO),
    [naoArquivados],
  );

  useEffect(() => {
    const fetchDashboard = async () => {
      const hoje = new Date();
      const [transportadoresResult, motoristasResult, vinculosResult, contratosResult] = await Promise.all([
        supabase.from("transportadores").select("id, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero"),
        supabase
          .from("motoristas")
          .select("id, nome, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio, antt_vencimento"),
        supabase.from("transportador_motoristas").select("transportador_id, motorista_id, motorista_proprio"),
        supabase.from("contratos").select("motorista_id, arquivo_url, tipo"),
      ]);

      const error =
        transportadoresResult.error ||
        motoristasResult.error ||
        vinculosResult.error ||
        contratosResult.error;
      reportDbError("carregar indicadores do painel", error);
      if (error) {
        setLoading(false);
        return;
      }

      const transportadores = transportadoresResult.data || [];
      const motoristas = motoristasResult.data || [];
      const vinculos = vinculosResult.data || [];
      const contratos = contratosResult.data || [];
      const documentos: DashboardAlert[] = [];

      const transportadoresAtivos = transportadores.filter((item) => item.status === "ativo");
      const transportadoresPorId = new Map(transportadoresAtivos.map((item) => [item.id, item]));
      const motoristasPorId = new Map(motoristas.map((item) => [item.id, item]));
      const contratosSet = new Set(
        contratos.filter((item) => !!item.arquivo_url && item.tipo === "contrato").map((item) => item.motorista_id),
      );
      const adesoesSet = new Set(
        contratos.filter((item) => !!item.arquivo_url && item.tipo === "adesao").map((item) => item.motorista_id),
      );
      const avaliacoesMotoristas = vinculos
        .filter((vinculo) => transportadoresPorId.has(vinculo.transportador_id))
        .map((vinculo) => {
          const motorista = motoristasPorId.get(vinculo.motorista_id);
          const transportador = transportadoresPorId.get(vinculo.transportador_id);
          if (!motorista || !transportador) return null;
          return checkMotoristaAptidao(
            motorista,
            { contrato: contratosSet.has(motorista.id), adesao: adesoesSet.has(motorista.id) },
            transportador,
            vinculo.motorista_proprio === true,
          );
        })
        .filter((resultado): resultado is NonNullable<typeof resultado> => resultado !== null);

      motoristas.forEach((motorista) => {
        const adicionarDocumento = (tipo: string, vencimento: string | null) => {
          if (!vencimento) return;
          const diasRestantes = diasEntreHoje(vencimento, hoje);
          documentos.push({
            id: `${motorista.id}-${tipo}`,
            type: tipo.toLowerCase(),
            motorista: motorista.nome,
            documento: tipo,
            vencimento: new Date(`${String(vencimento).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR"),
            vencimentoISO: String(vencimento).slice(0, 10),
            entidade: "motorista",
            entidadeId: motorista.id,
            diasRestantes,
          });
        };
        adicionarDocumento("CNH", motorista.cnh_vencimento);
        if (!motorista.mopp_vitalicio) adicionarDocumento("MOPP", motorista.mopp_vencimento);
        adicionarDocumento("ANTT", motorista.antt_vencimento);
      });

      documentos.sort((a, b) => a.diasRestantes - b.diasRestantes);
      const transportadoresInaptos = transportadoresAtivos.filter(
        (item) => item.situacao_operacional === "inapto",
      ).length;
      const motoristasAptos = avaliacoesMotoristas.filter((resultado) => resultado.apto).length;

      setStats({
        transportadores: transportadoresAtivos.length,
        transportadoresAtivos: transportadoresAtivos.length - transportadoresInaptos,
        transportadoresInaptos,
        motoristas: avaliacoesMotoristas.length,
        motoristasAtivos: motoristasAptos,
        motoristasInaptos: avaliacoesMotoristas.length - motoristasAptos,
      });
      setAllDocuments(documentos);
      setAllAlerts(documentos.filter((item) => item.diasRestantes <= 30));
      setLoading(false);
    };
    fetchDashboard();
  }, []);

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
      <div className="animate-fade-in space-y-5">
        <header className="pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{dataAtual}</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-foreground sm:text-[30px]">Bom dia, {firstName}.</h1>
          <p className="mt-1.5 text-sm font-normal text-muted-foreground">Acompanhe os principais indicadores da sua operação.</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Transportadores"
            value={stats.transportadores}
            subtitle={<><strong className="font-semibold text-primary">{stats.transportadoresAtivos} ativos</strong><span> · {stats.transportadoresInaptos} transportadores inaptos</span></>}
            icon={Truck}
          />
          <StatCard
            title="Transportadores aptos"
            value={stats.transportadoresAtivos}
            subtitle={<strong className="font-semibold text-amber-600">{stats.transportadoresInaptos} transportadores inaptos</strong>}
            icon={BadgeCheck}
            variant="success"
          />
          <StatCard
            title="Motoristas"
            value={stats.motoristas}
            subtitle={<><strong className="font-semibold text-primary">{stats.motoristasAtivos} ativos</strong><span> · {stats.motoristasInaptos} motoristas inaptos</span></>}
            icon={Users}
          />
          <StatCard
            title="Motoristas aptos"
            value={stats.motoristasAtivos}
            subtitle={<strong className="font-semibold text-amber-600">{stats.motoristasInaptos} motoristas inaptos</strong>}
            icon={UserCheck}
            variant="success"
          />
        </div>

        <DashboardInsights documents={allDocuments} />

        <div className="grid items-stretch gap-5 xl:h-[520px] xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <div className="min-h-0 h-full">
            {alerts.length > 0 ? (
              <AlertCard
                alerts={mostrarTodas ? alerts : alerts.slice(0, MAX_ALERTAS_VISIVEIS)}
                totalCount={alerts.length}
                onVerTodas={mostrarTodas ? undefined : () => setMostrarTodas(true)}
                arquivadosCount={arquivados.length + alertsAntigos.length}
                onVerArquivados={() => setArquivadosOpen(true)}
                onArquivar={(alert) =>
                  arquivarAlerta.mutate({
                    entidade: alert.entidade,
                    entidade_id: alert.entidadeId,
                    entidade_nome: alert.motorista,
                    tipo_documento: alert.documento,
                    vencimento: alert.vencimentoISO,
                  })
                }
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center shadow-card">
                <BadgeCheck className="mx-auto mb-3 h-10 w-10 text-success" />
                <h3 className="font-semibold text-foreground">Tudo em dia!</h3>
                <p className="mt-1 text-sm text-muted-foreground">Nenhum documento próximo do vencimento.</p>
                <button className="mt-4 text-sm font-semibold text-primary hover:underline" onClick={() => setArquivadosOpen(true)}>
                  Ver arquivados{arquivados.length > 0 ? ` (${arquivados.length})` : ""}
                </button>
              </div>
            )}
          </div>
          <RecentActivityCard activities={atividadesRecentes} />
        </div>

        <AlertasArquivadosDialog
          open={arquivadosOpen}
          onOpenChange={setArquivadosOpen}
          antigos={alertsAntigos.map((a) => ({
            id: a.id,
            nome: a.motorista,
            tipoDocumento: a.documento,
            vencimento: a.vencimentoISO,
            diasRestantes: a.diasRestantes,
          }))}
        />
      </div>
    </MainLayout>
  );
}
