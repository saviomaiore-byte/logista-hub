import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, FileText, Shield, Truck, Users } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useTransportadores, useTransportadorVinculos, useRegistrosAntt } from "@/hooks/useTransportadores";
import { useContratos } from "@/hooks/useContratos";
import { useDocumentosEmpresa } from "@/hooks/useDocumentosEmpresa";
import { useSeguros } from "@/hooks/useSeguros";
import { useAtividadesRecentes } from "@/hooks/useAtividadesRecentes";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";

const formatDate = (value?: string | null) =>
  value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">{text}</div>;
}

export default function TransportadorDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: transportadores = [], isLoading } = useTransportadores();
  const { data: vinculos = [] } = useTransportadorVinculos();
  const { data: registrosAntt = [] } = useRegistrosAntt();
  const { data: contratos = [] } = useContratos();
  const { data: documentos = [] } = useDocumentosEmpresa();
  const { data: seguros = [] } = useSeguros();
  const { data: historico = [] } = useAtividadesRecentes({
    limit: 50,
    transportadorId: id,
  });

  const transportador = transportadores.find((item) => item.id === id);
  const motoristas = vinculos.filter((item) => item.transportador_id === id);
  const motoristaIds = useMemo(() => new Set(motoristas.map((item) => item.motorista_id)), [motoristas]);
  const anttDoTransportador = registrosAntt.filter((item) => item.transportador_id === id);
  const totalVeiculos = anttDoTransportador.reduce(
    (total, item) => total + (item.qtd_cavalos || 0) + (item.qtd_reboques || 0),
    0,
  );
  const contratosVinculados = contratos.filter((item) => item.transportador_id === id);
  const documentosVinculados = documentos.filter((item) => item.empresa === transportador?.razao_social);
  const segurosVinculados = seguros.filter((item) => item.motorista_id && motoristaIds.has(item.motorista_id));

  if (isLoading) return <MainLayout><div className="py-20 text-center text-sm text-muted-foreground">Carregando transportador...</div></MainLayout>;
  if (!transportador) return <MainLayout><EmptyState text="Transportador não encontrado." /></MainLayout>;

  const info = [
    ["Razão social", transportador.razao_social],
    ["CPF/CNPJ", transportador.cpf_cnpj],
    ["Regime tributário", transportador.inscricao_estadual || "—"],
    ["Contato", transportador.contato || "—"],
    ["E-mail", transportador.email || "—"],
    ["Endereço", transportador.endereco || "—"],
    ["ANTT", transportador.antt_numero || "—"],
    ["Cadastrado em", formatDate(transportador.created_at)],
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/transportadores")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Transportadores
        </Button>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-base font-semibold text-primary">
            {initials(transportador.razao_social)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{transportador.razao_social}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{transportador.cpf_cnpj}</span><span>·</span>
              <span>{transportador.contato || "Contato não informado"}</span>
              <Badge className={transportador.status === "ativo" ? "status-success border-0" : "status-danger border-0"}>
                {transportador.status === "ativo" ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </header>

        <Tabs defaultValue="visao-geral">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
            {[
              ["visao-geral", "Visão geral"], ["documentos", "Documentos"], ["contratos", "Contratos"],
              ["seguros", "Seguros"], ["motoristas", "Motoristas"], ["historico", "Histórico"],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="rounded-none border-b-2 border-transparent px-1 py-3 mr-6 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>          <TabsContent value="visao-geral" className="mt-5 space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
              <Card className="rounded-2xl shadow-card">
                <CardHeader><CardTitle className="text-sm font-semibold">Dados cadastrais</CardTitle></CardHeader>
                <CardContent className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {info.map(([label, value]) => <div key={label}><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-card">
                <CardHeader><CardTitle className="text-sm font-semibold">Resumo operacional</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  {[
                    [Truck, frota.length, "Veículos"], [Users, motoristas.length, "Motoristas"],
                    [FileText, contratosVinculados.length, "Contratos"], [Shield, segurosVinculados.length, "Seguros"],
                  ].map(([Icon, value, label]: any) => (
                    <div key={label} className="rounded-xl bg-muted/50 p-4">
                      <Icon className="h-4 w-4 text-primary" /><strong className="mt-3 block text-2xl font-semibold">{value}</strong><span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="rounded-2xl shadow-card">
              <CardHeader><CardTitle className="text-sm font-semibold">Contratos vinculados</CardTitle></CardHeader>
              <CardContent>
                {contratosVinculados.length ? <div className="divide-y divide-border">{contratosVinculados.slice(0, 4).map((item) => (
                  <div key={item.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[1fr_1fr_120px]">
                    <strong>{item.tipo}</strong><span className="text-muted-foreground">{item.empresa}</span><span>{item.modelo || item.tipo}</span>
                  </div>
                ))}</div> : <EmptyState text="Nenhum contrato vinculado." />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos" className="mt-5">
            <Card className="rounded-2xl shadow-card"><CardHeader><CardTitle className="text-sm">Documentos</CardTitle></CardHeader><CardContent>
              {documentosVinculados.length ? <div className="divide-y divide-border">{documentosVinculados.map((item) => (
                <div key={item.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[1fr_1fr_120px]"><strong>{item.tipo}</strong><span>{item.descricao || "—"}</span><span>{formatDate(item.vencimento)}</span></div>
              ))}</div> : <EmptyState text="Nenhum documento empresarial vinculado." />}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="contratos" className="mt-5">
            <Card className="rounded-2xl shadow-card"><CardHeader><CardTitle className="text-sm">Contratos</CardTitle></CardHeader><CardContent>
              {contratosVinculados.length ? <div className="divide-y divide-border">{contratosVinculados.map((item) => (
                <div key={item.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[1fr_1fr_120px_120px]"><strong>{item.modelo || item.tipo}</strong><span>{item.empresa}</span><span>{formatDate(item.data_assinatura)}</span><span>{item.tipo}</span></div>
              ))}</div> : <EmptyState text="Nenhum contrato vinculado." />}
            </CardContent></Card>
          </TabsContent>          <TabsContent value="seguros" className="mt-5">
            <Card className="rounded-2xl shadow-card"><CardHeader><CardTitle className="text-sm">Seguros dos motoristas vinculados</CardTitle></CardHeader><CardContent>
              {segurosVinculados.length ? <div className="divide-y divide-border">{segurosVinculados.map((item) => (
                <div key={item.id} className="grid gap-2 py-3 text-xs sm:grid-cols-[1fr_1fr_1fr_110px]"><strong>{item.tipo}</strong><span>{item.seguradora}</span><span>{item.motoristas?.nome || "—"}</span><span>{formatDate(item.vigencia_fim)}</span></div>
              ))}</div> : <EmptyState text="Nenhum seguro encontrado para os motoristas vinculados." />}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="motoristas" className="mt-5">
            <Card className="rounded-2xl shadow-card"><CardHeader><CardTitle className="text-sm">Motoristas vinculados</CardTitle></CardHeader><CardContent>
              {motoristas.length ? <div className="divide-y divide-border">{motoristas.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">{initials(item.motoristas?.nome || "?")}</div>
                  <div className="flex-1"><p className="text-sm font-medium">{item.motoristas?.nome}</p><p className="text-xs text-muted-foreground">{item.motoristas?.cpf}</p></div>
                  {item.motorista_proprio && <Badge variant="outline" className="text-[10px]">Motorista próprio</Badge>}
                </div>
              ))}</div> : <EmptyState text="Nenhum motorista vinculado." />}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="historico" className="mt-5">
            <RecentActivityCard
              activities={historico}
              title="Histórico"
              subtitle="Movimentações relacionadas a esta transportadora"
              emptyText="Nenhuma movimentação foi registrada para esta transportadora."
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
