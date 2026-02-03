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
  Share2, 
  Plus, 
  CheckCircle,
  Clock,
  XCircle,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PronampeItem {
  id: string;
  empresa: string;
  cnpj: string | null;
  valor: number | null;
  status: string;
  data_compartilhamento: string | null;
  observacoes: string | null;
}

export default function Pronampe() {
  const [items, setItems] = useState<PronampeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    empresa: "",
    cnpj: "",
    valor: "",
    observacoes: "",
  });

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("pronampe")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar dados");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("pronampe").insert({
      empresa: formData.empresa,
      cnpj: formData.cnpj || null,
      valor: formData.valor ? parseFloat(formData.valor) : null,
      observacoes: formData.observacoes || null,
      status: "pendente",
    });

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Registro adicionado!");
      setOpen(false);
      setFormData({ empresa: "", cnpj: "", valor: "", observacoes: "" });
      fetchItems();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("pronampe")
      .update({ status, data_compartilhamento: status === "compartilhado" ? new Date().toISOString().split("T")[0] : null })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      toast.success("Status atualizado!");
      fetchItems();
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string; icon: typeof CheckCircle }> = {
      pendente: { class: "status-warning", label: "Pendente", icon: Clock },
      compartilhado: { class: "bg-sidebar-primary/10 text-sidebar-primary", label: "Compartilhado", icon: Share2 },
      aprovado: { class: "status-success", label: "Aprovado", icon: CheckCircle },
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

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compartilhamento Pronampe</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie compartilhamentos do Pronampe
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Compartilhamento</DialogTitle>
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
                  <Label>CNPJ</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0,00"
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
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum registro cadastrado</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-6 py-4">Empresa</th>
                  <th className="text-left px-6 py-4">CNPJ</th>
                  <th className="text-left px-6 py-4">Valor</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Data Comp.</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{item.empresa}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.cnpj || "-"}</td>
                    <td className="px-6 py-4 font-semibold">
                      {item.valor ? `R$ ${item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.data_compartilhamento ? new Date(item.data_compartilhamento).toLocaleDateString("pt-BR") : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.status === "pendente" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => updateStatus(item.id, "compartilhado")}
                        >
                          <Send className="h-3 w-3" />
                          Compartilhar
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
