import { useMemo, useState } from "react";
import { Archive, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDateOnly } from "@/lib/utils";
import type { DashboardAlert } from "./AlertCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendencias: DashboardAlert[];
  onArquivar?: (alert: DashboardAlert) => void;
}

const getStatusColor = (dias: number) => {
  if (dias < 0) return "status-danger";
  if (dias <= 15) return "status-warning";
  return "status-success";
};

const getStatusText = (dias: number) => {
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dias`;
  if (dias === 0) return "Vence hoje";
  return `${dias} dias restantes`;
};

const formatName = (name: string) =>
  name
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)(\S)/g, (_, space, letter) => `${space}${letter.toLocaleUpperCase("pt-BR")}`);

type StatusFiltro = "todos" | "vencidos" | "hoje" | "proximos";
type PeriodoFiltro = "todos" | "30" | "60" | "90" | "180";
type Ordenacao = "urgencia" | "vencimento_asc" | "vencimento_desc" | "nome";

export function TodasPendenciasDialog({ open, onOpenChange, pendencias, onArquivar }: Props) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<string>("todos");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("urgencia");

  const tipos = useMemo(
    () => Array.from(new Set(pendencias.map((p) => p.documento))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [pendencias],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const grupo = (dias: number) => (dias >= 0 ? 0 : 1);

    const filtrada = pendencias.filter((p) => {
      if (termo && !p.motorista.toLocaleLowerCase("pt-BR").includes(termo)) return false;
      if (tipo !== "todos" && p.documento !== tipo) return false;
      if (status === "vencidos" && p.diasRestantes >= 0) return false;
      if (status === "hoje" && p.diasRestantes !== 0) return false;
      if (status === "proximos" && p.diasRestantes <= 0) return false;
      if (periodo !== "todos" && Math.abs(p.diasRestantes) > Number(periodo)) return false;
      return true;
    });

    return filtrada.sort((a, b) => {
      if (ordenacao === "nome") return a.motorista.localeCompare(b.motorista, "pt-BR");
      if (ordenacao === "vencimento_asc") return a.vencimentoISO.localeCompare(b.vencimentoISO);
      if (ordenacao === "vencimento_desc") return b.vencimentoISO.localeCompare(a.vencimentoISO);
      const ga = grupo(a.diasRestantes);
      const gb = grupo(b.diasRestantes);
      if (ga !== gb) return ga - gb;
      return ga === 0 ? a.diasRestantes - b.diasRestantes : b.diasRestantes - a.diasRestantes;
    });
  }, [pendencias, busca, tipo, status, periodo, ordenacao]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Todas as pendências</DialogTitle>
          <DialogDescription>
            Todas as pendências abertas, inclusive as vencidas há mais de 60 dias.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome"
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFiltro)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="vencidos">Vencidos</SelectItem>
              <SelectItem value="hoje">Vence hoje</SelectItem>
              <SelectItem value="proximos">A vencer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Qualquer período</SelectItem>
              <SelectItem value="30">Até 30 dias</SelectItem>
              <SelectItem value="60">Até 60 dias</SelectItem>
              <SelectItem value="90">Até 90 dias</SelectItem>
              <SelectItem value="180">Até 180 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as Ordenacao)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgencia">Mais urgentes primeiro</SelectItem>
              <SelectItem value="vencimento_asc">Vencimento (mais antigo)</SelectItem>
              <SelectItem value="vencimento_desc">Vencimento (mais recente)</SelectItem>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          {lista.length} de {pendencias.length} pendências
        </p>

        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma pendência encontrada com os filtros aplicados.
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {lista.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{formatName(p.motorista)}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.documento} • Venc: {formatDateOnly(p.vencimentoISO)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "status-badge w-fit shrink-0 gap-1 text-[10px]",
                      getStatusColor(p.diasRestantes),
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {getStatusText(p.diasRestantes)}
                  </span>
                  {onArquivar && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      title="Arquivar pendência"
                      onClick={() => onArquivar(p)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
