import { isPast, parseISO } from "date-fns";

export interface MotoristaAptidaoInput {
  nome?: string | null;
  status?: string | null;
  cnh_vencimento?: string | null;
  mopp_vencimento?: string | null;
  mopp_vitalicio?: boolean | null;
}

export interface TransportadoraAptidaoInput {
  razao_social?: string | null;
  antt_numero?: string | null;
  alvara_numero?: string | null;
  certificado_numero?: string | null;
}

/** Sufixos societários ignorados na comparação nome ↔ razão social. */
const SUFIXOS_SOCIETARIOS = ["me", "mei", "epp", "eireli", "ltda", "sa", "s a", "eirelli"];

function normalizarNome(valor?: string | null): string {
  if (!valor) return "";
  let base = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  // Remove sufixos societários no final (podem estar encadeados: "... ltda me").
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const sufixo of SUFIXOS_SOCIETARIOS) {
      if (base === sufixo) continue;
      if (base.endsWith(` ${sufixo}`)) {
        base = base.slice(0, -(sufixo.length + 1)).trim();
        mudou = true;
      }
    }
  }

  return base;
}

/**
 * Identifica o caso especial "motorista que também é a transportadora avaliada".
 * Comparação por igualdade exata após normalização (sem correspondência parcial
 * ou aproximada). Nomes vazios nunca ativam a exceção.
 */
export function isMotoristaProprioTransportador(
  nomeMotorista?: string | null,
  razaoSocial?: string | null,
): boolean {
  const a = normalizarNome(nomeMotorista);
  const b = normalizarNome(razaoSocial);
  if (!a || !b) return false;
  return a === b;
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

  // Exceção: quando o motorista é a própria transportadora avaliada, Contrato e
  // Termo de Adesão não são exigidos. Vale apenas para essa transportadora.
  const proprioTransportador = isMotoristaProprioTransportador(
    m.nome,
    transportadora?.razao_social,
  );

  if (!proprioTransportador) {
    if (!docs.contrato) motivos.push("Sem contrato assinado");
    if (!docs.adesao) motivos.push("Sem Termo de Adesão");
  }
  if (!transportadora?.antt_numero) motivos.push("Transportadora sem ANTT");
  if (!transportadora?.certificado_numero) motivos.push("Transportadora sem Certificado");
  if (m.cnh_vencimento && isPast(parseISO(m.cnh_vencimento))) motivos.push("CNH vencida");
  if (!m.mopp_vitalicio && m.mopp_vencimento && isPast(parseISO(m.mopp_vencimento))) {
    motivos.push("MOPP vencido");
  }
  if (m.status === "inativo") motivos.push("Motorista inativo");

  return { apto: motivos.length === 0, motivos };
}
