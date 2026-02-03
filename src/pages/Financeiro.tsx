import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  CreditCard, 
  Send, 
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Boleto {
  id: string;
  empresa: string;
  cnpj: string | null;
  valor: number;
  vencimento: string;
  referencia: string | null;
  status: string;
  data_pagamento: string | null;
}

export default function Financeiro() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    empresa: "",
    cnpj: "",
    valor: "",
    vencimento: "",
    referencia: "",
  });

  const fetchBoletos = async () => {
    const { data, error } = await supabase
      .from("boletos")
      .select("*")
      .order("vencimento", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar boletos");
    } else {
      setBoletos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBoletos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("boletos").insert({
      empresa: formData.empresa,
      cnpj: formData.cnpj || null,
      valor: parseFloat(formData.valor),
      vencimento: formData.vencimento,
      referencia: formData.referencia || null,
      status: "pendente",
    });

    if (error) {
      toast.error("Erro ao salvar boleto");
    } else {
      toast.success("Boleto adicionado!");
      setOpen(false);
      setFormData({ empresa: "", cnpj: "", valor: "", vencimento: "", referencia: "" });
      fetchBoletos();
    }
  };

  const enviarBoleto = async (id: string) => {
    const { error } = await supabase
      .from("boletos")
      .update({ status: "enviado" })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao enviar boleto");
    } else {
      toast.success("Boleto enviado!");
      fetchBoletos();
    }
  };

  const marcarPago = async (id: string) => {
    const { error } = await supabase
      .from("boletos")
      .update({ status: "pago", data_pagamento: new Date().toISOString().split("T")[0] })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar boleto");
    } else {
      toast.success("Boleto marcado como pago!");
      fetchBoletos();
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; label: string; icon: typeof CheckCircle }> = {
      pago: { class: "status-success", label: "Pago", icon: CheckCircle },
      pendente: { class: "bg-muted text-muted-foreground", label: "Pendente", icon: Clock },
      vencido: { class: "status-danger", label: "Vencido", icon: AlertCircle },
      enviado: { class: "status-warning", label: "Enviado", icon: Send },
    };
    const { class: className, label, icon: Icon } = config[status] || config.pendente;
    return (
      <span className={cn("status-badge inline-flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const totalRecebido = boletos.filter(b => b.status === "pago").reduce((acc, b) => acc + b.valor, 0);
  const totalPendente = boletos.filter(b => b.status !== "pago").reduce((acc, b) => acc + b.valor, 0);
  const totalVencido = boletos.filter(b => b.status === "vencido").reduce((acc, b) => acc + b.valor, 0);

  const BoletoTable = ({ boletos }: { boletos: Boleto[] }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {boletos.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum boleto encontrado</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left px-6 py-4">Empresa</th>
              <th className="text-left px-6 py-4">Referência</th>
              <th className="text-left px-6 py-4">Valor</th>
              <th className="text-left px-6 py-4">Vencimento</th>
              <th className="text-left px-6 py-4">Status</th>
              <th className="text-right px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {boletos.map((boleto) => (
              <tr key={boleto.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-foreground">{boleto.empresa}</p>
                  {boleto.cnpj && <p className="text-xs text-muted-foreground">{boleto.cnpj}</p>}
                </td>
                <td className="px-6 py-4 text-muted-foreground">{boleto.referencia || "-"}</td>
                <td className="px-6 py-4 font-semibold text-foreground">
                  R$ {boleto.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(boleto.vencimento).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-6 py-4">{getStatusBadge(boleto.status)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {boleto.status === "pendente" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => enviarBoleto(boleto.id)}
                      >
                        <Send className="h-3 w-3" />
                        Enviar
                      </Button>
                    )}
                    {(boleto.status === "enviado" || boleto.status === "vencido") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-success"
                        onClick={() => marcarPago(boleto.id)}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Pago
                      </Button>
                    )}
                    {boleto.status === "vencido" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-destructive border-destructive"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Cobrar
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
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie boletos, cobranças e faturamento
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Boleto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Boleto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento *</Label>
                    <Input
                      type="date"
                      value={formData.vencimento}
                      onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Referência</Label>
                  <Input
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    placeholder="Jan/2024"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <StatCard
            title="Total Recebido"
            value={`R$ ${totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            subtitle={`${boletos.filter(b => b.status === "pago").length} boletos`}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="A Receber"
            value={`R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            subtitle={`${boletos.filter(b => b.status !== "pago").length} boletos`}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Vencidos"
            value={`R$ ${totalVencido.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
            subtitle={`${boletos.filter(b => b.status === "vencido").length} boletos`}
            icon={AlertCircle}
            variant="danger"
          />
          <StatCard
            title="Total Boletos"
            value={boletos.length.toString()}
            subtitle="Cadastrados"
            icon={TrendingUp}
            variant="default"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs defaultValue="todos" className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="todos" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Todos ({boletos.length})
              </TabsTrigger>
              <TabsTrigger value="pendentes">
                Pendentes ({boletos.filter(b => b.status === "pendente" || b.status === "enviado").length})
              </TabsTrigger>
              <TabsTrigger value="vencidos">
                Vencidos ({boletos.filter(b => b.status === "vencido").length})
              </TabsTrigger>
              <TabsTrigger value="pagos">
                Pagos ({boletos.filter(b => b.status === "pago").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todos">
              <BoletoTable boletos={boletos} />
            </TabsContent>
            <TabsContent value="pendentes">
              <BoletoTable boletos={boletos.filter(b => b.status === "pendente" || b.status === "enviado")} />
            </TabsContent>
            <TabsContent value="vencidos">
              <BoletoTable boletos={boletos.filter(b => b.status === "vencido")} />
            </TabsContent>
            <TabsContent value="pagos">
              <BoletoTable boletos={boletos.filter(b => b.status === "pago")} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
