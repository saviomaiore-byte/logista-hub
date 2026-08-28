import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, Paperclip } from "lucide-react";

interface ExcelPreviewTabProps {
  excelPreviewData: Record<string, any[][]> | null;
  activeExcelSheet: string;
  onSelectSheet: (sheetName: string) => void;
  onDownload: () => void;
}

export function ExcelPreviewTab({
  excelPreviewData,
  activeExcelSheet,
  onSelectSheet,
  onDownload,
}: ExcelPreviewTabProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Pré-visualização da Planilha
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Baixar Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {excelPreviewData ? (
          <div className="space-y-4">
            {/* Sheet selector */}
            <div className="flex gap-2 flex-wrap">
              {Object.keys(excelPreviewData).map((sheetName) => (
                <Button
                  key={sheetName}
                  variant={activeExcelSheet === sheetName ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectSheet(sheetName)}
                >
                  {sheetName}
                </Button>
              ))}
            </div>

            {/* Sheet data */}
            {activeExcelSheet && excelPreviewData[activeExcelSheet] && (
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(excelPreviewData[activeExcelSheet][0] || []).map((cell: any, i: number) => (
                        <TableHead key={i} className="whitespace-nowrap text-xs">
                          {cell ?? ""}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelPreviewData[activeExcelSheet].slice(1).map((row, ri) => (
                      <TableRow key={ri}>
                        {(excelPreviewData[activeExcelSheet][0] || []).map((_: any, ci: number) => (
                          <TableCell key={ci} className="whitespace-nowrap text-xs">
                            {row[ci] ?? ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>Esta planilha será enviada como anexo no e-mail</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mb-3 opacity-40" />
            <p>Clique na aba para gerar a pré-visualização da planilha</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
