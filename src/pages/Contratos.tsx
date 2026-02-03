import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Contrato {
  id: string;
  tipo: "contrato" | "distrato" | "adesao";
  empresa: string;
  dataEnvio: string;
  status: "enviado" | "assinado" | "pendente" | "recusado";
}

const mockContratos: Contrato[] = [
  { id: "1", tipo: "contrato", empresa: "Transportadora ABC Ltda", dataEnvio: "10/02/2024", status: "assinado" },
  { id: "2", tipo: "adesao", empresa: "Logística XYZ S/A", dataEnvio: "08/02/2024", status: "enviado" },
  { id: "3", tipo: "distrato", empresa: "Express Cargas ME", dataEnvio: "05/02/2024", status: "pendente" },
  { id: "4", tipo: "contrato", empresa: "Rápido Transportes", dataEnvio: "01/02/2024", status: "recusado" },
  { id: "5", tipo: "adesao", empresa: "Sul Logística", dataEnvio: "28/01/2024", status: "assinado" },
];

export default function Contratos() {
  const getStatusBadge = (status: Contrato["status"]) => {
    const config = {
      enviado: { class: "status-warning", label: "Enviado", icon: Clock },
      assinado: { class: "status-success", label: "Assinado", icon: CheckCircle },
      pendente: { class: "status-warning", label: "Pendente", icon: Clock },
      recusado: { class: "status-danger", label: "Recusado", icon: XCircle },
    };
    const { class: className, label, icon: Icon } = config[status];
    return (
      <span className={cn("status-badge inline-flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const getTipoBadge = (tipo: Contrato["tipo"]) => {
    const labels = {
      contrato: "Contrato",
      distrato: "Distrato",
      adesao: "Termo de Adesão",
    };
    return (
      <span className="status-badge bg-primary/10 text-primary">
        {labels[tipo]}
      </span>
    );
  };

  const ContratoTable = ({ contratos }: { contratos: Contrato[] }) => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="table-header">
            <th className="text-left px-6 py-4">Tipo</th>
            <th className="text-left px-6 py-4">Empresa</th>
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
              <td className="px-6 py-4 text-muted-foreground">{contrato.dataEnvio}</td>
              <td className="px-6 py-4">{getStatusBadge(contrato.status)}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    <Download className="h-3 w-3" />
                    Baixar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    <Send className="h-3 w-3" />
                    Reenviar
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
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie contratos, distratos e termos de adesão
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Documento
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="todos" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="todos" className="gap-2">
              <FileText className="h-4 w-4" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="distratos">Distratos</TabsTrigger>
            <TabsTrigger value="adesao">Termos de Adesão</TabsTrigger>
          </TabsList>

          <TabsContent value="todos">
            <ContratoTable contratos={mockContratos} />
          </TabsContent>
          <TabsContent value="contratos">
            <ContratoTable contratos={mockContratos.filter(c => c.tipo === "contrato")} />
          </TabsContent>
          <TabsContent value="distratos">
            <ContratoTable contratos={mockContratos.filter(c => c.tipo === "distrato")} />
          </TabsContent>
          <TabsContent value="adesao">
            <ContratoTable contratos={mockContratos.filter(c => c.tipo === "adesao")} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
