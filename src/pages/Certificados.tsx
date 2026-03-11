import { useState, useEffect } from "react";
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
  Calendar, 
  Plus, 
  CheckCircle,
  Clock,
  AlertTriangle,
  CalendarCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { certificadoSchema } from "@/lib/validationSchemas";
import { FormField } from "@/components/form/FormField";

interface Certificado {
  id: string;
  empresa: string;
  tipo: string;
  vencimento: string;
  data_renovacao_agendada: string | null;
  status: string;
  observacoes: string | null;
}

const initialValues = {
  empresa: "",
  tipo: "",
  vencimento: "",
  observacoes: "",
};

export default function Certificados() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchCertificados = async () => {
    const { data, error } = await supabase
      .from("certificados")
      .select("*")
      .order("vencimento", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar certificados");
    } else {
      setCertificados(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCertificados();
  }, []);

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    const { error } = await supabase.from("certificados").insert({
      empresa: values.empresa,
      tipo: values.tipo,
      vencimento: values.vencimento,
      observacoes: values.observacoes || null,
      status: "ativo",
    });

    if (error) {
      toast.error("Erro ao salvar certificado");
    } else {
      toast.success("Certificado adicionado!");
      setOpen(false);
      resetForm();
      fetchCertificados();
    }
  };

  const agendarRenovacao = async (id: string) => {
    const dataRenovacao = new Date();
    dataRenovacao.setDate(dataRenovacao.getDate() + 7);
    
    const { error } = await supabase
      .from("certificados")
      .update({ 
        status: "renovacao_agendada",
        data_renovacao_agendada: dataRenovacao.toISOString().split("T")[0]
      })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao agendar renovação");
    } else {
      toast.success("Renovação agendada!");
      fetchCertificados();
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Certificados</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie certificados e agendamentos de renovação
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Certificado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Certificado</DialogTitle>
              </DialogHeader>
              <Formik
                initialValues={initialValues}
                validationSchema={certificadoSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting }) => (
                  <Form className="space-y-4">
                    <FormField name="empresa" label="Empresa" required />
                    <FormField 
                      name="tipo" 
                      label="Tipo de Certificado" 
                      placeholder="e-CNPJ, e-CPF, NF-e, etc." 
                      required 
                    />
                    <FormField name="vencimento" label="Vencimento" type="date" required />
                    <FormField name="observacoes" label="Observações" as="textarea" />
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
        ) : certificados.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum certificado cadastrado</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-6 py-4">Empresa</th>
                  <th className="text-left px-6 py-4">Tipo</th>
                  <th className="text-left px-6 py-4">Vencimento</th>
                  <th className="text-left px-6 py-4">Renovação</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {certificados.map((cert) => (
                  <tr key={cert.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{cert.empresa}</td>
                    <td className="px-6 py-4">
                      <span className="status-badge bg-primary/10 text-primary">{cert.tipo}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(cert.vencimento).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {cert.data_renovacao_agendada 
                        ? new Date(cert.data_renovacao_agendada).toLocaleDateString("pt-BR") 
                        : "-"}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(cert.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {cert.status !== "renovacao_agendada" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => agendarRenovacao(cert.id)}
                        >
                          <CalendarCheck className="h-3 w-3" />
                          Agendar
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
