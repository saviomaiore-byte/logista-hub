import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, CartesianGrid } from "recharts";
import { format, startOfMonth, endOfMonth, addMonths, addDays, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type DashboardAlert } from "./AlertCard";

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--destructive))"];

function statusText(dias: number) {
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dias`;
  if (dias === 0) return "Vence hoje";
  return `${dias} dias restantes`;
}

function statusClass(dias: number) {
  if (dias < 0) return "status-danger";
  if (dias <= 15) return "status-warning";
  return "status-success";
}

type PeriodFilter = "30d" | "6m" | "12m";
type ChartPeriod = { label: string; fullLabel: string; from: Date; to: Date; documentos: number };

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPeriod }> }) {
  if (!active || !payload?.length) return null;
  const period = payload[0].payload;

  return (
    <div className="min-w-[116px] rounded-[10px] bg-[#123d48] px-3 py-2.5 text-white shadow-[0_10px_24px_rgba(8,38,45,0.24)]">
      <p className="text-[9px] font-medium leading-tight">{period.fullLabel}</p>
      <p className="mt-1 text-[13px] font-bold leading-tight">{period.documentos} documentos</p>
      <p className="mt-1.5 text-[8px] font-medium text-[#45d2c7]">Clique para visualizar →</p>
    </div>
  );
}

export function DashboardInsights({ documents }: { documents: DashboardAlert[] }) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("6m");
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod | null>(null);

  const chartData = useMemo<ChartPeriod[]>(() => {
    const today = startOfDay(new Date());
    if (periodFilter === "30d") {
      return Array.from({ length: 6 }, (_, index) => {
        const from = addDays(today, index * 6);
        const to = addDays(today, index === 5 ? 30 : index * 6 + 5);
        return {
          label: format(from, "dd/MM"),
          fullLabel: `${format(from, "dd MMM", { locale: ptBR })} – ${format(to, "dd MMM yyyy", { locale: ptBR })}`,
          from,
          to,
          documentos: documents.filter((doc) => isWithinInterval(parseISO(doc.vencimentoISO), { start: from, end: to })).length,
        };
      });
    }

    const length = periodFilter === "6m" ? 6 : 12;
    return Array.from({ length }, (_, index) => {
      const month = startOfMonth(addMonths(today, index));
      const to = endOfMonth(month);
      return {
        label: format(month, "MMM", { locale: ptBR }).replace(".", ""),
        fullLabel: format(month, "MMMM 'de' yyyy", { locale: ptBR }),
        from: month,
        to,
        documentos: documents.filter((doc) => isWithinInterval(parseISO(doc.vencimentoISO), { start: month, end: to })).length,
      };
    });
  }, [documents, periodFilter]);
  const statusData = useMemo(
    () => [
      { name: "Em dia", value: documents.filter((doc) => doc.diasRestantes > 30).length },
      { name: "A vencer", value: documents.filter((doc) => doc.diasRestantes >= 0 && doc.diasRestantes <= 30).length },
      { name: "Vencidos", value: documents.filter((doc) => doc.diasRestantes < 0).length },
    ],
    [documents],
  );
  const selectedDocuments = selectedPeriod
    ? documents.filter((doc) =>
        isWithinInterval(parseISO(doc.vencimentoISO), { start: selectedPeriod.from, end: selectedPeriod.to }),
      )
    : [];

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Vencimentos por período</h2>
              <p className="mt-1 text-xs text-muted-foreground">Quantidade de documentos com vencimento previsto</p>
            </div>
            <div className="flex rounded-xl bg-muted p-1">
              {(["30d", "6m", "12m"] as PeriodFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setPeriodFilter(filter)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium uppercase transition-all ${
                    periodFilter === filter ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ left: -20, right: 12, top: 10 }}
                style={{ cursor: "pointer" }}
                onClick={(state) => {
                  const index = Number((state as { activeTooltipIndex?: number | string } | null)?.activeTooltipIndex);
                  if (Number.isInteger(index) && chartData[index]) setSelectedPeriod(chartData[index]);
                }}
              >
                <defs><linearGradient id="dashboardArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--primary))", strokeDasharray: "4 4" }}
                  content={<ChartTooltip />}
                />
                <Area type="monotone" dataKey="documentos" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#dashboardArea)" activeDot={{ r: 6, cursor: "pointer" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-bold text-foreground">Status documental</h2>
          <p className="mt-1 text-xs text-muted-foreground">Documentos de motoristas monitorados</p>
          <div className="mt-4 grid items-center gap-3 sm:grid-cols-[160px_1fr] xl:grid-cols-1 2xl:grid-cols-[160px_1fr]">
            <div className="relative h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={statusData} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={2}>{statusData.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}</Pie></PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center"><strong className="text-2xl">{documents.length}</strong><span className="text-[11px] text-muted-foreground">documentos</span></div>
            </div>
            <div className="space-y-3">
              {statusData.map((item, index) => <div key={item.name} className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[index] }} /><span className="flex-1 text-muted-foreground">{item.name}</span><strong>{item.value}</strong></div>)}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={!!selectedPeriod} onOpenChange={(open) => !open && setSelectedPeriod(null)}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>Vencimentos de {selectedPeriod?.fullLabel || ""}</DialogTitle>
            <DialogDescription>{selectedDocuments.length} documentos encontrados neste período.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-6">
            <div className="divide-y divide-border">
              {selectedDocuments.map((doc) => (
                <div key={doc.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_90px_110px_auto] sm:items-center">
                  <strong className="text-sm">{doc.motorista}</strong><span className="text-sm text-muted-foreground">{doc.documento}</span><span className="text-sm">{doc.vencimento}</span><span className={`status-badge w-fit ${statusClass(doc.diasRestantes)}`}>{statusText(doc.diasRestantes)}</span>
                </div>
              ))}
              {selectedDocuments.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum vencimento neste mês.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
