import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  FileText,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  cidade: string;
  status: "ativo" | "inativo" | "pendente";
  cnhVencimento: string;
  moppVencimento: string;
  anttVencimento: string;
}

const mockMotoristas: Motorista[] = [
  {
    id: "1",
    nome: "João Silva Santos",
    cpf: "123.456.789-00",
    telefone: "(11) 99999-9999",
    email: "joao.silva@email.com",
    cidade: "São Paulo, SP",
    status: "ativo",
    cnhVencimento: "15/06/2024",
    moppVencimento: "20/08/2024",
    anttVencimento: "10/12/2024",
  },
  {
    id: "2",
    nome: "Carlos Eduardo Pereira",
    cpf: "987.654.321-00",
    telefone: "(21) 98888-8888",
    email: "carlos.pereira@email.com",
    cidade: "Rio de Janeiro, RJ",
    status: "ativo",
    cnhVencimento: "20/02/2024",
    moppVencimento: "15/03/2024",
    anttVencimento: "05/05/2024",
  },
  {
    id: "3",
    nome: "Pedro Henrique Oliveira",
    cpf: "456.789.123-00",
    telefone: "(31) 97777-7777",
    email: "pedro.oliveira@email.com",
    cidade: "Belo Horizonte, MG",
    status: "pendente",
    cnhVencimento: "10/04/2024",
    moppVencimento: "25/06/2024",
    anttVencimento: "30/09/2024",
  },
  {
    id: "4",
    nome: "André Luis Costa",
    cpf: "789.123.456-00",
    telefone: "(41) 96666-6666",
    email: "andre.costa@email.com",
    cidade: "Curitiba, PR",
    status: "inativo",
    cnhVencimento: "05/01/2024",
    moppVencimento: "12/02/2024",
    anttVencimento: "18/03/2024",
  },
];

export default function Motoristas() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status: Motorista["status"]) => {
    const styles = {
      ativo: "status-success",
      inativo: "status-danger",
      pendente: "status-warning",
    };
    const labels = {
      ativo: "Ativo",
      inativo: "Inativo",
      pendente: "Pendente",
    };
    return <span className={cn("status-badge", styles[status])}>{labels[status]}</span>;
  };

  const filteredMotoristas = mockMotoristas.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cpf.includes(searchTerm)
  );

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o cadastro de motoristas e documentos
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Motorista
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left px-6 py-4">Motorista</th>
                <th className="text-left px-6 py-4">Contato</th>
                <th className="text-left px-6 py-4">Cidade</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Documentos</th>
                <th className="text-right px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMotoristas.map((motorista) => (
                <tr key={motorista.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">{motorista.nome}</p>
                      <p className="text-sm text-muted-foreground">{motorista.cpf}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {motorista.telefone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {motorista.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {motorista.cidade}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(motorista.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                        <FileText className="h-3 w-3" />
                        Ver docs
                      </Button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <p>Mostrando 1-{filteredMotoristas.length} de {mockMotoristas.length} motoristas</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm">
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
