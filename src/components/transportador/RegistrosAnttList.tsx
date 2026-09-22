import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, FileText } from "lucide-react";
import { openSignedFile } from "@/lib/storage";
import { formatDate } from "@/components/relatorio/types";
import type { RegistroAntt } from "./types";
import { usePermissoes } from "@/hooks/usePermissoes";

type Props = {
  items: RegistroAntt[];
  isMobile: boolean;
  onEdit: (registro: RegistroAntt) => void;
  onDelete: (id: string) => void;
};

export function RegistrosAnttList({ items, isMobile, onEdit, onDelete }: Props) {
  const { isAdmin, podeEditar } = usePermissoes();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum registro ANTT encontrado</div>
        ) : items.map((r) => (
          <div key={r.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div>
              <p className="font-semibold text-foreground">{r.transportadores?.razao_social || "-"}</p>
              <p className="text-sm text-muted-foreground">Transportador vinculado</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Data de emissão</span>
              <span className="text-sm text-foreground">{formatDate(r.antt_data_emissao)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Cavalos</span>
              <span className="text-sm text-foreground">{r.qtd_cavalos ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Reboques</span>
              <span className="text-sm text-foreground">{r.qtd_reboques ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">ANTT</span>
              {r.arquivo_url ? (
                <Button variant="outline" size="sm" onClick={() => openSignedFile(r.arquivo_url!)}>
                  <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Sem anexo</span>
              )}
            </div>
            <div className="flex items-center gap-1 pt-1 border-t border-border">
              {podeEditar(r) && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(r)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir?")) onDelete(r.id); }}>
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
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Transportador</TableHead>
              <TableHead>Data de emissão</TableHead>
              <TableHead>Cavalos</TableHead>
              <TableHead>Reboques</TableHead>
              <TableHead>ANTT</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.transportadores?.razao_social || "-"}</TableCell>
                <TableCell>{formatDate(r.antt_data_emissao)}</TableCell>
                <TableCell>{r.qtd_cavalos ?? "—"}</TableCell>
                <TableCell>{r.qtd_reboques ?? "—"}</TableCell>
                <TableCell>
                  {r.arquivo_url ? (
                    <Button variant="outline" size="sm" onClick={() => openSignedFile(r.arquivo_url!)}>
                      <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">Sem anexo</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {podeEditar(r) && (
                      <Button variant="ghost" size="icon" onClick={() => onEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) onDelete(r.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro ANTT encontrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
