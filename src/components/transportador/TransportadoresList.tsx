import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Link2, Unlink, FileText, MoreVertical, Check, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { Transportador } from "./types";
import { usePermissoes } from "@/hooks/usePermissoes";

type Props = {
  items: Transportador[];
  isMobile: boolean;
  getMotoristasByTransp: (transpId: string) => any[];
  onOpen: (t: Transportador) => void;
  onEdit: (t: Transportador) => void;
  onDelete: (id: string) => void;
  onVincular: (transpId: string) => void;
  onRemoveVinculo: (vinculoId: string) => void;
  onToggleMotoristaProprio: (vinculoId: string, motoristaProprio: boolean) => void;
  onVerContratos: (t: Transportador) => void;
};

export function TransportadoresList({
  items,
  isMobile,
  getMotoristasByTransp,
  onOpen,
  onEdit,
  onDelete,
  onVincular,
  onRemoveVinculo,
  onToggleMotoristaProprio,
  onVerContratos,
}: Props) {
  const { isAdmin, podeEditar } = usePermissoes();
  const [selectedTransportador, setSelectedTransportador] = useState<Transportador | null>(null);
  const selectedMotoristas = selectedTransportador ? getMotoristasByTransp(selectedTransportador.id) : [];

  const initials = (name: string) =>
    name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const openMotoristas = (transportador: Transportador) => setSelectedTransportador(transportador);

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
                    <button type="button" onClick={() => onOpen(t)} className="text-left font-semibold text-foreground hover:text-primary hover:underline">
                      {t.razao_social}
                    </button>
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
                    <div key={v.id} className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs">{v.motoristas?.nome}</span>
                      {v.motorista_proprio && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">
                          Motorista Próprio
                        </Badge>
                      )}
                      {podeEditar(t) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1 text-[10px]"
                          onClick={() => onToggleMotoristaProprio(v.id, !v.motorista_proprio)}
                        >
                          {v.motorista_proprio ? "Desmarcar próprio" : "Marcar próprio"}
                        </Button>
                      )}
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
                <Button variant="ghost" size="sm" onClick={() => onVerContratos(t)}>
                  <FileText className="h-4 w-4 mr-1" /> Ver contratos
                </Button>
                {podeEditar(t) && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(t)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir?")) onDelete(t.id); }}>
                    <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-border shadow-card">
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[920px] text-[13px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 px-4 text-[11px] font-medium text-muted-foreground">Transportador</TableHead>
                <TableHead className="h-12 px-4 text-[11px] font-medium text-muted-foreground">CPF/CNPJ</TableHead>
                <TableHead className="h-12 px-4 text-[11px] font-medium text-muted-foreground">Contato</TableHead>
                <TableHead className="h-12 px-4 text-[11px] font-medium text-muted-foreground">Motoristas</TableHead>
                <TableHead className="h-12 px-4 text-[11px] font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="h-12 px-4 text-right text-[11px] font-medium text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => {
                const mots = getMotoristasByTransp(t.id);
                const hasOwn = mots.some((v: any) => v.motorista_proprio);
                return (
                  <TableRow key={t.id} className="hover:bg-muted/20">
                    <TableCell className="px-4 py-3.5">
                      <button type="button" onClick={() => onOpen(t)} className="block max-w-[280px] truncate text-left font-semibold text-foreground hover:text-primary hover:underline">
                        {t.razao_social}
                      </button>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{t.inscricao_estadual || "Regime não informado"}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground">{t.cpf_cnpj}</TableCell>
                    <TableCell className="px-4 py-3.5 text-foreground">{t.contato || "—"}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => openMotoristas(t)}
                        className="group flex items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-primary/[0.06]"
                      >
                        {mots.length > 0 ? (
                          <>
                            <span className="flex items-center pl-1.5">
                              {mots.slice(0, 3).map((v: any, index: number) => (
                                <span key={v.id} className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[9px] font-semibold text-primary">
                                  {initials(v.motoristas?.nome || "?")}
                                </span>
                              ))}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              {mots.length} {mots.length === 1 ? "motorista" : "motoristas"}
                              {hasOwn && <small className="block text-[10px] font-normal text-muted-foreground">inclui motorista próprio</small>}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground underline underline-offset-2">Vincular motorista</span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className={t.status === "ativo" ? "status-badge status-success gap-1" : "status-badge status-danger gap-1"}>
                        {t.status === "ativo" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {t.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuItem onClick={() => onVerContratos(t)}>
                            <FileText className="mr-2 h-4 w-4" /> Ver contratos
                          </DropdownMenuItem>
                          {podeEditar(t) && (
                            <DropdownMenuItem onClick={() => onEdit(t)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { if (confirm("Excluir este transportador?")) onDelete(t.id); }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum transportador encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Mostrando {items.length} transportador{items.length !== 1 ? "es" : ""}</span>
            <span>Total: {items.length}</span>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selectedTransportador} onOpenChange={(open) => !open && setSelectedTransportador(null)}>
        <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                {selectedTransportador ? initials(selectedTransportador.razao_social) : ""}
              </div>
              <div>
                <SheetTitle className="text-base">{selectedTransportador?.razao_social}</SheetTitle>
                <SheetDescription className="mt-1 text-xs">Gestão de motoristas vinculados</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motoristas vinculados</p>
            <div className="space-y-2.5">
              {selectedMotoristas.map((v: any) => (
                <div key={v.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                    {initials(v.motoristas?.nome || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{v.motoristas?.nome}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{v.motorista_proprio ? "Motorista próprio" : "Motorista vinculado"}</p>
                  </div>
                  {selectedTransportador && podeEditar(selectedTransportador) && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Próprio</span>
                      <Switch checked={!!v.motorista_proprio} onCheckedChange={(checked) => onToggleMotoristaProprio(v.id, checked)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onRemoveVinculo(v.id)}>
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {selectedMotoristas.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Nenhum motorista vinculado ainda.</p>
              )}
            </div>
            {selectedTransportador && podeEditar(selectedTransportador) && (
              <Button variant="outline" className="mt-4 w-full rounded-xl border-dashed" onClick={() => onVincular(selectedTransportador.id)}>
                <Link2 className="mr-2 h-4 w-4" /> Vincular motorista
              </Button>
            )}
          </div>
          <div className="border-t border-border p-5">
            <Button variant="outline" className="w-full" onClick={() => setSelectedTransportador(null)}>Fechar</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
