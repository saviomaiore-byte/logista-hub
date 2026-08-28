import { AlertTriangle, MapPin, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SITUACAO_ICONS, SITUACAO_LABELS, TransportadorComMotoristas } from "./types";

interface RelatorioDadosTabProps {
  dados: TransportadorComMotoristas[];
  loading: boolean;
}

export function RelatorioDadosTab({ dados, loading }: RelatorioDadosTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (dados.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma transportadora ativa encontrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {dados.map((t) => (
        <Card key={t.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t.razao_social}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  CNPJ: {t.cpf_cnpj} | ANTT: {t.antt_numero ? "Sim" : "Não"} | Certificado: {t.certificado_numero ? "Sim" : "Não"} | Alvará: {t.alvara_numero ? "Sim" : "Não"}
                </p>
              </div>
              <Badge variant="secondary">{t.motoristas.length} motorista(s)</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {t.motoristas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum motorista vinculado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Aptidão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Motivos Inaptidão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.motoristas.map((m) => {
                      const SituacaoIcon = SITUACAO_ICONS[t.situacao_operacional || "em_praca_apto"] || MapPin;
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{m.nome}</p>
                              <p className="text-xs text-muted-foreground">{m.cpf}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.apto ? "default" : "destructive"}>
                              {m.apto ? "Apto" : "Inapto"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.status === "ativo" ? "secondary" : "outline"}>
                              {m.status === "ativo" ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <SituacaoIcon className="h-3.5 w-3.5" />
                              <span className="text-sm">
                                {SITUACAO_LABELS[t.situacao_operacional || "em_praca_apto"]}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.tem_contrato ? "default" : "destructive"}>
                              {m.tem_contrato ? "Sim" : "Não"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {m.motivos_inaptidao.length > 0 ? (
                              <div className="space-y-1">
                                {m.motivos_inaptidao.map((motivo, i) => (
                                  <div key={i} className="flex items-center gap-1 text-xs text-destructive">
                                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                    {motivo}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
