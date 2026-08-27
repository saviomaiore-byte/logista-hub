import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Link2, Unlink, FileText } from "lucide-react";
import type { Transportador } from "./types";

type Props = {
  items: Transportador[];
  isMobile: boolean;
  getMotoristasByTransp: (transpId: string) => any[];
  onEdit: (t: Transportador) => void;
  onDelete: (id: string) => void;
  onVincular: (transpId: string) => void;
  onRemoveVinculo: (vinculoId: string) => void;
  onVerDocs: (t: Transportador) => void;
  onVerContratos: (t: Transportador) => void;
};

export function TransportadoresList({
  items,
  isMobile,
  getMotoristasByTransp,
  onEdit,
  onDelete,
  onVincular,
  onRemoveVinculo,
  onVerDocs,
  onVerContratos,
}: Props) {
  if (isMobile) {
    return (
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum transportador encontrado</div>
        ) : items.map((t) => {
          const mots = getMotoristasByTransp(t.id);
          return (
            <div key={t.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{t.razao_social}</p>
                    {t.motorista_id && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">Motorista Próprio</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.cpf_cnpj}</p>
                </div>
                <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                  {t.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {t.contato && <p className="text-sm text-muted-foreground">{t.contato}</p>}
              <div className="text-sm">
                <p className="text-xs text-muted-foreground mb-1">Motoristas vinculados:</p>
                {mots.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhum</span>
                ) : (
                  mots.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-1">
                      <span className="text-xs">{v.motoristas?.nome}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onRemoveVinculo(v.id)}>
                        <Unlink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
                <Button variant="outline" size="sm" className="h-6 text-xs mt-1" onClick={() => onVincular(t.id)}>
                  <Link2 className="h-3 w-3 mr-1" /> Vincular
                </Button>
              </div>
              <div className="flex items-center gap-1 pt-1 border-t border-border flex-wrap">
                <Button variant="ghost" size="sm" onClick={() => onVerDocs(t)}>
                  <FileText className="h-4 w-4 mr-1" /> Ver docs
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onVerContratos(t)}>
                  <FileText className="h-4 w-4 mr-1" /> Ver contratos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(t)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir?")) onDelete(t.id); }}>
                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Razão Social</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Regime Tributário</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Motoristas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => {
              const mots = getMotoristasByTransp(t.id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {t.razao_social}
                      {t.motorista_id && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">Motorista Próprio</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{t.cpf_cnpj}</TableCell>
                  <TableCell>{t.inscricao_estadual || "-"}</TableCell>
                  <TableCell>{t.contato || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {mots.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Nenhum</span>
                      ) : (
                        mots.map((v: any) => (
                          <div key={v.id} className="flex items-center gap-1">
                            <span className="text-xs">{v.motoristas?.nome}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onRemoveVinculo(v.id)}>
                              <Unlink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      )}
                      <Button variant="outline" size="sm" className="h-6 text-xs mt-1" onClick={() => onVincular(t.id)}>
                        <Link2 className="h-3 w-3 mr-1" /> Vincular
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                      {t.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => onVerDocs(t)} title="Ver docs">
                        <FileText className="h-4 w-4 mr-1" /> Ver docs
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onVerContratos(t)} title="Ver contratos">
                        <FileText className="h-4 w-4 mr-1" /> Ver contratos
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEdit(t)}>
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir este transportador?")) onDelete(t.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum transportador encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
