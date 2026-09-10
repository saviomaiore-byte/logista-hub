import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Send,
  Download,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { contratoSchema } from "@/lib/validationSchemas";
import { usePermissoes } from "@/hooks/usePermissoes";
import { openSignedFile } from "@/lib/storage";
import { FormSelectWrapper } from "@/components/form/FormField";
import {
  useContratos,
  useTransportadoresOpcoes,
  useCriarContrato,
  useAtualizarContrato,
  useExcluirContrato,
  useEnviarContrato,
  type ContratoComVinculos as Contrato,
} from "@/hooks/useContratos";


const initialValues = {

  tipo: "",
  modelo: "",
  transportador_id: "",
  observacoes: "",
  arquivo_url: "",
};

const tipoOptions = [
  { value: "todos", label: "Todos os tipos" },
  { value: "contrato", label: "Contrato" },
  { value: "distrato", label: "Distrato" },
  { value: "adesao", label: "Termo de Adesão" },
];

const modeloOptions = [
  { value: "todos", label: "Todos os modelos" },
  { value: "Maiore", label: "Maiore" },
  { value: "Start", label: "Start" },
  { value: "Comodato", label: "Comodato" },
];

export default function Contratos() {
  const { isAdmin, podeEditar } = usePermissoes();
  const [open, setOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [formInitialValues, setFormInitialValues] = useState(initialValues);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroModelo, setFiltroModelo] = useState("todos");

  const { data: contratos = [], isLoading: loadingContratos } = useContratos();
  const { data: transportadores = [], isLoading: loadingTransportadores } =
    useTransportadoresOpcoes();

  const criarContrato = useCriarContrato();
  const atualizarContrato = useAtualizarContrato();
  const excluirContrato = useExcluirContrato();
  const enviarContratoMutation = useEnviarContrato();

  const loading = loadingContratos || loadingTransportadores;


  const resetForm = () => {
    setFormInitialValues(initialValues);
    setEditingContrato(null);
  };

  const handleEdit = (contrato: Contrato) => {
    setEditingContrato(contrato);
    setFormInitialValues({
      tipo: contrato.tipo,
      modelo: contrato.modelo || "",
      transportador_id: contrato.transportador_id || "",
      observacoes: contrato.observacoes || "",
      arquivo_url: contrato.arquivo_url || "",
    });
    setOpen(true);
  };

  const handleSubmit = async (values: typeof initialValues, { resetForm: formikReset }: any) => {
    const transportadorSelecionado = transportadores.find(
      (transportador) => transportador.id === values.transportador_id,
    );

    if (!transportadorSelecionado) {
      toast.error("Selecione um transportador");
      return;
    }

    const payload = {
      tipo: values.tipo,
      modelo: values.modelo,
      empresa: transportadorSelecionado.razao_social,
      cnpj: transportadorSelecionado.cpf_cnpj || null,
      transportador_id: values.transportador_id,
      motorista_id: null,
      observacoes: values.observacoes || null,
      arquivo_url: values.arquivo_url || null,
    };

    if (editingContrato) {
      try {
        await atualizarContrato.mutateAsync({ id: editingContrato.id, payload });
      } catch {
        return;
      }

      toast.success("Contrato atualizado!");
      setOpen(false);
      resetForm();
      formikReset();
      return;
    }

    try {
      await criarContrato.mutateAsync(payload);
    } catch {
      return;
    }

    toast.success("Contrato adicionado!");
    setOpen(false);
    resetForm();
    formikReset();
  };

  const handleDelete = async (id: string) => {
    try {
      await excluirContrato.mutateAsync(id);
    } catch {
      return;
    }

    toast.success("Contrato excluído!");
  };

  const enviarContrato = async (id: string) => {
    try {
      await enviarContratoMutation.mutateAsync(id);
    } catch {
      return;
    }

    toast.success("Contrato enviado!");
  };


  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string; icon: typeof CheckCircle }> = {
      enviado: { class: "status-warning", label: "Enviado", icon: Clock },
      assinado: { class: "status-success", label: "Assinado", icon: CheckCircle },
      pendente: { class: "bg-muted text-muted-foreground", label: "Pendente", icon: Clock },
      recusado: { class: "status-danger", label: "Recusado", icon: XCircle },
    };

    const { class: className, label, icon: Icon } = config[status] || config.pendente;

    return (
      <span className={cn("status-badge inline-flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const labels: Record<string, string> = {
      contrato: "Contrato",
      distrato: "Distrato",
      adesao: "Termo de Adesão",
    };

    return <span className="status-badge bg-primary/10 text-primary">{labels[tipo] || tipo}</span>;
  };

  const getModeloBadge = (modelo: string | null) => {
    if (!modelo) return <span className="text-sm text-muted-foreground">-</span>;

    return <span className="status-badge bg-secondary text-secondary-foreground">{modelo}</span>;
  };

  const contratosFiltrados = contratos.filter((contrato) => {
    const tipoOk = filtroTipo === "todos" || contrato.tipo === filtroTipo;
    const modeloOk = filtroModelo === "todos" || contrato.modelo === filtroModelo;
    return tipoOk && modeloOk;
  });

  const isMobile = useIsMobile();

  const ContratoCards = ({ contratos }: { contratos: Contrato[] }) => (
    <div className="space-y-3">
      {contratos.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum contrato encontrado</p>
        </div>
      ) : (
        contratos.map((contrato) => (
          <div key={contrato.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{contrato.empresa}</p>
                {contrato.cnpj && <p className="text-sm text-muted-foreground">{contrato.cnpj}</p>}
              </div>
              <div className="flex items-center gap-2">{getStatusBadge(contrato.status)}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {getTipoBadge(contrato.tipo)}
              {getModeloBadge(contrato.modelo)}
              {contrato.motoristas?.nome && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {contrato.motoristas.nome}
                </span>
              )}
              {contrato.transportadores?.razao_social && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {contrato.transportadores.razao_social}
                </span>
              )}
              {contrato.data_envio && (
                <span className="text-xs text-muted-foreground">
                  Enviado: {new Date(contrato.data_envio).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 border-t border-border pt-1">
              {contrato.arquivo_url && (
                <Button variant="ghost" size="sm" onClick={() => openSignedFile(contrato.arquivo_url!)}>
                  <Download className="mr-1 h-4 w-4" /> Baixar
                </Button>
              )}
              {podeEditar(contrato) && (
                <Button variant="ghost" size="sm" onClick={() => handleEdit(contrato)}>
                  <Pencil className="mr-1 h-4 w-4" /> Editar
                </Button>
              )}
              {contrato.status === "pendente" && (
                <Button variant="ghost" size="sm" onClick={() => enviarContrato(contrato.id)}>
                  <Send className="mr-1 h-4 w-4" /> Enviar
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(contrato.id)}>
                  <Trash2 className="mr-1 h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const ContratoTable = ({ contratos }: { contratos: Contrato[] }) => (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      {contratos.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum contrato encontrado</p>
        </div>
      ) : (
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-4 text-left">Tipo</th>
              <th className="px-6 py-4 text-left">Modelo</th>
              <th className="px-6 py-4 text-left">Empresa</th>
              <th className="px-6 py-4 text-left">Vinculado a</th>
              <th className="px-6 py-4 text-left">CNPJ</th>
              <th className="px-6 py-4 text-left">Data Envio</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contratos.map((contrato) => (
              <tr key={contrato.id} className="transition-colors hover:bg-muted/30">
                <td className="px-6 py-4">{getTipoBadge(contrato.tipo)}</td>
                <td className="px-6 py-4">{getModeloBadge(contrato.modelo)}</td>
                <td className="px-6 py-4">
                  <p className="font-medium text-foreground">{contrato.empresa}</p>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {contrato.motoristas?.nome && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {contrato.motoristas.nome}
                    </span>
                  )}
                  {contrato.transportadores?.razao_social && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {contrato.transportadores.razao_social}
                    </span>
                  )}
                  {!contrato.motoristas?.nome && !contrato.transportadores?.razao_social && "-"}
                </td>
                <td className="px-6 py-4 text-muted-foreground">{contrato.cnpj || "-"}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {contrato.data_envio ? new Date(contrato.data_envio).toLocaleDateString("pt-BR") : "-"}
                </td>
                <td className="px-6 py-4">{getStatusBadge(contrato.status)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {contrato.arquivo_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openSignedFile(contrato.arquivo_url!)}
                        title="Baixar Arquivo"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {podeEditar(contrato) && (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(contrato)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {contrato.status === "pendente" && (
                      <Button variant="ghost" size="icon" onClick={() => enviarContrato(contrato.id)} title="Enviar">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(contrato.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const ContratoList = isMobile ? ContratoCards : ContratoTable;

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
            <p className="mt-1 text-muted-foreground">Gerencie contratos, distratos e termos de adesão</p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingContrato ? "Editar Contrato" : "Adicionar Contrato"}</DialogTitle>
              </DialogHeader>

              <Formik
                initialValues={formInitialValues}
                validationSchema={contratoSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <FormSelectWrapper name="tipo" label="Tipo" required>
                      <Select value={values.tipo} onValueChange={(value) => setFieldValue("tipo", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contrato">Contrato</SelectItem>
                          <SelectItem value="distrato">Distrato</SelectItem>
                          <SelectItem value="adesao">Termo de Adesão</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>

                    <FormSelectWrapper name="modelo" label="Modelo" required>
                      <Select value={values.modelo} onValueChange={(value) => setFieldValue("modelo", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Maiore">Maiore</SelectItem>
                          <SelectItem value="Start">Start</SelectItem>
                          <SelectItem value="Comodato">Comodato</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>

                    <FormSelectWrapper name="transportador_id" label="Transportador" required>
                      <Select value={values.transportador_id} onValueChange={(value) => setFieldValue("transportador_id", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o transportador" />
                        </SelectTrigger>
                        <SelectContent>
                          {transportadores.map((transportador) => (
                            <SelectItem key={transportador.id} value={transportador.id}>
                              {transportador.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        value={values.observacoes}
                        onChange={(event) => setFieldValue("observacoes", event.target.value)}
                        placeholder="Observações"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Anexar Documento (PDF)</label>
                      <FileUpload
                        currentUrl={values.arquivo_url || undefined}
                        onUpload={(url) => setFieldValue("arquivo_url", url)}
                        onRemove={() => setFieldValue("arquivo_url", "")}
                        folder="contratos"
                        accept=".pdf,.doc,.docx"
                        label="Anexar Contrato"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting || !values.tipo || !values.modelo || !values.transportador_id}
                    >
                      {isSubmitting ? "Salvando..." : editingContrato ? "Salvar" : "Cadastrar"}
                    </Button>
                  </Form>
                )}
              </Formik>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Filter className="h-4 w-4" />
              Filtrar por tipo
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Filtrar por modelo</div>
            <Select value={filtroModelo} onValueChange={setFiltroModelo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {modeloOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFiltroTipo("todos");
              setFiltroModelo("todos");
            }}
            disabled={filtroTipo === "todos" && filtroModelo === "todos"}
          >
            Limpar filtros
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <ContratoList contratos={contratosFiltrados} />
        )}
      </div>
    </MainLayout>
  );
}
