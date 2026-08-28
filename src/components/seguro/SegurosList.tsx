import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Pencil, Shield, Trash2 } from "lucide-react";
import { SeguroStatusBadge } from "./SeguroStatusBadge";
import { formatVigencia, type Seguro } from "./types";
import { usePermissoes } from "@/hooks/usePermissoes";

interface SegurosListProps {
  seguros: Seguro[] | undefined;
  isLoading: boolean;
  isMobile: boolean;
  onEdit: (seguro: Seguro) => void;
  onDelete: (id: string) => void;
}

export function SegurosList({ seguros, isLoading, isMobile, onEdit, onDelete }: SegurosListProps) {
  const { isAdmin, podeEditar } = usePermissoes();
  if (isMobile) {
    return (
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : seguros?.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum seguro encontrado</p>
          </div>
        ) : (
          seguros?.map((seguro) => (
            <div key={seguro.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  {seguro.motoristas ? (
                    <>
                      <p className="font-semibold text-foreground">{seguro.motoristas.nome}</p>
                      <p className="text-xs text-muted-foreground">{seguro.motoristas.cpf}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">Sem segurado</p>
                  )}
                </div>
                <SeguroStatusBadge seguro={seguro} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{seguro.tipo}</Badge>
                <span className="text-sm text-muted-foreground">{seguro.seguradora}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Vigência</p>
                  <p className="text-foreground">{formatVigencia(seguro.vigencia_inicio)} - {formatVigencia(seguro.vigencia_fim)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor</p>
                  <p className="text-foreground">{seguro.valor_premio ? `R$ ${seguro.valor_premio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-border">
                {seguro.arquivo_url && (
                  <a href={seguro.arquivo_url} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="ghost" size="sm"><Download className="h-4 w-4 mr-1" /> Baixar</Button>
                  </a>
                )}
                {podeEditar(seguro) && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(seguro)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(seguro.id)}>
                    <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead>Segurado</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Seguradora</TableHead>
            <TableHead>Apólice</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell>
            </TableRow>
          ) : seguros?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum seguro encontrado</p>
              </TableCell>
            </TableRow>
          ) : (
            seguros?.map((seguro) => (
              <TableRow key={seguro.id}>
                <TableCell>
                  {seguro.motoristas ? (
                    <div>
                      <p className="font-medium">{seguro.motoristas.nome}</p>
                      <p className="text-sm text-muted-foreground">{seguro.motoristas.cpf}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell><Badge variant="outline">{seguro.tipo}</Badge></TableCell>
                <TableCell>{seguro.seguradora}</TableCell>
                <TableCell>{seguro.numero_apolice || "-"}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{formatVigencia(seguro.vigencia_inicio)}</p>
                    <p className="text-muted-foreground">até {formatVigencia(seguro.vigencia_fim)}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {seguro.valor_premio
                    ? `R$ ${seguro.valor_premio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    : "-"}
                </TableCell>
                <TableCell><SeguroStatusBadge seguro={seguro} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {seguro.arquivo_url && (
                      <a href={seguro.arquivo_url} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="ghost" size="icon" title="Baixar Apólice">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {podeEditar(seguro) && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(seguro)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => onDelete(seguro.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
