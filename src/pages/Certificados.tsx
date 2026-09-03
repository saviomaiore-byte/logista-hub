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
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarCheck,
  Pencil,
  Trash2,
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
import { cn } from "@/lib/utils";
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
} from "@/hooks/useCertificados";


const initialValues = {
  empresa: "",
  tipo: "",
  vencimento: "",
  data_renovacao_agendada: "",
  observacoes: "",
  arquivo_url: "",
};

export default function Certificados() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: certificados = [], isLoading: loadingCertificados } = useCertificados();
  const { data: transportadoras = [], isLoading: loadingTransportadoras } = useTransportadorasResumo();
  const criarCertificado = useCriarCertificado();
  const agendarRenovacaoMutation = useAgendarRenovacao();

  const loading = loadingCertificados || loadingTransportadoras;

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    try {
      await criarCertificado.mutateAsync(values);
    } catch {
      return;
    }

    toast.success("Certificado adicionado!");
    setOpen(false);
    resetForm();
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary text-primary-foreground sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo Certificado Digital
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Certificado Digital</DialogTitle>
              </DialogHeader>
              <Formik
                initialValues={initialValues}
                validationSchema={certificadoSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <FormSelectWrapper name="empresa" label="Transportadora" required>
                      <Select value={values.empresa} onValueChange={(value) => setFieldValue("empresa", value)}>
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
                    <FormField
                      name="tipo"
                      label="Tipo de Certificado Digital"
                      placeholder="e-CNPJ, e-CPF, NF-e, etc."
                      required
                    />
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

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : certificados.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum certificado cadastrado</p>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {certificados.map((cert) => (
              <div key={cert.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{cert.empresa}</p>
                    <span className="status-badge mt-1 inline-block bg-primary/10 text-xs text-primary">{cert.tipo}</span>
                  </div>
                  {getStatusBadge(cert.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Renovação</p>
                    <p className="text-foreground">
                      {cert.data_renovacao_agendada
                        ? new Date(cert.data_renovacao_agendada).toLocaleDateString("pt-BR")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Vencimento</p>
                    <p className="text-foreground">{new Date(cert.vencimento).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                {cert.status !== "renovacao_agendada" && (
                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => agendarRenovacao(cert.id)}>
                    <CalendarCheck className="h-3 w-3" /> Agendar Renovação
                  </Button>
                )}
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
                  <th className="px-6 py-4 text-left">Data de Renovação</th>
                  <th className="px-6 py-4 text-left">Data de Vencimento</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {certificados.map((cert) => (
                  <tr key={cert.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium">{cert.empresa}</td>
                    <td className="px-6 py-4">
                      <span className="status-badge bg-primary/10 text-primary">{cert.tipo}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {cert.data_renovacao_agendada
                        ? new Date(cert.data_renovacao_agendada).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(cert.vencimento).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(cert.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {cert.status !== "renovacao_agendada" && (
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => agendarRenovacao(cert.id)}>
                          <CalendarCheck className="h-3 w-3" /> Agendar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
