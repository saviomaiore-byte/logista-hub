import { isPast, parseISO } from "date-fns";

export interface MotoristaAptidaoInput {
  status?: string | null;
  cnh_vencimento?: string | null;
  mopp_vencimento?: string | null;
  mopp_vitalicio?: boolean | null;
}

export interface TransportadoraAptidaoInput {
  antt_numero?: string | null;
  alvara_numero?: string | null;
  certificado_numero?: string | null;
}

export interface AptidaoResult {
  apto: boolean;
  motivos: string[];
}

/** Documentos contratuais obrigatórios (ambos com arquivo anexado). */
export interface DocumentosContratuais {
  contrato: boolean;
  adesao: boolean;
}

/**
 * Regras de aptidão do relatório semanal.
 * O motorista é apto quando não há nenhum motivo de inaptidão.
 * `documentos` aceita boolean por compatibilidade (aplica-se aos dois documentos).
 */
export function checkMotoristaAptidao(
  m: MotoristaAptidaoInput,
  documentos: DocumentosContratuais | boolean,
  transportadora: TransportadoraAptidaoInput,
): AptidaoResult {
  const motivos: string[] = [];
  const docs: DocumentosContratuais =
    typeof documentos === "boolean" ? { contrato: documentos, adesao: documentos } : documentos;

  if (!docs.contrato) motivos.push("Sem contrato assinado");
  if (!docs.adesao) motivos.push("Sem Termo de Adesão");
  if (!transportadora?.antt_numero) motivos.push("Transportadora sem ANTT");
  if (!transportadora?.certificado_numero) motivos.push("Transportadora sem Certificado");
  if (m.cnh_vencimento && isPast(parseISO(m.cnh_vencimento))) motivos.push("CNH vencida");
  if (!m.mopp_vitalicio && m.mopp_vencimento && isPast(parseISO(m.mopp_vencimento))) {
    motivos.push("MOPP vencido");
  }
  if (m.status === "inativo") motivos.push("Motorista inativo");

  return { apto: motivos.length === 0, motivos };
}
