import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { Download } from "lucide-react";
import type { Conferencia } from "./types";

interface ConferenciaHeaderCardProps {
  conferencia: Conferencia | undefined;
  onUploadApolice: (url: string) => Promise<void>;
  onRemoveApolice: () => Promise<void>;
}

export function ConferenciaHeaderCard({
  conferencia,
  onUploadApolice,
  onRemoveApolice,
}: ConferenciaHeaderCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{conferencia?.titulo}</h2>
          <p className="text-sm text-muted-foreground">Período: {conferencia?.periodo_referencia}</p>
        </div>
        <div className="flex items-center gap-3">
          {conferencia?.arquivo_apolice_url ? (
            <a href={conferencia.arquivo_apolice_url} target="_blank" rel="noopener noreferrer" download>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Ver Apólice
              </Button>
            </a>
          ) : null}
          <FileUpload
            currentUrl={conferencia?.arquivo_apolice_url || undefined}
            onUpload={onUploadApolice}
            onRemove={onRemoveApolice}
            folder="conferencia-seguros"
            accept=".pdf"
            label="Anexar Apólice PDF"
          />
        </div>
      </div>
    </div>
  );
}
