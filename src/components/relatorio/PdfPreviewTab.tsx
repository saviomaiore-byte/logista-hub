import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";

interface PdfPreviewTabProps {
  pdfPreviewUrl: string | null;
  onDownload: () => void;
}

export function PdfPreviewTab({ pdfPreviewUrl, onDownload }: PdfPreviewTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pré-visualização do PDF
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pdfPreviewUrl ? (
          <iframe
            src={pdfPreviewUrl}
            className="w-full rounded-md border"
            style={{ height: "70vh" }}
            title="Pré-visualização PDF"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-40" />
            <p>Clique na aba para gerar a pré-visualização do PDF</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
