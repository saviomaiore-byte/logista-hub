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

    if (configId) {
      const { error } = await supabase.from("relatorio_config").update(configData).eq("id", configId);
      if (reportDbError("salvar configurações", error, (m) => toast({ title: m, variant: "destructive" }))) return;
    } else {
      const { data, error } = await supabase.from("relatorio_config").insert(configData).select().single();
      if (reportDbError("salvar configurações", error, (m) => toast({ title: m, variant: "destructive" }))) return;
      if (data) setConfigId(data.id);
    }
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
        .select("motorista_id, status")
        .eq("status", "assinado");

      const primeiroErro = transportadoresError || linksError || motoristasError || contratosError;
      if (reportDbError("carregar dados do relatório", primeiroErro, (m) => toast({ title: m, variant: "destructive" }))) {
        setLoading(false);
        return;
      }

      const contratosSet = new Set((contratos || []).map((c) => c.motorista_id));

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
      if (sit === "em_praca" || sit === "em_praca_apto") emPraca++;
      if (sit === "em_viagem" || sit === "em_viagem_apto") emViagem++;
      t.motoristas.forEach((m) => {
        totalMotoristas++;
        if (m.apto) aptos++;
        else inaptos++;
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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pré-visualização do PDF
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={gerarPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pdfPreviewUrl ? (
                  <iframe
                    src={pdfPreviewUrl}
                    className="w-full rounded-md border"
                    style={{ height: "70vh" }}
                    title="Pré-visualização PDF"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-3 opacity-40" />
                    <p>Clique na aba para gerar a pré-visualização do PDF</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Excel Preview tab */}
          <TabsContent value="preview-excel" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Pré-visualização da Planilha
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={gerarExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {excelPreviewData ? (
                  <div className="space-y-4">
                    {/* Sheet selector */}
                    <div className="flex gap-2 flex-wrap">
                      {Object.keys(excelPreviewData).map((sheetName) => (
                        <Button
                          key={sheetName}
                          variant={activeExcelSheet === sheetName ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveExcelSheet(sheetName)}
                        >
                          {sheetName}
                        </Button>
                      ))}
                    </div>

                    {/* Sheet data */}
                    {activeExcelSheet && excelPreviewData[activeExcelSheet] && (
                      <div className="overflow-x-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {(excelPreviewData[activeExcelSheet][0] || []).map((cell: any, i: number) => (
                                <TableHead key={i} className="whitespace-nowrap text-xs">
                                  {cell ?? ""}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {excelPreviewData[activeExcelSheet].slice(1).map((row, ri) => (
                              <TableRow key={ri}>
                                {(excelPreviewData[activeExcelSheet][0] || []).map((_: any, ci: number) => (
                                  <TableCell key={ci} className="whitespace-nowrap text-xs">
                                    {row[ci] ?? ""}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      <span>Esta planilha será enviada como anexo no e-mail</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mb-3 opacity-40" />
                    <p>Clique na aba para gerar a pré-visualização da planilha</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config tab */}
          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações de Envio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Attachments info */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm">Anexos do E-mail</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O relatório será enviado com dois anexos: um arquivo PDF e uma planilha Excel contendo todos os dados dos motoristas organizados por transportadora.
                  </p>
                </div>

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
