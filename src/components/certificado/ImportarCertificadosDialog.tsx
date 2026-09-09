import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { cn, formatDateOnly } from "@/lib/utils";
import {
  analisarImportacao,
  decodificarCsv,
  ErroPlanilha,
  LABEL_CLASSIFICACAO,
  parsePlanilhaCertificados,
  type AnaliseImportacao,
  type CertificadoLike,
  type ClassificacaoImportacao,
  type TransportadoraLike,
} from "@/lib/importacaoCertificados";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificados: CertificadoLike[];
  transportadoras: TransportadoraLike[];
}

const CLASSE_BADGE: Record<ClassificacaoImportacao, string> = {
  ja_existente: "bg-muted text-muted-foreground",
  novo: "status-success",
  transportadora_nao_encontrada: "status-danger",
  requer_revisao: "status-warning",
};

export function ImportarCertificadosDialog({ open, onOpenChange, certificados, transportadoras }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analise, setAnalise] = useState<AnaliseImportacao | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  const handleArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLendo(true);
    setErro(null);
    setAnalise(null);
    try {
      const texto = decodificarCsv(await file.arrayBuffer());
      const linhas = parsePlanilhaCertificados(texto);
      setAnalise(analisarImportacao(linhas, transportadoras, certificados));
      setNomeArquivo(file.name);
    } catch (err) {
      setErro(
        err instanceof ErroPlanilha
          ? err.message
          : "Não foi possível ler o arquivo. Verifique se é um CSV válido.",
      );
    } finally {
      setLendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const resumo = analise?.resumo;

  const cards = resumo
    ? [
        { label: "Linhas na planilha", valor: resumo.total, classe: "text-foreground" },
        { label: "Já existentes", valor: resumo.jaExistentes, classe: "text-muted-foreground" },
        { label: "Novos", valor: resumo.novos, classe: "text-success" },
        {
          label: "Transportadoras não encontradas",
          valor: resumo.transportadorasNaoEncontradas,
          classe: "text-destructive",
        },
        { label: "Requer revisão", valor: resumo.requerRevisao, classe: "text-warning" },
        { label: "Possíveis duplicidades", valor: resumo.duplicidadesPlanilha, classe: "text-warning" },
      ]
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setAnalise(null);
          setErro(null);
          setNomeArquivo("");
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Certificados — conferência</DialogTitle>
          <DialogDescription>
            Esta etapa apenas lê a planilha e compara com o que já está cadastrado. Nenhum dado é alterado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "65vh" }}>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleArquivo} />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={lendo}>
              <Upload className="mr-2 h-4 w-4" />
              {lendo ? "Lendo..." : "Selecionar planilha CSV"}
            </Button>
            {nomeArquivo && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" /> {nomeArquivo}
              </span>
            )}
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {resumo && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {cards.map((c) => (
                <div key={c.label} className="rounded-xl border border-border bg-card p-3">
                  <p className={cn("text-2xl font-bold", c.classe)}>{c.valor}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {analise && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-3 text-left">Empresa (planilha)</th>
                    <th className="px-3 py-3 text-left">CNPJ</th>
                    <th className="px-3 py-3 text-left">Transportadora encontrada</th>
                    <th className="px-3 py-3 text-left">Regime (planilha)</th>
                    <th className="px-3 py-3 text-left">Regime cadastrado</th>
                    <th className="px-3 py-3 text-left">Renovação</th>
                    <th className="px-3 py-3 text-left">Vencimento</th>
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-left">Classificação</th>
                    <th className="px-3 py-3 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analise.linhas.map((l) => (
                    <tr key={`${l.linha}-${l.cnpjNumeros}`} className="align-top hover:bg-muted/30">
                      <td className="px-3 py-3 font-medium">{l.empresa || "—"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{l.cnpjExibicao || "—"}</td>
                      <td className="px-3 py-3">{l.transportadoraEncontrada || "—"}</td>
                      <td className={cn("px-3 py-3", l.regimeDivergente && "font-medium text-warning")}>
                        {l.regime || "—"}
                      </td>
                      <td className={cn("px-3 py-3", l.regimeDivergente && "font-medium text-warning")}>
                        {l.regimeCadastrado || "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {l.renovacao ? formatDateOnly(l.renovacao) : l.renovacaoOriginal || "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {l.vencimento ? formatDateOnly(l.vencimento) : l.vencimentoOriginal || "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{l.status || "—"}</td>
                      <td className="px-3 py-3">
                        <span className={cn("status-badge whitespace-nowrap", CLASSE_BADGE[l.classificacao])}>
                          {LABEL_CLASSIFICACAO[l.classificacao]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        <ul className="space-y-1">
                          {l.motivos.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                          {l.avisos.map((a) => (
                            <li key={a} className="text-warning">
                              {a}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button disabled className="w-full sm:w-auto">
            Importação será implementada na próxima etapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
