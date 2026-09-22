import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reportDbError } from "@/lib/dbError";

type AuditData = Record<string, unknown>;

type AuditRow = {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: unknown;
  new_data: unknown;
  user_id: string | null;
  created_at: string | null;
};

export type RecentActivity = {
  id: string;
  type: "contrato" | "cadastro" | "documento" | "cobranca";
  title: string;
  description: string;
  time: string;
  createdAt: string;
};

const tableLabels: Record<string, [string, RecentActivity["type"]]> = {
  transportadores: ["Transportadora", "cadastro"],
  motoristas: ["Motorista", "cadastro"],
  contratos: ["Contrato", "contrato"],
  seguros: ["Seguro", "documento"],
  certificados: ["Certificado", "documento"],
  documentos_empresa: ["Documento", "documento"],
  boletos: ["Boleto", "cobranca"],
  pronampe: ["Pronampe", "cobranca"],
  pins_confins: ["PIS/COFINS", "cobranca"],
  cavalos: ["Cavalo", "cadastro"],
  reboques: ["Reboque", "cadastro"],
  registros_antt: ["Registro ANTT", "cadastro"],
  motorista_arquivos: ["Arquivo de motorista", "documento"],
  transportador_arquivos: ["Arquivo de transportadora", "documento"],
  transportador_motoristas: ["Vínculo de motorista", "cadastro"],
  conferencia_seguros: ["Conferência de seguro", "documento"],
  conferencia_seguros_itens: ["Item de conferência", "documento"],
  conferencia_seguros_extraidos: ["Documento conferido", "documento"],
};

const actionLabels: Record<string, string> = {
  INSERT: "cadastrado",
  UPDATE: "atualizado",
  DELETE: "excluído",
  EMAIL_SENT: "enviado",
};

function asData(value: unknown): AuditData {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AuditData)
    : {};
}

function entityName(data: AuditData) {
  const candidates = [
    data.razao_social,
    data.nome,
    data.empresa,
    data.modelo,
    data.tipo,
    data.placa,
    data.descricao,
  ];
  const name = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof name === "string" ? name : null;
}

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function belongsToTransportador(row: AuditRow, transportadorId: string) {
  const current = asData(row.new_data);
  const previous = asData(row.old_data);
  return (
    (row.table_name === "transportadores" && row.record_id === transportadorId) ||
    current.transportador_id === transportadorId ||
    previous.transportador_id === transportadorId
  );
}

function formatActivity(row: AuditRow): RecentActivity {
  const data = asData(row.new_data ?? row.old_data);
  const [entity, type] = tableLabels[row.table_name] || ["Registro", "documento"];
  const action = actionLabels[row.action] || row.action.toLowerCase();
  const name = entityName(data);

  return {
    id: row.id,
    type,
    title: `${entity} ${action}`,
    description: name
      ? `${name} teve seus dados ${action === "cadastrado" ? "incluídos" : action}.`
      : `Uma movimentação foi registrada em ${entity.toLowerCase()}.`,
    time: row.created_at ? relativeTime(row.created_at) : "—",
    createdAt: row.created_at || "",
  };
}

export function useAtividadesRecentes(options?: {
  limit?: number;
  transportadorId?: string;
}) {
  const limit = options?.limit ?? 6;
  const transportadorId = options?.transportadorId;

  return useQuery({
    queryKey: ["audit-log", "recentes", limit, transportadorId || "todas"],
    queryFn: async () => {
      const fetchLimit = transportadorId ? 200 : limit;
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, table_name, record_id, action, old_data, new_data, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

      if (reportDbError("carregar atividades recentes", error)) throw error;

      const rows = (data || []) as AuditRow[];
      return rows
        .filter((row) => !transportadorId || belongsToTransportador(row, transportadorId))
        .slice(0, limit)
        .map(formatActivity);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
