import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Formik, Form } from "formik";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarCheck,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermissoes } from "@/hooks/usePermissoes";
import { cn, formatDateOnly } from "@/lib/utils";
import { applyMask } from "@/lib/masks";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { certificadoSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import {
  useCertificados,
  useTransportadorasResumo,
  useCriarCertificado,
  useAgendarRenovacao,
  useAtualizarCertificado,
  useExcluirCertificado,
  useAtualizarRegimeTransportadora,
  type Certificado,
} from "@/hooks/useCertificados";
import { REGIME_TRIBUTARIO_OPTIONS } from "@/components/transportador/types";

const ORDENACAO_OPCOES = [
  { value: "az", label: "Ordem alfabética (A → Z)" },
  { value: "vencimento-proximo", label: "Vencimento mais próximo" },
  { value: "vencimento-distante", label: "Vencimento mais distante" },
] as const;

type Ordenacao = (typeof ORDENACAO_OPCOES)[number]["value"];


const TIPOS_CERTIFICADO = ["A1", "A3"] as const;

/** Normaliza texto para pesquisa: minúsculas, sem acentos, sem espaços extras. */
const normalizarBusca = (valor: string) =>
  valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Data local de hoje como YYYY-MM-DD, para comparação por string (sem timezone). */
const hojeLocal = () => {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
};

/** Considera vencido somente quando a data (YYYY-MM-DD) é anterior a hoje. */
const isVencido = (vencimento: string | null | undefined): boolean => {
  if (!vencimento) return false;
  const data = vencimento.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && data < hojeLocal();
};

const initialValues = {
  empresa: "",
  tipo: "",
  vencimento: "",
  data_renovacao_agendada: "",
  observacoes: "",
  arquivo_url: "",
  regime_tributario: "",
};

export default function Certificados() {
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Certificado | null>(null);
  const [excluindo, setExcluindo] = useState<Certificado | null>(null);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("vencimento-proximo");
  const isMobile = useIsMobile();
  const { isAdmin, podeEditar } = usePermissoes();

  const { data: certificados = [], isLoading: loadingCertificados } = useCertificados();
  const { data: transportadoras = [], isLoading: loadingTransportadoras } = useTransportadorasResumo();
  const criarCertificado = useCriarCertificado();
  const agendarRenovacaoMutation = useAgendarRenovacao();
  const atualizarCertificado = useAtualizarCertificado();
  const excluirCertificado = useExcluirCertificado();
  const atualizarRegime = useAtualizarRegimeTransportadora();

  const loading = loadingCertificados || loadingTransportadoras;

  const cnpjPorEmpresa = new Map(
    transportadoras.map((t) => [t.razao_social, t.cpf_cnpj ? applyMask(t.cpf_cnpj, "cnpj") : ""]),
  );

  const cnpjRawPorEmpresa = new Map(
    transportadoras.map((t) => [t.razao_social, t.cpf_cnpj ? t.cpf_cnpj.replace(/\D/g, "") : ""]),
  );

  const regimePorEmpresa = new Map(
    transportadoras.map((t) => [t.razao_social, t.inscricao_estadual || ""]),
  );

  const termoBusca = normalizarBusca(busca);
  const termoBuscaNumerico = termoBusca.replace(/\D/g, "");

  const certificadosFiltrados = useMemo(() => {
    let lista = certificados.filter((cert) => {
      if (!termoBusca) return true;
      const razao = normalizarBusca(cert.empresa);
      // Razão social real da transportadora relacionada (dados já carregados)
      const transportadora = transportadoras.find(
        (t) => normalizarBusca(t.razao_social) === razao
      );
      const razaoReal = transportadora ? normalizarBusca(transportadora.razao_social) : "";
      const cnpjMascarado = normalizarBusca(cnpjPorEmpresa.get(cert.empresa) || "");
      const cnpjRaw = cnpjRawPorEmpresa.get(cert.empresa) || "";
      return (
        razao.includes(termoBusca) ||
        razaoReal.includes(termoBusca) ||
        (termoBuscaNumerico !== "" && cnpjRaw.includes(termoBuscaNumerico)) ||
        cnpjMascarado.includes(termoBusca)
      );
    });

    lista = [...lista].sort((a, b) => {
      if (ordenacao === "az") {
        return a.empresa.localeCompare(b.empresa, "pt-BR", { sensitivity: "base" });
      }
      const dataA = a.vencimento || "";
      const dataB = b.vencimento || "";
      if (ordenacao === "vencimento-proximo") {
        return dataA.localeCompare(dataB);
      }
      return dataB.localeCompare(dataA);
    });

    return lista;
  }, [certificados, transportadoras, termoBusca, termoBuscaNumerico, ordenacao]);

  const formValues = editando
    ? {
        empresa: editando.empresa,
        tipo: editando.tipo,
        vencimento: editando.vencimento ?? "",
        data_renovacao_agendada: editando.data_renovacao_agendada ?? "",
        observacoes: editando.observacoes ?? "",
        arquivo_url: editando.arquivo_url ?? "",
        regime_tributario: regimePorEmpresa.get(editando.empresa) || "",
      }
    : initialValues;

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    const { regime_tributario, ...certificadoValues } = values;

    try {
      if (editando) {
        await atualizarCertificado.mutateAsync({ id: editando.id, values: certificadoValues });
      } else {
        await criarCertificado.mutateAsync(certificadoValues);
      }
    } catch {
      return;
    }

    // Sincroniza o Regime Tributário na transportadora selecionada (fonte oficial do dado).
    const transportadoraSelecionada = transportadoras.find((t) => t.razao_social === values.empresa);
    if (
      transportadoraSelecionada &&
      regime_tributario &&
      regime_tributario !== (transportadoraSelecionada.inscricao_estadual || "")
    ) {
      try {
        await atualizarRegime.mutateAsync({
          transportadorId: transportadoraSelecionada.id,
          regime: regime_tributario,
        });
      } catch {
        toast.error(
          "Certificado salvo, mas não foi possível atualizar o Regime Tributário da transportadora.",
        );
        setOpen(false);
        setEditando(null);
        resetForm();
        return;
      }
    }

    toast.success(editando ? "Certificado atualizado!" : "Certificado adicionado!");
    setOpen(false);
    setEditando(null);
    resetForm();
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await excluirCertificado.mutateAsync(excluindo.id);
      toast.success("Certificado excluído!");
    } catch {
      // erro já reportado
    } finally {
      setExcluindo(null);
    }
  };

  const agendarRenovacao = async (id: string) => {
    try {
      await agendarRenovacaoMutation.mutateAsync(id);
    } catch {
      return;
    }

    toast.success("Renovação agendada!");
  };


  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string; icon: typeof CheckCircle }> = {
      ativo: { class: "status-success", label: "Ativo", icon: CheckCircle },
      proximo_vencer: { class: "status-warning", label: "Próximo", icon: Clock },
      vencido: { class: "status-danger", label: "Vencido", icon: AlertTriangle },
      renovacao_agendada: { class: "bg-sidebar-primary/10 text-sidebar-primary", label: "Renovação Agendada", icon: CalendarCheck },
    };
    const { class: className, label, icon: Icon } = config[status] || config.ativo;

    return (
      <span className={cn("status-badge inline-flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Certificados Digitais</h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie certificados digitais e agendamentos de renovação
            </p>
          </div>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditando(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="w-full bg-primary text-primary-foreground sm:w-auto"
                onClick={() => setEditando(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Certificado Digital
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editando ? "Editar Certificado Digital" : "Adicionar Certificado Digital"}
                </DialogTitle>
              </DialogHeader>
              <Formik
                enableReinitialize
                initialValues={formValues}
                validationSchema={certificadoSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <FormSelectWrapper name="empresa" label="Transportadora" required>
                        <Select
                          value={values.empresa}
                          onValueChange={(value) => {
                            setFieldValue("empresa", value);
                            setFieldValue("regime_tributario", regimePorEmpresa.get(value) || "");
                          }}
                        >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a transportadora" />
                        </SelectTrigger>
                        <SelectContent>
                          {transportadoras.map((transportadora) => (
                            <SelectItem key={transportadora.id} value={transportadora.razao_social}>
                              {transportadora.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormSelectWrapper name="tipo" label="Tipo de Certificado Digital" required>
                        <Select value={values.tipo} onValueChange={(value) => setFieldValue("tipo", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CERTIFICADO.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                {tipo}
                              </SelectItem>
                            ))}
                            {values.tipo && !TIPOS_CERTIFICADO.includes(values.tipo as "A1" | "A3") && (
                              <SelectItem value={values.tipo}>{values.tipo} (legado)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                      <div className="space-y-2">
                        <Label>CNPJ</Label>
                        <Input
                          value={cnpjPorEmpresa.get(values.empresa) || ""}
                          readOnly
                          placeholder="Selecione a transportadora"
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    <FormSelectWrapper name="regime_tributario" label="Regime Tributário">
                      <Select
                        value={values.regime_tributario}
                        onValueChange={(value) => setFieldValue("regime_tributario", value)}
                        disabled={!values.empresa}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={values.empresa ? "Selecione o regime" : "Selecione a transportadora"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIME_TRIBUTARIO_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField name="data_renovacao_agendada" label="Data de Renovação" type="date" />
                      <FormField name="vencimento" label="Data de Vencimento" type="date" required />
                    </div>
                    <FormField name="observacoes" label="Observações" as="textarea" />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Anexar Certificado Digital</label>
                      <FileUpload
                        currentUrl={values.arquivo_url || undefined}
                        onUpload={(url) => setFieldValue("arquivo_url", url)}
                        onRemove={() => setFieldValue("arquivo_url", "")}
                        folder="certificados"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        label="Anexar Certificado Digital"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting || transportadoras.length === 0}>
                      {isSubmitting ? "Salvando..." : "Salvar"}
                    </Button>
                  </Form>
                )}
              </Formik>
            </DialogContent>
          </Dialog>
        </div>

        {!loading && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar por nome ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={ordenacao} onValueChange={(value) => setOrdenacao(value as Ordenacao)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {ORDENACAO_OPCOES.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : certificadosFiltrados.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {termoBusca ? "Nenhum certificado encontrado para a pesquisa" : "Nenhum certificado cadastrado"}
            </p>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {certificadosFiltrados.map((cert) => (
              <div key={cert.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{cert.empresa}</p>
                    <span className="status-badge mt-1 inline-block bg-primary/10 text-xs text-primary">{cert.tipo}</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cnpjPorEmpresa.get(cert.empresa) || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Regime Tributário: {regimePorEmpresa.get(cert.empresa) || "—"}
                    </p>
                  </div>
                  {getStatusBadge(cert.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Renovação</p>
                    <p className="text-foreground">
                      {formatDateOnly(cert.data_renovacao_agendada)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Vencimento</p>
                    {isVencido(cert.vencimento) ? (
                      <p className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                        {formatDateOnly(cert.vencimento)}
                      </p>
                    ) : (
                      <p className="text-foreground">{formatDateOnly(cert.vencimento)}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  {cert.status !== "renovacao_agendada" && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => agendarRenovacao(cert.id)}>
                      <CalendarCheck className="h-3 w-3" /> Agendar
                    </Button>
                  )}
                  {podeEditar(cert) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setEditando(cert);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setExcluindo(cert)}>
                      <Trash2 className="h-3 w-3 text-destructive" /> Excluir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="table-header">
                  <th className="px-6 py-4 text-left">Transportadora</th>
                  <th className="px-6 py-4 text-left">Tipo</th>
                  <th className="px-6 py-4 text-left">CNPJ</th>
                  <th className="px-6 py-4 text-left">Regime Tributário</th>
                  <th className="px-6 py-4 text-left">Data de Renovação</th>
                  <th className="px-6 py-4 text-left">Data de Vencimento</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {certificadosFiltrados.map((cert) => (
                  <tr key={cert.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{cert.empresa}</td>
                    <td className="px-6 py-4">
                      <span className="status-badge bg-primary/10 text-primary">{cert.tipo}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {cnpjPorEmpresa.get(cert.empresa) || "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {regimePorEmpresa.get(cert.empresa) || "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDateOnly(cert.data_renovacao_agendada)}
                    </td>
                    <td className="px-6 py-4">
                      {isVencido(cert.vencimento) ? (
                        <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                          {formatDateOnly(cert.vencimento)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{formatDateOnly(cert.vencimento)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(cert.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {cert.status !== "renovacao_agendada" && (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => agendarRenovacao(cert.id)}>
                            <CalendarCheck className="h-3 w-3" /> Agendar
                          </Button>
                        )}
                        {podeEditar(cert) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => {
                              setEditando(cert);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => setExcluindo(cert)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir certificado?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O certificado{" "}
                {excluindo ? `${excluindo.tipo} — ${excluindo.empresa}` : ""} será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
