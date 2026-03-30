import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Send,
  Settings,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Truck,
  Users,
  MapPin,
  Navigation,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Types
interface TransportadorComMotoristas {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
  status: string;
  motoristas: MotoristaRelatorio[];
}

interface MotoristaRelatorio {
  id: string;
  nome: string;
  cpf: string;
  status: string | null;
  situacao_operacional: string | null;
  cnh_numero: string | null;
  cnh_vencimento: string | null;
  antt_numero: string | null;
  antt_vencimento: string | null;
  alvara_numero: string | null;
  alvara_vencimento: string | null;
  certificado_numero: string | null;
  certificado_vencimento: string | null;
  mopp_numero: string | null;
  mopp_vencimento: string | null;
  mopp_vitalicio: boolean;
  tem_contrato: boolean;
  motivos_inaptidao: string[];
  apto: boolean;
}

const SITUACAO_LABELS: Record<string, string> = {
  em_praca: "Em Praça",
  em_viagem: "Em Viagem",
  indisponivel: "Indisponível",
};

const SITUACAO_ICONS: Record<string, typeof MapPin> = {
  em_praca: MapPin,
  em_viagem: Navigation,
  indisponivel: Clock,
};

const DIAS_SEMANA = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

function checkMotoristaAptidao(m: any, temContrato: boolean): { apto: boolean; motivos: string[] } {
  const motivos: string[] = [];


  if (!temContrato) motivos.push("Sem contrato assinado");
  if (m.antt_vencimento && isPast(parseISO(m.antt_vencimento))) motivos.push("ANTT vencida");
  if (!m.antt_numero) motivos.push("ANTT não cadastrada");
  if (m.alvara_vencimento && isPast(parseISO(m.alvara_vencimento))) motivos.push("Alvará vencido");
  if (m.certificado_vencimento && isPast(parseISO(m.certificado_vencimento))) motivos.push("Certificado vencido");
  if (m.cnh_vencimento && isPast(parseISO(m.cnh_vencimento))) motivos.push("CNH vencida");
  if (!m.mopp_vitalicio && m.mopp_vencimento && isPast(parseISO(m.mopp_vencimento))) motivos.push("MOPP vencido");
  if (m.status === "inativo") motivos.push("Motorista inativo");

  return { apto: motivos.length === 0, motivos };
}

export default function Relatorios() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dados, setDados] = useState<TransportadorComMotoristas[]>([]);
  const [activeTab, setActiveTab] = useState("preview");

  // Email config
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [novoEmail, setNovoEmail] = useState("");
  const [assunto, setAssunto] = useState("Relatório Semanal de Motoristas");
  const [corpo, setCorpo] = useState("Segue em anexo o relatório semanal com a situação dos motoristas.");
  const [diaEnvio, setDiaEnvio] = useState("segunda");
  const [horarioEnvio, setHorarioEnvio] = useState("08:00");
  const [envioAutomatico, setEnvioAutomatico] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    fetchDados();
    fetchConfig();
  }, []);

  async function fetchConfig() {
    const { data } = await supabase
      .from("relatorio_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfigId(data.id);
      setDestinatarios((data as any).destinatarios || []);
      setAssunto((data as any).assunto_padrao || assunto);
      setCorpo((data as any).corpo_padrao || corpo);
      setDiaEnvio((data as any).dia_envio || "segunda");
      setHorarioEnvio((data as any).horario_envio || "08:00");
      setEnvioAutomatico((data as any).envio_automatico || false);
    }
  }

  async function saveConfig() {
    // Auto-add email typed in the input field before saving
    const email = novoEmail.trim().toLowerCase();
    let finalDestinatarios = [...destinatarios];
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !finalDestinatarios.includes(email)) {
      finalDestinatarios.push(email);
      setDestinatarios(finalDestinatarios);
      setNovoEmail("");
    }

    const configData = {
      destinatarios: finalDestinatarios,
      assunto_padrao: assunto,
      corpo_padrao: corpo,
      dia_envio: diaEnvio,
      horario_envio: horarioEnvio,
      envio_automatico: envioAutomatico,
    };

    if (configId) {
      await supabase.from("relatorio_config").update(configData).eq("id", configId);
    } else {
      const { data } = await supabase.from("relatorio_config").insert(configData).select().single();
      if (data) setConfigId(data.id);
    }
    toast({ title: "Configurações salvas com sucesso!" });
  }

  async function fetchDados() {
    setLoading(true);
    try {
      // Fetch transportadores
      const { data: transportadores } = await supabase
        .from("transportadores")
        .select("id, razao_social, cpf_cnpj, status")
        .eq("status", "ativo");

      // Fetch all links
      const { data: links } = await supabase
        .from("transportador_motoristas")
        .select("transportador_id, motorista_id");

      // Fetch all motoristas
      const { data: motoristas } = await supabase
        .from("motoristas")
        .select("*");

      // Fetch contratos (signed)
      const { data: contratos } = await supabase
        .from("contratos")
        .select("motorista_id, status")
        .eq("status", "assinado");

      const contratosSet = new Set((contratos || []).map((c) => c.motorista_id));

      const result: TransportadorComMotoristas[] = (transportadores || []).map((t) => {
        const motoristaIds = (links || [])
          .filter((l) => l.transportador_id === t.id)
          .map((l) => l.motorista_id);

        const mots: MotoristaRelatorio[] = (motoristas || [])
          .filter((m) => motoristaIds.includes(m.id))
          .map((m) => {
            const temContrato = contratosSet.has(m.id);
            const { apto, motivos } = checkMotoristaAptidao(m, temContrato);
            return {
              id: m.id,
              nome: m.nome,
              cpf: m.cpf,
              status: m.status,
              situacao_operacional: (m as any).situacao_operacional || "em_praca",
              cnh_numero: m.cnh_numero,
              cnh_vencimento: m.cnh_vencimento,
              antt_numero: m.antt_numero,
              antt_vencimento: m.antt_vencimento,
              alvara_numero: (m as any).alvara_numero,
              alvara_vencimento: (m as any).alvara_vencimento,
              certificado_numero: (m as any).certificado_numero,
              certificado_vencimento: (m as any).certificado_vencimento,
              mopp_numero: m.mopp_numero,
              mopp_vencimento: m.mopp_vencimento,
              mopp_vitalicio: m.mopp_vitalicio,
              tem_contrato: temContrato,
              motivos_inaptidao: motivos,
              apto,
            };
          });

        return {
          id: t.id,
          razao_social: t.razao_social,
          cpf_cnpj: t.cpf_cnpj,
          status: t.status,
          motoristas: mots,
        };
      });

      setDados(result);
    } catch (err) {
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    }
    setLoading(false);
  }

  const resumo = useMemo(() => {
    let totalMotoristas = 0;
    let aptos = 0;
    let inaptos = 0;
    let emPraca = 0;
    let emViagem = 0;

    dados.forEach((t) =>
      t.motoristas.forEach((m) => {
        totalMotoristas++;
        if (m.apto) aptos++;
        else inaptos++;
        if (m.situacao_operacional === "em_praca") emPraca++;
        if (m.situacao_operacional === "em_viagem") emViagem++;
      })
    );

    return { totalMotoristas, aptos, inaptos, emPraca, emViagem, totalTransportadoras: dados.length };
  }, [dados]);

  function formatDate(d: string | null) {
    if (!d) return "—";
    try {
      return format(parseISO(d), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  }

  function docStatus(vencimento: string | null, numero: string | null) {
    if (!numero && !vencimento) return { label: "Não cadastrado", variant: "secondary" as const };
    if (!vencimento) return { label: "Sem validade", variant: "secondary" as const };
    if (isPast(parseISO(vencimento))) return { label: "Vencido", variant: "destructive" as const };
    return { label: "Regular", variant: "default" as const };
  }

  // PDF Generation
  function gerarPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const dataAtual = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

    doc.setFontSize(16);
    doc.text("Relatório Semanal de Motoristas", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dataAtual}`, 14, 28);

    let startY = 35;

    dados.forEach((t) => {
      if (startY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${t.razao_social} — CNPJ: ${t.cpf_cnpj}`, 14, startY);
      startY += 6;

      if (t.motoristas.length === 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Nenhum motorista vinculado.", 14, startY);
        startY += 10;
        return;
      }

      const tableData = t.motoristas.map((m) => [
        m.nome,
        m.cpf,
        m.apto ? "APTO" : "INAPTO",
        m.status === "ativo" ? "Ativo" : "Inativo",
        SITUACAO_LABELS[m.situacao_operacional || "em_praca"] || "Em Praça",
        m.tem_contrato ? "Sim" : "Não",
        docStatus(m.antt_vencimento, m.antt_numero).label,
        docStatus(m.certificado_vencimento, m.certificado_numero).label,
        docStatus(m.alvara_vencimento, m.alvara_numero).label,
        m.apto ? "" : m.motivos_inaptidao.join("; "),
      ]);

      autoTable(doc, {
        startY,
        head: [["Nome", "CPF", "Aptidão", "Status", "Situação", "Contrato", "ANTT", "Certificado", "Alvará", "Motivos Inaptidão"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [34, 49, 74], textColor: 255, fontSize: 8 },
        columnStyles: {
          2: { fontStyle: "bold" },
          9: { cellWidth: 50 },
        },
        didParseCell: (data) => {
          if (data.column.index === 2 && data.section === "body") {
            if (data.cell.raw === "INAPTO") {
              data.cell.styles.textColor = [220, 38, 38];
            } else {
              data.cell.styles.textColor = [22, 163, 74];
            }
          }
        },
        margin: { left: 14, right: 14 },
      });

      startY = (doc as any).lastAutoTable.finalY + 12;
    });

    // Summary page
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Resumo", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Indicador", "Quantidade"]],
      body: [
        ["Total de Transportadoras", resumo.totalTransportadoras.toString()],
        ["Total de Motoristas", resumo.totalMotoristas.toString()],
        ["Motoristas Aptos", resumo.aptos.toString()],
        ["Motoristas Inaptos", resumo.inaptos.toString()],
        ["Em Praça", resumo.emPraca.toString()],
        ["Em Viagem", resumo.emViagem.toString()],
      ],
      headStyles: { fillColor: [34, 49, 74] },
      styles: { fontSize: 11 },
    });

    doc.save(`relatorio-motoristas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  }

  // Excel Generation
  function gerarExcel() {
    const wb = XLSX.utils.book_new();

    dados.forEach((t) => {
      const sheetData = t.motoristas.map((m) => ({
        Nome: m.nome,
        CPF: m.cpf,
        Aptidão: m.apto ? "APTO" : "INAPTO",
        Status: m.status === "ativo" ? "Ativo" : "Inativo",
        "Situação Operacional": SITUACAO_LABELS[m.situacao_operacional || "em_praca"] || "Em Praça",
        "Contrato Assinado": m.tem_contrato ? "Sim" : "Não",
        "ANTT Nº": m.antt_numero || "",
        "ANTT Vencimento": formatDate(m.antt_vencimento),
        "ANTT Status": docStatus(m.antt_vencimento, m.antt_numero).label,
        "Certificado Nº": m.certificado_numero || "",
        "Certificado Vencimento": formatDate(m.certificado_vencimento),
        "Certificado Status": docStatus(m.certificado_vencimento, m.certificado_numero).label,
        "Alvará Nº": m.alvara_numero || "",
        "Alvará Vencimento": formatDate(m.alvara_vencimento),
        "Alvará Status": docStatus(m.alvara_vencimento, m.alvara_numero).label,
        "CNH Nº": m.cnh_numero || "",
        "CNH Vencimento": formatDate(m.cnh_vencimento),
        "Motivos Inaptidão": m.motivos_inaptidao.join("; "),
      }));

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const sheetName = t.razao_social.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, "");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Summary sheet
    const summaryData = [
      { Indicador: "Total de Transportadoras", Quantidade: resumo.totalTransportadoras },
      { Indicador: "Total de Motoristas", Quantidade: resumo.totalMotoristas },
      { Indicador: "Motoristas Aptos", Quantidade: resumo.aptos },
      { Indicador: "Motoristas Inaptos", Quantidade: resumo.inaptos },
      { Indicador: "Em Praça", Quantidade: resumo.emPraca },
      { Indicador: "Em Viagem", Quantidade: resumo.emViagem },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

    XLSX.writeFile(wb, `relatorio-motoristas-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Excel gerado com sucesso!" });
  }

  function addDestinatario() {
    const email = novoEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }
    if (destinatarios.includes(email)) {
      toast({ title: "E-mail já adicionado", variant: "destructive" });
      return;
    }
    setDestinatarios([...destinatarios, email]);
    setNovoEmail("");
  }

  function removeDestinatario(email: string) {
    setDestinatarios(destinatarios.filter((d) => d !== email));
  }

  async function enviarRelatorio() {
    if (destinatarios.length === 0) {
      toast({ title: "Adicione pelo menos um destinatário", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-report-email", {
        body: {
          destinatarios,
          assunto,
          corpo,
          dados: dados.map((t) => ({
            razao_social: t.razao_social,
            cpf_cnpj: t.cpf_cnpj,
            motoristas: t.motoristas.map((m) => ({
              nome: m.nome,
              cpf: m.cpf,
              apto: m.apto,
              status: m.status,
              situacao_operacional: SITUACAO_LABELS[m.situacao_operacional || "em_praca"],
              tem_contrato: m.tem_contrato,
              antt_status: docStatus(m.antt_vencimento, m.antt_numero).label,
              certificado_status: docStatus(m.certificado_vencimento, m.certificado_numero).label,
              alvara_status: docStatus(m.alvara_vencimento, m.alvara_numero).label,
              motivos_inaptidao: m.motivos_inaptidao,
            })),
          })),
        },
      });
      if (error) throw error;
      toast({ title: "Relatório enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar relatório", description: err.message, variant: "destructive" });
    }
    setSending(false);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatório Semanal</h1>
            <p className="text-muted-foreground mt-1">
              Geração, visualização e envio do relatório de motoristas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={fetchDados} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={gerarExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={gerarPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button size="sm" onClick={enviarRelatorio} disabled={sending || destinatarios.length === 0}>
              <Send className={`h-4 w-4 mr-2 ${sending ? "animate-spin" : ""}`} />
              Enviar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualização
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configurações de Envio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dados.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhuma transportadora ativa encontrada.
                </CardContent>
              </Card>
            ) : (
              dados.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{t.razao_social}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">CNPJ: {t.cpf_cnpj}</p>
                      </div>
                      <Badge variant="secondary">{t.motoristas.length} motorista(s)</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {t.motoristas.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Nenhum motorista vinculado.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Motorista</TableHead>
                            <TableHead>Aptidão</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Situação</TableHead>
                            <TableHead>Contrato</TableHead>
                            <TableHead>ANTT</TableHead>
                            <TableHead>Certificado</TableHead>
                            <TableHead>Alvará</TableHead>
                            <TableHead>Motivos Inaptidão</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {t.motoristas.map((m) => {
                            const SituacaoIcon = SITUACAO_ICONS[m.situacao_operacional || "em_praca"] || MapPin;
                            return (
                              <TableRow key={m.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{m.nome}</p>
                                    <p className="text-xs text-muted-foreground">{m.cpf}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={m.apto ? "default" : "destructive"}>
                                    {m.apto ? "Apto" : "Inapto"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={m.status === "ativo" ? "secondary" : "outline"}>
                                    {m.status === "ativo" ? "Ativo" : "Inativo"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <SituacaoIcon className="h-3.5 w-3.5" />
                                    <span className="text-sm">
                                      {SITUACAO_LABELS[m.situacao_operacional || "em_praca"]}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={m.tem_contrato ? "default" : "destructive"}>
                                    {m.tem_contrato ? "Sim" : "Não"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={docStatus(m.antt_vencimento, m.antt_numero).variant}>
                                    {docStatus(m.antt_vencimento, m.antt_numero).label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={docStatus(m.certificado_vencimento, m.certificado_numero).variant}>
                                    {docStatus(m.certificado_vencimento, m.certificado_numero).label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={docStatus(m.alvara_vencimento, m.alvara_numero).variant}>
                                    {docStatus(m.alvara_vencimento, m.alvara_numero).label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {m.motivos_inaptidao.length > 0 ? (
                                    <div className="space-y-1">
                                      {m.motivos_inaptidao.map((motivo, i) => (
                                        <div key={i} className="flex items-center gap-1 text-xs text-destructive">
                                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                          {motivo}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações de Envio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Destinatários */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Destinatários</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={novoEmail}
                      onChange={(e) => setNovoEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDestinatario())}
                    />
                    <Button variant="outline" size="icon" onClick={addDestinatario}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {destinatarios.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {destinatarios.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1 pr-1">
                          {email}
                          <button onClick={() => removeDestinatario(email)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assunto e Corpo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assunto do E-mail</Label>
                  <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Corpo do E-mail</Label>
                  <Textarea rows={4} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
                </div>

                {/* Envio Automático */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Envio Automático</p>
                      <p className="text-xs text-muted-foreground">
                        O relatório será enviado automaticamente no dia e horário configurados
                      </p>
                    </div>
                    <Switch checked={envioAutomatico} onCheckedChange={setEnvioAutomatico} />
                  </div>

                  {envioAutomatico && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Dia da Semana</Label>
                        <Select value={diaEnvio} onValueChange={setDiaEnvio}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIAS_SEMANA.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Horário</Label>
                        <Input type="time" value={horarioEnvio} onChange={(e) => setHorarioEnvio(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={saveConfig} className="w-full sm:w-auto">
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
