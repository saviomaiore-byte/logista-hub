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
  Download,
  Paperclip,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { checkMotoristaAptidao } from "@/lib/aptidao";
import { reportDbError } from "@/lib/dbError";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { buildPdfDoc } from "@/components/relatorio/relatorioPdf";
import { buildExcelWorkbook } from "@/components/relatorio/relatorioExcel";
import { SITUACAO_LABELS, SITUACAO_ICONS, DIAS_SEMANA, formatDate, docStatus, type TransportadorComMotoristas, type MotoristaRelatorio } from "@/components/relatorio/types";
import { RelatoriosHeader } from "@/components/relatorio/RelatoriosHeader";
import { RelatorioResumoCards } from "@/components/relatorio/RelatorioResumoCards";
import { RelatorioDadosTab } from "@/components/relatorio/RelatorioDadosTab";
import { PdfPreviewTab } from "@/components/relatorio/PdfPreviewTab";
import { ExcelPreviewTab } from "@/components/relatorio/ExcelPreviewTab";
import { ConfiguracoesTab } from "@/components/relatorio/ConfiguracoesTab";


export default function Relatorios() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dados, setDados] = useState<TransportadorComMotoristas[]>([]);
  const [activeTab, setActiveTab] = useState("preview");

  // Preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [excelPreviewData, setExcelPreviewData] = useState<Record<string, any[][]> | null>(null);
  const [activeExcelSheet, setActiveExcelSheet] = useState<string>("");

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

  // Clean up PDF blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  async function fetchConfig() {
    const { data, error } = await supabase
      .from("relatorio_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reportDbError("carregar configurações do relatório", error, (m) => toast({ title: m, variant: "destructive" }))) return;

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

    const atualizar = async (id: string) => {
      const { error } = await supabase.from("relatorio_config").update(configData).eq("id", id);
      if (reportDbError("salvar configurações", error, (m) => toast({ title: m, variant: "destructive" }))) return false;
      setConfigId(id);
      return true;
    };

    if (configId) {
      if (!(await atualizar(configId))) return;
      toast({ title: "Configurações salvas com sucesso!" });
      return;
    }

    // configId vazio: pode ser primeira configuração OU falha transitória de leitura.
    // Reconsulta antes de inserir para nunca duplicar a configuração semanal.
    const { data: existente, error: erroBusca } = await supabase
      .from("relatorio_config")
      .select("id")
      .eq("tipo", "semanal")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reportDbError("salvar configurações", erroBusca, (m) => toast({ title: m, variant: "destructive" }))) return;

    if (existente?.id) {
      if (!(await atualizar(existente.id))) return;
      toast({ title: "Configurações salvas com sucesso!" });
      return;
    }

    const { data, error } = await supabase
      .from("relatorio_config")
      .insert({ ...configData, tipo: "semanal" })
      .select()
      .single();

    if (error) {
      // Corrida: outra sessão criou a configuração entre a leitura e o insert.
      if ((error as any).code === "23505") {
        const { data: criada } = await supabase
          .from("relatorio_config")
          .select("id")
          .eq("tipo", "semanal")
          .limit(1)
          .maybeSingle();
        if (criada?.id) {
          if (!(await atualizar(criada.id))) return;
          toast({ title: "Configurações salvas com sucesso!" });
          return;
        }
      }
      reportDbError("salvar configurações", error, (m) => toast({ title: m, variant: "destructive" }));
      return;
    }

    if (data) setConfigId(data.id);
    toast({ title: "Configurações salvas com sucesso!" });
  }

  async function fetchDados() {
    setLoading(true);
    try {
      const { data: transportadores, error: transportadoresError } = await supabase
        .from("transportadores")
        .select("id, razao_social, cpf_cnpj, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero")
        .eq("status", "ativo");

      const { data: links, error: linksError } = await supabase
        .from("transportador_motoristas")
        .select("transportador_id, motorista_id");

      const { data: motoristas, error: motoristasError } = await supabase
        .from("motoristas")
        .select("*");

      const { data: contratos, error: contratosError } = await supabase
        .from("contratos")
        .select("motorista_id, arquivo_url, tipo");

      const primeiroErro = transportadoresError || linksError || motoristasError || contratosError;
      if (reportDbError("carregar dados do relatório", primeiroErro, (m) => toast({ title: m, variant: "destructive" }))) {
        setLoading(false);
        return;
      }

      const contratosSet = new Set(
        (contratos || [])
          .filter((c) => !!c.arquivo_url && c.tipo === "contrato")
          .map((c) => c.motorista_id)
      );

      const result: TransportadorComMotoristas[] = (transportadores || []).map((t) => {
        const motoristaIds = (links || [])
          .filter((l) => l.transportador_id === t.id)
          .map((l) => l.motorista_id);

        const mots: MotoristaRelatorio[] = (motoristas || [])
          .filter((m) => motoristaIds.includes(m.id))
          .map((m) => {
            const temContrato = contratosSet.has(m.id);
            const { apto, motivos } = checkMotoristaAptidao(m, temContrato, t);
            return {
              id: m.id,
              nome: m.nome,
              cpf: m.cpf,
              status: m.status,
              cnh_numero: m.cnh_numero,
              cnh_vencimento: m.cnh_vencimento,
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
          situacao_operacional: (t as any).situacao_operacional || "em_praca_apto",
          antt_numero: t.antt_numero,
          alvara_numero: t.alvara_numero,
          certificado_numero: t.certificado_numero,
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

    dados.forEach((t) => {
      const sit = t.situacao_operacional || "em_praca_apto";
      t.motoristas.forEach((m) => {
        totalMotoristas++;
        if (m.apto) aptos++;
        else inaptos++;
        if (sit === "em_praca" || sit === "em_praca_apto") emPraca++;
        if (sit === "em_viagem" || sit === "em_viagem_apto") emViagem++;
      });
    });

    return { totalMotoristas, aptos, inaptos, emPraca, emViagem, totalTransportadoras: dados.length };
  }, [dados]);

  function gerarPDF() {
    const doc = buildPdfDoc(dados, resumo);
    doc.save(`relatorio-motoristas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  }

  function gerarExcel() {
    const wb = buildExcelWorkbook(dados, resumo);
    XLSX.writeFile(wb, `relatorio-motoristas-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Excel gerado com sucesso!" });
  }

  // ─── Preview functions ───
  function gerarPreviewPDF() {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    const doc = buildPdfDoc(dados, resumo);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfPreviewUrl(url);
    setActiveTab("preview-pdf");
  }

  function gerarPreviewExcel() {
    const wb = buildExcelWorkbook(dados, resumo);
    const sheetsData: Record<string, any[][]> = {};
    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      sheetsData[name] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    });
    setExcelPreviewData(sheetsData);
    setActiveExcelSheet(wb.SheetNames[0] || "");
    setActiveTab("preview-excel");
  }

  // ─── Get base64 for sending ───
  function getPdfBase64(): string {
    const doc = buildPdfDoc(dados, resumo);
    return doc.output("datauristring").split(",")[1];
  }

  function getExcelBase64(): string {
    const wb = buildExcelWorkbook(dados, resumo);
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    return wbout;
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
    const email = novoEmail.trim().toLowerCase();
    let finalDestinatarios = [...destinatarios];
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !finalDestinatarios.includes(email)) {
      finalDestinatarios.push(email);
      setDestinatarios(finalDestinatarios);
      setNovoEmail("");
    }

    if (finalDestinatarios.length === 0) {
      toast({ title: "Adicione pelo menos um destinatário", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const pdfBase64 = getPdfBase64();
      const excelBase64 = getExcelBase64();
      const dateStr = format(new Date(), "yyyy-MM-dd");

      const { error } = await supabase.functions.invoke("send-report-email", {
        body: {
          destinatarios: finalDestinatarios,
          assunto,
          corpo,
          dados: dados.map((t) => ({
            razao_social: t.razao_social,
            cpf_cnpj: t.cpf_cnpj,
            antt: t.antt_numero ? "Sim" : "Não",
            certificado: t.certificado_numero ? "Sim" : "Não",
            alvara: t.alvara_numero ? "Sim" : "Não",
            motoristas: t.motoristas.map((m) => ({
              nome: m.nome,
              cpf: m.cpf,
              apto: m.apto,
              status: m.status,
              situacao_operacional: SITUACAO_LABELS[t.situacao_operacional || "em_praca_apto"],
              tem_contrato: m.tem_contrato,
              motivos_inaptidao: m.motivos_inaptidao,
            })),
          })),
          anexos: [
            {
              filename: `relatorio-motoristas-${dateStr}.pdf`,
              content: pdfBase64,
              contentType: "application/pdf",
            },
            {
              filename: `relatorio-motoristas-${dateStr}.xlsx`,
              content: excelBase64,
              contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          ],
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
        <RelatoriosHeader
          loading={loading}
          sending={sending}
          sendDisabled={sending || (destinatarios.length === 0 && !novoEmail.trim())}
          onRefresh={fetchDados}
          onExcel={gerarExcel}
          onPdf={gerarPDF}
          onEnviar={enviarRelatorio}
        />

        {/* Summary Cards */}
        <RelatorioResumoCards resumo={resumo} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="preview-pdf" onClick={gerarPreviewPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Pré-visualizar PDF
            </TabsTrigger>
            <TabsTrigger value="preview-excel" onClick={gerarPreviewExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Pré-visualizar Excel
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Data preview tab */}
          <TabsContent value="preview" className="mt-4 space-y-6">
            <RelatorioDadosTab dados={dados} loading={loading} />
          </TabsContent>

          {/* PDF Preview tab */}
          <TabsContent value="preview-pdf" className="mt-4">
            <PdfPreviewTab pdfPreviewUrl={pdfPreviewUrl} onDownload={gerarPDF} />
          </TabsContent>

          {/* Excel Preview tab */}
          <TabsContent value="preview-excel" className="mt-4">
            <ExcelPreviewTab
              excelPreviewData={excelPreviewData}
              activeExcelSheet={activeExcelSheet}
              onSelectSheet={setActiveExcelSheet}
              onDownload={gerarExcel}
            />
          </TabsContent>

          {/* Config tab */}
          <TabsContent value="config" className="mt-4">
            <ConfiguracoesTab
              destinatarios={destinatarios}
              novoEmail={novoEmail}
              setNovoEmail={setNovoEmail}
              assunto={assunto}
              setAssunto={setAssunto}
              corpo={corpo}
              setCorpo={setCorpo}
              diaEnvio={diaEnvio}
              setDiaEnvio={setDiaEnvio}
              horarioEnvio={horarioEnvio}
              setHorarioEnvio={setHorarioEnvio}
              envioAutomatico={envioAutomatico}
              setEnvioAutomatico={setEnvioAutomatico}
              addDestinatario={addDestinatario}
              removeDestinatario={removeDestinatario}
              saveConfig={saveConfig}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
