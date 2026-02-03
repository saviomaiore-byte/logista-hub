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
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  Calculator, 
  Plus, 
  CheckCircle,
  Clock,
  Send,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PinsCofins {
  id: string;
  empresa: string;
  competencia: string;
  valor_pis: number;
  valor_cofins: number;
  data_lancamento: string;
  status: string;
  observacoes: string | null;
}

export default function PinsConfins() {
  const [lancamentos, setLancamentos] = useState<PinsCofins[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    empresa: "",
    competencia: "",
    valor_pis: "",
    valor_cofins: "",
    observacoes: "",
  });

  const fetchLancamentos = async () => {
    const { data, error } = await supabase
      .from("pins_confins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar lançamentos");
    } else {
      setLancamentos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLancamentos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("pins_confins").insert({
      empresa: formData.empresa,
      competencia: formData.competencia,
      valor_pis: parseFloat(formData.valor_pis) || 0,
      valor_cofins: parseFloat(formData.valor_cofins) || 0,
      observacoes: formData.observacoes || null,
      status: "lancado",
    });

    if (error) {
      toast.error("Erro ao salvar lançamento");
    } else {
      toast.success("Lançamento adicionado!");
      setOpen(false);
      setFormData({ empresa: "", competencia: "", valor_pis: "", valor_cofins: "", observacoes: "" });
      fetchLancamentos();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("pins_confins")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado!");
      fetchLancamentos();
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string; icon: typeof CheckCircle }> = {
      lancado: { class: "status-warning", label: "Lançado", icon: Clock },
      conferido: { class: "bg-sidebar-primary/10 text-sidebar-primary", label: "Conferido", icon: CheckCircle },
      enviado: { class: "status-success", label: "Enviado", icon: Send },
    };
    const { class: className, label, icon: Icon } = config[status] || config.lancado;
    return (
      <span className={cn("status-badge inline-flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const totalPis = lancamentos.reduce((acc, l) => acc + (l.valor_pis || 0), 0);
  const totalCofins = lancamentos.reduce((acc, l) => acc + (l.valor_cofins || 0), 0);
  const totalGeral = totalPis + totalCofins;

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">PINS CONFINS</h1>
            <p className="text-muted-foreground mt-1">
              Lançamento de PIS e COFINS na planilha
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Lançamento</DialogTitle>
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
                  <Label>Competência</Label>
                  <Input
                    value={formData.competencia}
                    onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                    placeholder="01/2024"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor PIS</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_pis}
                      onChange={(e) => setFormData({ ...formData, valor_pis: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor COFINS</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_cofins}
                      onChange={(e) => setFormData({ ...formData, valor_cofins: e.target.value })}
                      placeholder="0,00"
                    />
                  </div>
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

        {/* Resumo */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <StatCard
            title="Total PIS"
            value={`R$ ${totalPis.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            variant="default"
          />
          <StatCard
            title="Total COFINS"
            value={`R$ ${totalCofins.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            variant="default"
          />
          <StatCard
            title="Total Geral"
            value={`R$ ${totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : lancamentos.length === 0 ? (
          <div className="text-center py-12">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum lançamento cadastrado</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-6 py-4">Empresa</th>
                  <th className="text-left px-6 py-4">Competência</th>
                  <th className="text-left px-6 py-4">PIS</th>
                  <th className="text-left px-6 py-4">COFINS</th>
                  <th className="text-left px-6 py-4">Total</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lancamentos.map((lanc) => (
                  <tr key={lanc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{lanc.empresa}</td>
                    <td className="px-6 py-4">{lanc.competencia}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      R$ {(lanc.valor_pis || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      R$ {(lanc.valor_cofins || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      R$ {((lanc.valor_pis || 0) + (lanc.valor_cofins || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(lanc.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {lanc.status === "lancado" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(lanc.id, "conferido")}
                          >
                            Conferir
                          </Button>
                        )}
                        {lanc.status === "conferido" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => updateStatus(lanc.id, "enviado")}
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
          </div>
        )}
      </div>
    </MainLayout>
  );
}
