import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/FileUpload";

interface NovaConferenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  onTituloChange: (value: string) => void;
  periodo: string;
  onPeriodoChange: (value: string) => void;
  arquivoUrl: string;
  onArquivoUrlChange: (value: string) => void;
  observacoes: string;
  onObservacoesChange: (value: string) => void;
  onCreate: () => void;
  isPending: boolean;
}

export function NovaConferenciaDialog({
  open,
  onOpenChange,
  titulo,
  onTituloChange,
  periodo,
  onPeriodoChange,
  arquivoUrl,
  onArquivoUrlChange,
  observacoes,
  onObservacoesChange,
  onCreate,
  isPending,
}: NovaConferenciaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conferência
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Conferência de Seguros</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input placeholder="Ex: Apólice Mensal - Março/2026" value={titulo} onChange={(e) => onTituloChange(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Período de Referência *</label>
            <Input placeholder="Ex: 03/2026" value={periodo} onChange={(e) => onPeriodoChange(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Apólice PDF (anexar)</label>
            <FileUpload
              currentUrl={arquivoUrl || undefined}
              onUpload={(url) => onArquivoUrlChange(url)}
              onRemove={() => onArquivoUrlChange("")}
              folder="conferencia-seguros"
              accept=".pdf,.jpg,.jpeg,.png"
              label="Anexar Apólice"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Observações</label>
            <Textarea placeholder="Observações gerais..." value={observacoes} onChange={(e) => onObservacoesChange(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onCreate} disabled={!titulo || !periodo || isPending}>
              Criar Conferência
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
