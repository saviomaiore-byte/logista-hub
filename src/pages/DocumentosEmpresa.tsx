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
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { documentoEmpresaSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";
import { useDocumentosEmpresa, useCriarDocumentoEmpresa } from "@/hooks/useDocumentosEmpresa";


const tiposDocumento = [
  { value: "contrato_social", label: "Contrato Social" },
  { value: "cnd_federal", label: "CND Federal" },
  { value: "cnd_estadual", label: "CND Estadual" },
  { value: "cnd_municipal", label: "CND Municipal" },
  { value: "fgts", label: "FGTS" },
  { value: "outros", label: "Outros" },
];

const initialValues = {
  empresa: "",
  tipo: "",
  descricao: "",
  vencimento: "",
};

export default function DocumentosEmpresa() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: documentos = [], isLoading: loading } = useDocumentosEmpresa();
  const criarDocumento = useCriarDocumentoEmpresa();

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    try {
      await criarDocumento.mutateAsync(values);
    } catch {
      return;
    }

    toast.success("Documento adicionado!");
    setOpen(false);
    resetForm();
  };


  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; icon: typeof CheckCircle }> = {
      valido: { class: "status-success", icon: CheckCircle },
      proximo_vencer: { class: "status-warning", icon: Clock },
      vencido: { class: "status-danger", icon: AlertTriangle },
    };
    const { class: className, icon: Icon } = config[status] || config.valido;
    return (
      <span className={cn("status-badge inline-flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {status === "valido" ? "Válido" : status === "proximo_vencer" ? "Próximo" : "Vencido"}
      </span>
    );
  };

  const getTipoLabel = (tipo: string) => {
    return tiposDocumento.find(t => t.value === tipo)?.label || tipo;
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentos de Empresa</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie contratos sociais, CNDs e outros documentos
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Documento</DialogTitle>
              </DialogHeader>
              <Formik
                initialValues={initialValues}
                validationSchema={documentoEmpresaSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <FormField name="empresa" label="Empresa" required />
                    <FormSelectWrapper name="tipo" label="Tipo" required>
                      <Select
                        value={values.tipo}
                        onValueChange={(value) => setFieldValue("tipo", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposDocumento.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>
                    <FormField name="descricao" label="Descrição" />
                    <FormField name="vencimento" label="Vencimento" type="date" />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Salvar"}
                    </Button>
                  </Form>
                )}
              </Formik>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum documento cadastrado</p>
          </div>
        ) : (
          isMobile ? (
            <div className="space-y-3">
              {documentos.map((doc) => (
                <div key={doc.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{doc.empresa}</p>
                      <span className="status-badge bg-primary/10 text-primary text-xs mt-1 inline-block">
                        {getTipoLabel(doc.tipo)}
                      </span>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                  {doc.descricao && <p className="text-sm text-muted-foreground">{doc.descricao}</p>}
                  <div className="text-sm text-muted-foreground">
                    Vencimento: {doc.vencimento ? new Date(doc.vencimento).toLocaleDateString("pt-BR") : "-"}
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-1">
                    <Send className="h-3 w-3" /> Enviar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-6 py-4">Empresa</th>
                  <th className="text-left px-6 py-4">Tipo</th>
                  <th className="text-left px-6 py-4">Descrição</th>
                  <th className="text-left px-6 py-4">Vencimento</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{doc.empresa}</td>
                    <td className="px-6 py-4">
                      <span className="status-badge bg-primary/10 text-primary">
                        {getTipoLabel(doc.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{doc.descricao || "-"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {doc.vencimento ? new Date(doc.vencimento).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Send className="h-3 w-3" />
                        Enviar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )
        )}
      </div>
    </MainLayout>
  );
}
