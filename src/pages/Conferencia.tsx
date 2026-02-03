import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  FileWarning,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Documento {
  id: string;
  motorista: string;
  tipo: "CNH" | "MOPP" | "ANTT";
  numero: string;
  vencimento: string;
  diasRestantes: number;
  status: "valido" | "proximo" | "vencido";
}

const mockDocumentos: Documento[] = [
  { id: "1", motorista: "João Silva", tipo: "CNH", numero: "12345678900", vencimento: "10/01/2024", diasRestantes: -20, status: "vencido" },
  { id: "2", motorista: "João Silva", tipo: "MOPP", numero: "MOPP-001", vencimento: "15/02/2024", diasRestantes: 5, status: "proximo" },
  { id: "3", motorista: "Carlos Santos", tipo: "CNH", numero: "98765432100", vencimento: "20/02/2024", diasRestantes: 10, status: "proximo" },
  { id: "4", motorista: "Carlos Santos", tipo: "ANTT", numero: "ANTT-002", vencimento: "28/02/2024", diasRestantes: 18, status: "proximo" },
  { id: "5", motorista: "Pedro Oliveira", tipo: "CNH", numero: "45678912300", vencimento: "15/06/2024", diasRestantes: 125, status: "valido" },
  { id: "6", motorista: "Pedro Oliveira", tipo: "MOPP", numero: "MOPP-003", vencimento: "20/08/2024", diasRestantes: 191, status: "valido" },
  { id: "7", motorista: "André Costa", tipo: "ANTT", numero: "ANTT-004", vencimento: "05/01/2024", diasRestantes: -25, status: "vencido" },
];

export default function Conferencia() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const getStatusBadge = (doc: Documento) => {
    if (doc.status === "vencido") {
      return (
        <span className="status-badge status-danger inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencido há {Math.abs(doc.diasRestantes)} dias
        </span>
      );
    }
    if (doc.status === "proximo") {
      return (
        <span className="status-badge status-warning inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {doc.diasRestantes} dias restantes
        </span>
      );
    }
    return (
      <span className="status-badge status-success inline-flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Válido
      </span>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      CNH: "bg-sidebar-primary/10 text-sidebar-primary",
      MOPP: "bg-warning/10 text-warning",
      ANTT: "bg-primary/10 text-primary",
    };
    return <span className={cn("status-badge", colors[tipo])}>{tipo}</span>;
  };

  const filteredDocs = mockDocumentos.filter((doc) => {
    const matchesSearch = doc.motorista.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "todos" || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const vencidos = mockDocumentos.filter(d => d.status === "vencido").length;
  const proximos = mockDocumentos.filter(d => d.status === "proximo").length;

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Conferência de Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Monitore vencimentos de CNH, MOPP e ANTT
          </p>
        </div>

        {/* Alert Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{vencidos}</p>
              <p className="text-sm text-destructive/80">Documentos vencidos</p>
            </div>
          </div>
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/20">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{proximos}</p>
              <p className="text-sm text-warning/80">Vencem em 30 dias</p>
            </div>
          </div>
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{mockDocumentos.length - vencidos - proximos}</p>
              <p className="text-sm text-success/80">Documentos em dia</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {["todos", "vencido", "proximo", "valido"].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className={filterStatus === status ? "bg-primary text-primary-foreground" : ""}
              >
                {status === "todos" ? "Todos" : status === "vencido" ? "Vencidos" : status === "proximo" ? "Próximos" : "Válidos"}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left px-6 py-4">Motorista</th>
                <th className="text-left px-6 py-4">Tipo</th>
                <th className="text-left px-6 py-4">Número</th>
                <th className="text-left px-6 py-4">Vencimento</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className={cn(
                  "hover:bg-muted/30 transition-colors",
                  doc.status === "vencido" && "bg-destructive/5"
                )}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {doc.status === "vencido" && (
                        <FileWarning className="h-4 w-4 text-destructive" />
                      )}
                      <p className="font-medium text-foreground">{doc.motorista}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getTipoBadge(doc.tipo)}</td>
                  <td className="px-6 py-4 text-muted-foreground font-mono text-sm">{doc.numero}</td>
                  <td className="px-6 py-4 text-muted-foreground">{doc.vencimento}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc)}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8 gap-1">
                      <Send className="h-3 w-3" />
                      Notificar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
