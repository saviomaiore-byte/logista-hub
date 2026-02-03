import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Certificado {
  id: string;
  empresa: string;
  tipo: string;
  vencimento: string;
  data_renovacao_agendada: string | null;
  status: string;
  observacoes: string | null;
}

export default function Certificados() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    empresa: "",
    tipo: "",
    vencimento: "",
    observacoes: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("certificados").insert({
      empresa: formData.empresa,
      tipo: formData.tipo,
      vencimento: formData.vencimento,
      observacoes: formData.observacoes || null,
      status: "ativo",
    });

    if (error) {
      toast.error("Erro ao salvar certificado");
    } else {
      toast.success("Certificado adicionado!");
      setOpen(false);
      setFormData({ empresa: "", tipo: "", vencimento: "", observacoes: "" });
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
        <div className="flex items-center justify-between mb-8">
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Certificado</Label>
                  <Input
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    placeholder="e-CNPJ, e-CPF, NF-e, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.vencimento}
                    onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Salvar
                </Button>
              </form>
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
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
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
