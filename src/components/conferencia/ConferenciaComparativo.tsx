import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle2, XCircle, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { SeguradoExtraido } from "@/hooks/usePdfExtraction";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  status: string | null;
}

interface ComparacaoItem {
  nomeApolice: string | null;
  nomeSistema: string | null;
  cpf: string | null;
  certificado: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  premioSeguro: number | null;
  status: "coberto" | "descoberto" | "extra_apolice";
}

function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

function calcularSimilaridade(a: string, b: string): number {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (na === nb) return 1;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Word-based matching
  const wordsA = na.split(" ");
  const wordsB = nb.split(" ");
  const common = wordsA.filter((w) => wordsB.includes(w));
  const score = (2 * common.length) / (wordsA.length + wordsB.length);
  return score;
}

function criarComparacao(
  segurados: SeguradoExtraido[],
  motoristas: Motorista[]
): ComparacaoItem[] {
  const result: ComparacaoItem[] = [];
  const motoristasUsados = new Set<string>();

  // For each segurado in apólice, try to find matching motorista
  for (const seg of segurados) {
    let bestMatch: Motorista | null = null;
    let bestScore = 0;

    for (const mot of motoristas) {
      if (motoristasUsados.has(mot.id)) continue;
      const score = calcularSimilaridade(seg.nome, mot.nome);
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestMatch = mot;
      }
    }

    if (bestMatch) {
      motoristasUsados.add(bestMatch.id);
      result.push({
        nomeApolice: seg.nome,
        nomeSistema: bestMatch.nome,
        cpf: bestMatch.cpf,
        certificado: seg.certificado || null,
        vigenciaInicio: seg.vigencia_inicio || null,
        vigenciaFim: seg.vigencia_fim || null,
        premioSeguro: seg.premio_seguro || null,
        status: "coberto",
      });
    } else {
      result.push({
        nomeApolice: seg.nome,
        nomeSistema: null,
        cpf: null,
        certificado: seg.certificado || null,
        vigenciaInicio: seg.vigencia_inicio || null,
        vigenciaFim: seg.vigencia_fim || null,
        premioSeguro: seg.premio_seguro || null,
        status: "extra_apolice",
      });
    }
  }

  // Motoristas not found in apólice
  for (const mot of motoristas) {
    if (!motoristasUsados.has(mot.id)) {
      result.push({
        nomeApolice: null,
        nomeSistema: mot.nome,
        cpf: mot.cpf,
        certificado: null,
        vigenciaInicio: null,
        vigenciaFim: null,
        premioSeguro: null,
        status: "descoberto",
      });
    }
  }

  return result;
}

interface Props {
  seguradosExtraidos: SeguradoExtraido[];
  motoristas: Motorista[];
  isExtracting: boolean;
  isLoadingSaved?: boolean;
  progress: number;
  onExtract: () => void;
  hasApolice: boolean;
}

export function ConferenciaComparativo({
  seguradosExtraidos,
  motoristas,
  isExtracting,
  isLoadingSaved,
  progress,
  onExtract,
  hasApolice,
}: Props) {
  const [search, setSearch] = useState("");

  const comparacao = useMemo(
    () => criarComparacao(seguradosExtraidos, motoristas),
    [seguradosExtraidos, motoristas]
  );

  const filteredComparacao = comparacao.filter(
    (item) =>
      (item.nomeApolice || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.nomeSistema || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.cpf || "").includes(search)
  );

  const cobertos = comparacao.filter((i) => i.status === "coberto").length;
  const descobertos = comparacao.filter((i) => i.status === "descoberto").length;
  const extraApolice = comparacao.filter((i) => i.status === "extra_apolice").length;
  const totalMotoristas = motoristas.length;
  const cobertura = totalMotoristas > 0 ? Math.round((cobertos / totalMotoristas) * 100) : 0;

  if (!hasApolice) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto text-warning mb-3" />
        <p className="text-muted-foreground">
          Anexe um PDF de apólice à conferência para usar a extração automática.
        </p>
      </div>
    );
  }

  if (isLoadingSaved) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
        <p className="text-sm text-muted-foreground mt-3">Carregando dados salvos...</p>
      </div>
    );
  }

  if (seguradosExtraidos.length === 0 && !isExtracting) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center space-y-4">
        <Sparkles className="h-12 w-12 mx-auto text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">Extração Inteligente com IA</h3>
          <p className="text-sm text-muted-foreground mt-1">
            A IA irá ler todas as páginas da apólice, extrair os nomes dos segurados e comparar automaticamente com seus motoristas ativos.
          </p>
        </div>
        <Button onClick={onExtract} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Extrair e Comparar
        </Button>
      </div>
    );
  }

  if (isExtracting) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center space-y-4">
        <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
        <div>
          <h3 className="font-semibold text-foreground">Extraindo dados da apólice...</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {progress <= 45
              ? "Renderizando páginas do PDF..."
              : progress <= 89
              ? "Analisando com IA..."
              : "Finalizando..."}
          </p>
        </div>
        <Progress value={progress} className="h-3 max-w-md mx-auto" />
        <p className="text-xs text-muted-foreground">{progress}%</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{seguradosExtraidos.length}</p>
          <p className="text-xs text-muted-foreground">Na Apólice</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold text-success">{cobertos}</p>
          <p className="text-xs text-muted-foreground">Cobertos</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{descobertos}</p>
          <p className="text-xs text-muted-foreground">Descobertos</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold text-warning">{extraApolice}</p>
          <p className="text-xs text-muted-foreground">Só na Apólice</p>
        </div>
      </div>

      {/* Coverage bar */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            Cobertura dos motoristas ativos: {cobertos}/{totalMotoristas}
          </span>
          <span
            className={`font-bold ${
              cobertura === 100
                ? "text-success"
                : cobertura >= 80
                ? "text-warning"
                : "text-destructive"
            }`}
          >
            {cobertura}%
          </span>
        </div>
        <Progress value={cobertura} className="h-3" />
      </div>

      {/* Search + Re-extract */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" size="sm" onClick={onExtract} className="gap-1 ml-auto">
          <Sparkles className="h-3 w-3" />
          Re-extrair
        </Button>
      </div>

      {/* Comparison tabs */}
      <Tabs defaultValue="todos">
        <TabsList>
          <TabsTrigger value="todos">Todos ({comparacao.length})</TabsTrigger>
          <TabsTrigger value="cobertos">Cobertos ({cobertos})</TabsTrigger>
          <TabsTrigger value="descobertos">Descobertos ({descobertos})</TabsTrigger>
          <TabsTrigger value="extra">Só na Apólice ({extraApolice})</TabsTrigger>
        </TabsList>

        {(["todos", "cobertos", "descobertos", "extra"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Status</TableHead>
                    <TableHead>Nome na Apólice</TableHead>
                    <TableHead>Nome no Sistema</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Certificado</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead className="text-right">Prêmio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComparacao
                    .filter((item) => {
                      if (tab === "cobertos") return item.status === "coberto";
                      if (tab === "descobertos") return item.status === "descoberto";
                      if (tab === "extra") return item.status === "extra_apolice";
                      return true;
                    })
                    .map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {item.status === "coberto" && (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          )}
                          {item.status === "descoberto" && (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                          {item.status === "extra_apolice" && (
                            <AlertTriangle className="h-5 w-5 text-warning" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={item.nomeApolice ? "font-medium" : "text-muted-foreground italic"}>
                            {item.nomeApolice || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={item.nomeSistema ? "font-medium" : "text-muted-foreground italic"}>
                            {item.nomeSistema || "— Não encontrado"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.cpf || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.certificado || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.vigenciaInicio && item.vigenciaFim
                            ? `${item.vigenciaInicio} a ${item.vigenciaFim}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.premioSeguro != null
                            ? `R$ ${item.premioSeguro.toFixed(2)}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredComparacao.filter((item) => {
                    if (tab === "cobertos") return item.status === "coberto";
                    if (tab === "descobertos") return item.status === "descoberto";
                    if (tab === "extra") return item.status === "extra_apolice";
                    return true;
                  }).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
