import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  total: number;
  onNew: () => void;
};

export function TransportadoresHeader({ total, onNew }: Props) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Transportadores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} transportador{total !== 1 ? "es" : ""} cadastrado{total !== 1 ? "s" : ""} · Gestão de transportadores, veículos e vínculos
        </p>
      </div>
      <Button className="rounded-xl" onClick={onNew}>
        <Plus className="mr-2 h-4 w-4" /> Novo Transportador
      </Button>
    </div>
  );
}
