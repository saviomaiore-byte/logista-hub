import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, FileText } from "lucide-react";
import { openSignedFile } from "@/lib/storage";
import type { Cavalo } from "./types";
import { usePermissoes } from "@/hooks/usePermissoes";

type Props = {
  items: Cavalo[];
  isMobile: boolean;
  onEdit: (cavalo: Cavalo) => void;
  onDelete: (id: string) => void;
};

export function CavalosList({ items, isMobile, onEdit, onDelete }: Props) {
  const { isAdmin, podeEditar } = usePermissoes();
  if (isMobile) {
    return (
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum cavalo encontrado</div>
        ) : items.map((c) => (
          <div key={c.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div>
              <p className="font-semibold text-foreground">{c.transportadores?.razao_social || "-"}</p>
              <p className="text-sm text-muted-foreground">Transportador vinculado</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Documento</span>
              {c.arquivo_url ? (
                <Button variant="outline" size="sm" onClick={() => openSignedFile(c.arquivo_url!)}>
                  <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Sem anexo</span>
              )}
            </div>
            <div className="flex items-center gap-1 pt-1 border-t border-border">
              {podeEditar(c) && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir?")) onDelete(c.id); }}>
                  <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Transportador</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.transportadores?.razao_social || "-"}</TableCell>
                <TableCell>
                  {c.arquivo_url ? (
                    <Button variant="outline" size="sm" onClick={() => openSignedFile(c.arquivo_url!)}>
                      <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">Sem anexo</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {podeEditar(c) && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) onDelete(c.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum cavalo encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
