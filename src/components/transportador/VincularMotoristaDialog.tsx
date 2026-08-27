import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2 } from "lucide-react";

type Motorista = { id: string; nome: string; cpf: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transportadorId: string | null;
  motoristasDisponiveis: Motorista[];
  onVincular: (transportadorId: string, motoristaId: string) => void;
};

export function VincularMotoristaDialog({
  open,
  onOpenChange,
  transportadorId,
  motoristasDisponiveis,
  onVincular,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Motorista</DialogTitle>
        </DialogHeader>
        {transportadorId && (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {motoristasDisponiveis.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Todos os motoristas já estão vinculados</p>
            ) : (
              motoristasDisponiveis.map((m) => (
                <div key={m.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.nome}</p>
                    <p className="text-xs text-muted-foreground">{m.cpf}</p>
                  </div>
                  <Button size="sm" className="w-full sm:w-auto" onClick={() => onVincular(transportadorId, m.id)}>
                    <Link2 className="mr-1 h-3 w-3" /> Vincular
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
