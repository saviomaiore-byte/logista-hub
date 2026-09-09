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
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle } from "lucide-react";
import { cn, formatDateOnly } from "@/lib/utils";
import { toast } from "sonner";
import {
  alteracoesDeRegime,
  analisarImportacao,
  decodificarCsv,
  ErroPlanilha,
  LABEL_CLASSIFICACAO,
  montarPayloadImportacao,
  parsePlanilhaCertificados,
  type AlteracaoRegime,
  type AnaliseImportacao,
  type CertificadoLike,
  type ClassificacaoImportacao,
  type LinhaPlanilha,
  type TransportadoraLike,
} from "@/lib/importacaoCertificados";
import {
  revalidarImportacao,
  useImportarCertificados,
  type ResultadoGravacao,
} from "@/hooks/useCertificados";

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

type Etapa = "preview" | "confirmacao" | "resultado";

export function ImportarCertificadosDialog({ open, onOpenChange, certificados, transportadoras }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analise, setAnalise] = useState<AnaliseImportacao | null>(null);
  const [linhasPlanilha, setLinhasPlanilha] = useState<LinhaPlanilha[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("preview");
  const [revalidando, setRevalidando] = useState(false);
  const [revalidada, setRevalidada] = useState<AnaliseImportacao | null>(null);
  const [regimes, setRegimes] = useState<AlteracaoRegime[]>([]);
  const [resultado, setResultado] = useState<ResultadoGravacao | null>(null);
  const [resumoInicial, setResumoInicial] = useState<AnaliseImportacao["resumo"] | null>(null);

  const importar = useImportarCertificados();

  const limpar = () => {
    setAnalise(null);
    setLinhasPlanilha([]);
    setErro(null);
    setNomeArquivo("");
    setEtapa("preview");
    setRevalidada(null);
    setRegimes([]);
    setResultado(null);
    setResumoInicial(null);
  };

  const handleArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLendo(true);
    setErro(null);
    setAnalise(null);
    setResultado(null);
    setEtapa("preview");
    try {
      const texto = decodificarCsv(await file.arrayBuffer());
      const linhas = parsePlanilhaCertificados(texto);
      setLinhasPlanilha(linhas);
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

  const prosseguir = async () => {
    if (!linhasPlanilha.length) return;
    setRevalidando(true);
    setErro(null);
    try {
      const nova = await revalidarImportacao(linhasPlanilha);
      setRevalidada(nova);
      setRegimes(alteracoesDeRegime(nova));
      setResumoInicial(analise?.resumo ?? nova.resumo);
      setEtapa("confirmacao");
    } catch {
      setErro("Não foi possível revalidar os dados. Nenhum registro foi gravado.");
    } finally {
      setRevalidando(false);
    }
  };

  const confirmar = async () => {
    if (!revalidada || importar.isPending) return;
    try {
      const res = await importar.mutateAsync(revalidada);
      setResultado(res);
      setEtapa("resultado");
      if (res.ignorados.length === 0) {
        toast.success(`Importação concluída: ${res.inseridos.length} certificados gravados.`);
      } else {
        toast.warning(
          `Importação concluída com ressalvas: ${res.inseridos.length} gravados, ${res.ignorados.length} ignorados.`,
        );
      }
    } catch {
      setErro("Importação não realizada. Nenhum certificado ou regime foi alterado.");
      setEtapa("confirmacao");
    }
  };

  const resumo = analise?.resumo;
  const prontos = revalidada ? montarPayloadImportacao(revalidada).length : 0;

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

  const ignoradosPorCnpj = new Map((resultado?.ignorados || []).map((i) => [i.cnpj, i.motivo]));
  const inseridosPorCnpj = new Set((resultado?.inseridos || []).map((i) => i.cnpj));

  const resultadoDaLinha = (cnpj: string, classificacao: ClassificacaoImportacao) => {
    if (inseridosPorCnpj.has(cnpj)) return { texto: "Importado", classe: "status-success" };
    const motivo = ignoradosPorCnpj.get(cnpj);
    if (motivo) return { texto: `Ignorado — ${motivo.toLowerCase()}`, classe: "bg-muted text-muted-foreground" };
    if (classificacao === "transportadora_nao_encontrada")
      return { texto: "Não importado — transportadora não encontrada", classe: "status-danger" };
    if (classificacao === "requer_revisao")
      return { texto: "Não importado — requer revisão", classe: "status-warning" };
    return { texto: "Ignorado — já existente", classe: "bg-muted text-muted-foreground" };
  };

  const linhasTabela = (etapa === "resultado" ? revalidada : analise)?.linhas ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (importar.isPending) return;
        onOpenChange(v);
        if (!v) limpar();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {etapa === "resultado" ? "Importar Certificados — resultado" : "Importar Certificados — conferência"}
          </DialogTitle>
          <DialogDescription>
            {etapa === "resultado"
              ? "Resultado da gravação. Certificados e regimes foram gravados juntos."
              : "A planilha é comparada com o que já está cadastrado. Nada é gravado sem a sua confirmação."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "65vh" }}>
          {etapa === "preview" && (
            <>
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
            </>
          )}

          {erro && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {etapa === "confirmacao" && revalidada && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 font-semibold">Confirmação da importação</p>
                <ul className="space-y-1 text-sm">
                  <li>{resumoInicial?.novos ?? 0} registros originalmente elegíveis</li>
                  <li className="font-medium text-success">{prontos} prontos para importar após a revalidação</li>
                  <li>{revalidada.resumo.jaExistentes} já existentes detectados na revalidação</li>
                  <li>{revalidada.resumo.transportadorasNaoEncontradas} sem transportadora</li>
                  <li>{revalidada.resumo.requerRevisao} com erro de dados / requer revisão</li>
                </ul>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 font-semibold">Alterações de Regime Tributário ({regimes.length})</p>
                {regimes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma alteração de regime será feita.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {regimes.map((r) => (
                      <li key={`${r.transportadora}-${r.novo}`}>
                        <span className="font-medium">{r.transportadora}</span>:{" "}
                        <span className="text-muted-foreground">{r.atual || "—"}</span> →{" "}
                        <span className="font-medium text-warning">{r.novo}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {etapa === "resultado" && resultado && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4 text-success" /> Importação concluída
              </p>
              <ul className="space-y-1 text-sm">
                <li>Planilha: {revalidada?.resumo.total ?? 0} linhas válidas</li>
                <li>Já existentes antes: {resumoInicial?.jaExistentes ?? 0}</li>
                <li>Novos elegíveis inicialmente: {resumoInicial?.novos ?? 0}</li>
                <li className="font-medium text-success">Importados: {resultado.inseridos.length}</li>
                <li>Ignorados na gravação: {resultado.ignorados.length}</li>
                <li>
                  Transportadoras não encontradas: {revalidada?.resumo.transportadorasNaoEncontradas ?? 0}
                </li>
                <li>Registros que requeriam revisão: {revalidada?.resumo.requerRevisao ?? 0}</li>
                <li>Alterações de Regime Tributário: {resultado.regimes.length}</li>
              </ul>
            </div>
          )}

          {linhasTabela.length > 0 && etapa !== "confirmacao" && (
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
                    {etapa === "resultado" && <th className="px-3 py-3 text-left">Tipo</th>}
                    <th className="px-3 py-3 text-left">Status</th>
                    <th className="px-3 py-3 text-left">
                      {etapa === "resultado" ? "Resultado" : "Classificação"}
                    </th>
                    <th className="px-3 py-3 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linhasTabela.map((l) => {
                    const res = etapa === "resultado" ? resultadoDaLinha(l.cnpjNumeros, l.classificacao) : null;
                    return (
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
                        {etapa === "resultado" && (
                          <td className="px-3 py-3 text-muted-foreground">
                            {res?.texto === "Importado" ? "A1" : "—"}
                          </td>
                        )}
                        <td className="px-3 py-3 text-muted-foreground">{l.status || "—"}</td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "status-badge whitespace-nowrap",
                              res ? res.classe : CLASSE_BADGE[l.classificacao],
                            )}
                          >
                            {res ? res.texto : LABEL_CLASSIFICACAO[l.classificacao]}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          {etapa === "preview" && (
            <Button
              className="w-full sm:w-auto"
              disabled={!analise || analise.resumo.novos === 0 || revalidando}
              onClick={prosseguir}
            >
              {revalidando ? "Revalidando..." : "Prosseguir com importação"}
            </Button>
          )}

          {etapa === "confirmacao" && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button variant="outline" onClick={() => setEtapa("preview")} disabled={importar.isPending}>
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={importar.isPending || prontos === 0}>
                {importar.isPending ? "Importando..." : `Confirmar importação de ${prontos} certificados`}
              </Button>
            </div>
          )}

          {etapa === "resultado" && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                limpar();
              }}
            >
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
