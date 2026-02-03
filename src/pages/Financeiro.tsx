import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { 
  CreditCard, 
  Send, 
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  DollarSign,
  TrendingUp,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Boleto {
  id: string;
  empresa: string;
  valor: string;
  vencimento: string;
  status: "pago" | "pendente" | "vencido" | "enviado";
  referencia: string;
}

const mockBoletos: Boleto[] = [
  { id: "1", empresa: "Transportadora ABC Ltda", valor: "R$ 3.500,00", vencimento: "20/02/2024", status: "pendente", referencia: "Jan/2024" },
  { id: "2", empresa: "Logística XYZ S/A", valor: "R$ 5.200,00", vencimento: "15/02/2024", status: "pago", referencia: "Jan/2024" },
  { id: "3", empresa: "Express Cargas ME", valor: "R$ 2.100,00", vencimento: "10/02/2024", status: "vencido", referencia: "Jan/2024" },
  { id: "4", empresa: "Rápido Transportes", valor: "R$ 4.800,00", vencimento: "25/02/2024", status: "enviado", referencia: "Jan/2024" },
  { id: "5", empresa: "Sul Logística", valor: "R$ 1.900,00", vencimento: "18/02/2024", status: "pago", referencia: "Jan/2024" },
];

export default function Financeiro() {
  const getStatusBadge = (status: Boleto["status"]) => {
    const config = {
      pago: { class: "status-success", label: "Pago", icon: CheckCircle },
      pendente: { class: "status-warning", label: "Pendente", icon: Clock },
      vencido: { class: "status-danger", label: "Vencido", icon: AlertCircle },
      enviado: { class: "bg-sidebar-primary/10 text-sidebar-primary", label: "Enviado", icon: Send },
    };
    const { class: className, label, icon: Icon } = config[status];
    return (
      <span className={cn("status-badge inline-flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const BoletoTable = ({ boletos }: { boletos: Boleto[] }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
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
              </td>
              <td className="px-6 py-4 text-muted-foreground">{boleto.referencia}</td>
              <td className="px-6 py-4 font-semibold text-foreground">{boleto.valor}</td>
              <td className="px-6 py-4 text-muted-foreground">{boleto.vencimento}</td>
              <td className="px-6 py-4">{getStatusBadge(boleto.status)}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {boleto.status === "vencido" && (
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-destructive border-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Cobrar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    <Send className="h-3 w-3" />
                    {boleto.status === "pendente" ? "Enviar" : "Reenviar"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie boletos, cobranças e faturamento
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Enviar Faturamento
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Boleto
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <StatCard
            title="Total Recebido"
            value="R$ 127.500"
            subtitle="Este mês"
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="A Receber"
            value="R$ 45.670"
            subtitle="23 boletos pendentes"
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Vencidos"
            value="R$ 12.300"
            subtitle="5 boletos"
            icon={AlertCircle}
            variant="danger"
          />
          <StatCard
            title="Taxa de Pagamento"
            value="94%"
            subtitle="Últimos 30 dias"
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="todos" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="todos" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="vencidos">Vencidos</TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
          </TabsList>

          <TabsContent value="todos">
            <BoletoTable boletos={mockBoletos} />
          </TabsContent>
          <TabsContent value="pendentes">
            <BoletoTable boletos={mockBoletos.filter(b => b.status === "pendente" || b.status === "enviado")} />
          </TabsContent>
          <TabsContent value="vencidos">
            <BoletoTable boletos={mockBoletos.filter(b => b.status === "vencido")} />
          </TabsContent>
          <TabsContent value="pagos">
            <BoletoTable boletos={mockBoletos.filter(b => b.status === "pago")} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
