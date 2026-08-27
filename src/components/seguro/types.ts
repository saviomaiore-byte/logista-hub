import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Seguro {
  id: string;
  motorista_id: string | null;
  tipo: string;
  seguradora: string;
  numero_apolice: string | null;
  valor_premio: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string | null;
  observacoes: string | null;
  arquivo_url: string | null;
  motoristas?: { nome: string; cpf: string } | null;
}

export interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  status: string | null;
}

export interface Conferencia {
  id: string;
  titulo: string;
  periodo_referencia: string;
  arquivo_apolice_url: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConferenciaItem {
  id: string;
  conferencia_id: string;
  motorista_id: string;
  coberto: boolean;
  seguro_id: string | null;
  observacoes: string | null;
  motoristas?: { nome: string; cpf: string; status: string | null } | null;
}

export const tiposSeguros = ["RC", "APP", "RCF-DC", "RCTR-C", "Vida", "Outro"];

export const initialValues = {
  motorista_id: "",
  tipo: "",
  seguradora: "",
  numero_apolice: "",
  valor_premio: "",
  vigencia_inicio: "",
  vigencia_fim: "",
  status: "ativo",
  observacoes: "",
  arquivo_url: "",
};

export type SeguroFormValues = typeof initialValues;

export const formatVigencia = (data?: string | null) => {
  if (!data) return "-";
  return format(parseISO(data), "dd/MM/yyyy", { locale: ptBR });
};

export const seguroToFormValues = (seguro: Seguro): SeguroFormValues => ({
  motorista_id: seguro.motorista_id || "",
  tipo: seguro.tipo,
  seguradora: seguro.seguradora,
  numero_apolice: seguro.numero_apolice || "",
  valor_premio: seguro.valor_premio?.toString() || "",
  vigencia_inicio: seguro.vigencia_inicio || "",
  vigencia_fim: seguro.vigencia_fim || "",
  status: seguro.status || "ativo",
  observacoes: seguro.observacoes || "",
  arquivo_url: seguro.arquivo_url || "",
});

export const formValuesToPayload = (data: SeguroFormValues) => ({
  motorista_id: data.motorista_id || null,
  tipo: data.tipo,
  seguradora: data.seguradora,
  numero_apolice: data.numero_apolice || null,
  valor_premio: data.valor_premio ? parseFloat(data.valor_premio) : null,
  vigencia_inicio: data.vigencia_inicio || null,
  vigencia_fim: data.vigencia_fim || null,
  status: data.status,
  observacoes: data.observacoes || null,
  arquivo_url: data.arquivo_url || null,
});
