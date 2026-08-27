import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Props = {
  total: number;
  onNovo: () => void;
};

export function MotoristasHeader({ total, onNovo }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
        <p className="text-muted-foreground mt-1">
          {total} motorista{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""} • Gerencie o cadastro de motoristas e documentos
        </p>
      </div>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onNovo}>
        <Plus className="h-4 w-4 mr-2" />
        Novo Motorista
      </Button>
    </div>
  );
}
