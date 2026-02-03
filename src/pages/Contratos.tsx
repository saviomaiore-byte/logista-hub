import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText, 
  Send, 
  Download, 
  Clock, 
  CheckCircle,
  XCircle,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contrato {
  id: string;
  tipo: string;
  empresa: string;
  cnpj: string | null;
  data_envio: string | null;
  data_assinatura: string | null;
  status: string;
  observacoes: string | null;
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "",
    empresa: "",
    cnpj: "",
    observacoes: "",
  });

  const fetchContratos = async () => {
    const { data, error } = await supabase
      .from("contratos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar contratos");
    } else {
      setContratos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContratos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("contratos").insert({
      tipo: formData.tipo,
      empresa: formData.empresa,
      cnpj: formData.cnpj || null,
      observacoes: formData.observacoes || null,
      status: "pendente",
    });

    if (error) {
      toast.error("Erro ao salvar contrato");
    } else {
      toast.success("Contrato adicionado!");
      setOpen(false);
      setFormData({ tipo: "", empresa: "", cnpj: "", observacoes: "" });
      fetchContratos();
    }
  };

  const enviarContrato = async (id: string) => {
    const { error } = await supabase
      .from("contratos")
      .update({ status: "enviado", data_envio: new Date().toISOString().split("T")[0] })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao enviar contrato");
    } else {
      toast.success("Contrato enviado!");
      fetchContratos();
    }
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
    return (
      <span className="status-badge bg-primary/10 text-primary">
        {labels[tipo] || tipo}
      </span>
    );
  };

  const ContratoTable = ({ contratos }: { contratos: Contrato[] }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {contratos.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum contrato encontrado</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left px-6 py-4">Tipo</th>
              <th className="text-left px-6 py-4">Empresa</th>
              <th className="text-left px-6 py-4">CNPJ</th>
              <th className="text-left px-6 py-4">Data Envio</th>
              <th className="text-left px-6 py-4">Status</th>
              <th className="text-right px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contratos.map((contrato) => (
              <tr key={contrato.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">{getTipoBadge(contrato.tipo)}</td>
                <td className="px-6 py-4">
                  <p className="font-medium text-foreground">{contrato.empresa}</p>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{contrato.cnpj || "-"}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {contrato.data_envio ? new Date(contrato.data_envio).toLocaleDateString("pt-BR") : "-"}
                </td>
                <td className="px-6 py-4">{getStatusBadge(contrato.status)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <Download className="h-3 w-3" />
                      Baixar
                    </Button>
                    {contrato.status === "pendente" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => enviarContrato(contrato.id)}
                      >
                        <Send className="h-3 w-3" />
                        Enviar
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

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie contratos, distratos e termos de adesão
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Contrato</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contrato">Contrato</SelectItem>
                      <SelectItem value="distrato">Distrato</SelectItem>
                      <SelectItem value="adesao">Termo de Adesão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Input
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!formData.tipo || !formData.empresa}>
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs defaultValue="todos" className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="todos" className="gap-2">
                <FileText className="h-4 w-4" />
                Todos ({contratos.length})
              </TabsTrigger>
              <TabsTrigger value="contratos">
                Contratos ({contratos.filter(c => c.tipo === "contrato").length})
              </TabsTrigger>
              <TabsTrigger value="distratos">
                Distratos ({contratos.filter(c => c.tipo === "distrato").length})
              </TabsTrigger>
              <TabsTrigger value="adesao">
                Adesão ({contratos.filter(c => c.tipo === "adesao").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todos">
              <ContratoTable contratos={contratos} />
            </TabsContent>
            <TabsContent value="contratos">
              <ContratoTable contratos={contratos.filter(c => c.tipo === "contrato")} />
            </TabsContent>
            <TabsContent value="distratos">
              <ContratoTable contratos={contratos.filter(c => c.tipo === "distrato")} />
            </TabsContent>
            <TabsContent value="adesao">
              <ContratoTable contratos={contratos.filter(c => c.tipo === "adesao")} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
