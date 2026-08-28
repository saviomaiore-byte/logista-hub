import { Button } from "@/components/ui/button";
import { RefreshCw, FileSpreadsheet, FileText, Send } from "lucide-react";

interface RelatoriosHeaderProps {
  loading: boolean;
  sending: boolean;
  sendDisabled: boolean;
  onRefresh: () => void;
  onExcel: () => void;
  onPdf: () => void;
  onEnviar: () => void;
}

export function RelatoriosHeader({ loading, sending, sendDisabled, onRefresh, onExcel, onPdf, onEnviar }: RelatoriosHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatório Semanal</h1>
        <p className="text-muted-foreground mt-1">
          Geração, visualização e envio do relatório de motoristas
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
        <Button variant="outline" size="sm" onClick={onExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={onPdf}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button size="sm" onClick={onEnviar} disabled={sendDisabled}>
          <Send className={`h-4 w-4 mr-2 ${sending ? "animate-spin" : ""}`} />
          Enviar
        </Button>
      </div>
    </div>
  );
}
