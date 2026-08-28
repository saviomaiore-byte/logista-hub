import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Edit, FileText, Mail, MapPin, MoreHorizontal, Phone, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Motorista, Transportadora } from "./types";
import { usePermissoes } from "@/hooks/usePermissoes";

type Props = {
  loading: boolean;
  isMobile: boolean;
  items: Motorista[];
  searchTerm: string;
  transportadoras: Transportadora[];
  vinculos: Record<string, string[]>;
  onEdit: (motorista: Motorista) => void;
  onDocs: (motorista: Motorista) => void;
  onDelete: (id: string) => void;
};

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    ativo: "status-success",
    inativo: "status-danger",
    pendente: "status-warning",
  };
  const labels: Record<string, string> = {
    ativo: "Ativo",
    inativo: "Inativo",
    pendente: "Pendente",
  };
  return <span className={cn("status-badge", styles[status])}>{labels[status]}</span>;
}

export function MotoristasList({
  loading,
  isMobile,
  items,
  searchTerm,
  transportadoras,
  vinculos,
  onEdit,
  onDocs,
  onDelete,
}: Props) {
  const { isAdmin, podeEditar } = usePermissoes();
  const renderVinculos = (motoristaId: string) =>
    vinculos[motoristaId]?.length > 0 ? (
      <div className="flex flex-wrap gap-1 mt-1">
        {vinculos[motoristaId].map((tid) => {
          const t = transportadoras.find((tr) => tr.id === tid);
          return t ? (
            <Badge key={tid} variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
              <Building2 className="h-2.5 w-2.5" />{t.razao_social}
            </Badge>
          ) : null;
        })}
      </div>
    ) : null;

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {searchTerm ? "Nenhum motorista encontrado" : "Nenhum motorista cadastrado"}
        </p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {items.map((motorista) => (
          <div key={motorista.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{motorista.nome}</p>
                <p className="text-sm text-muted-foreground">{motorista.cpf}</p>
                {renderVinculos(motorista.id)}
              </div>
              <div className="flex items-center gap-1">
                {getStatusBadge(motorista.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {podeEditar(motorista) && (
                      <DropdownMenuItem onClick={() => onEdit(motorista)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDocs(motorista)}>
                      <FileText className="h-4 w-4 mr-2" /> Documentos
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(motorista.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-sm">
              {motorista.telefone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  {motorista.telefone}
                </div>
              )}
              {motorista.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{motorista.email}</span>
                </div>
              )}
              {motorista.cidade && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {motorista.cidade}{motorista.estado && `, ${motorista.estado}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <table className="w-full min-w-[700px]">
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
          {items.map((motorista) => (
            <tr key={motorista.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-foreground">{motorista.nome}</p>
                  <p className="text-sm text-muted-foreground">{motorista.cpf}</p>
                  {renderVinculos(motorista.id)}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  {motorista.telefone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {motorista.telefone}
                    </div>
                  )}
                  {motorista.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {motorista.email}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {motorista.cidade && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {motorista.cidade}{motorista.estado && `, ${motorista.estado}`}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">{getStatusBadge(motorista.status)}</td>
              <td className="px-6 py-4">
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => onDocs(motorista)}>
                  <FileText className="h-3 w-3" />
                  Ver docs
                </Button>
              </td>
              <td className="px-6 py-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {podeEditar(motorista) && (
                      <DropdownMenuItem onClick={() => onEdit(motorista)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(motorista.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
