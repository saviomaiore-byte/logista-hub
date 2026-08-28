import { format, isPast, parseISO } from "date-fns";
import { MapPin, Navigation, Clock } from "lucide-react";

export interface TransportadorComMotoristas {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
  status: string;
  situacao_operacional: string | null;
  antt_numero: string | null;
  alvara_numero: string | null;
  certificado_numero: string | null;
  motoristas: MotoristaRelatorio[];
}

export interface MotoristaRelatorio {
  id: string;
  nome: string;
  cpf: string;
  status: string | null;
  cnh_numero: string | null;
  cnh_vencimento: string | null;
  mopp_numero: string | null;
  mopp_vencimento: string | null;
  mopp_vitalicio: boolean;
  tem_contrato: boolean;
  motivos_inaptidao: string[];
  apto: boolean;
}

export const SITUACAO_LABELS: Record<string, string> = {
  em_praca_apto: "Em Praça - Apto",
  em_viagem_apto: "Em Viagem - Apto",
  inapto: "Inapto",
  em_praca: "Em Praça - Apto",
  em_viagem: "Em Viagem - Apto",
};

export const SITUACAO_ICONS: Record<string, typeof MapPin> = {
  em_praca_apto: MapPin,
  em_viagem_apto: Navigation,
  inapto: Clock,
  em_praca: MapPin,
  em_viagem: Navigation,
};

export const DIAS_SEMANA = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

export function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return format(parseISO(d), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

export function docStatus(vencimento: string | null, numero: string | null) {
  if (!numero && !vencimento) return { label: "Não cadastrado", variant: "secondary" as const };
  if (!vencimento) return { label: "Sem validade", variant: "secondary" as const };
  if (isPast(parseISO(vencimento))) return { label: "Vencido", variant: "destructive" as const };
  return { label: "Regular", variant: "default" as const };
}
