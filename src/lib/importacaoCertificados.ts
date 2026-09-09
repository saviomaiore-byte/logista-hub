/**
 * Etapa 1 da importação de Certificados Digitais: leitura e análise SOMENTE LEITURA.
 * Nenhuma função aqui grava dados — apenas interpreta o CSV e classifica cada linha.
 */

export type ClassificacaoImportacao =
  | "ja_existente"
  | "novo"
  | "transportadora_nao_encontrada"
  | "requer_revisao";

export interface LinhaPlanilha {
  linha: number;
  empresa: string;
  cnpjExibicao: string;
  cnpjNumeros: string;
  regime: string;
  renovacao: string | null; // YYYY-MM-DD
  renovacaoOriginal: string;
  vencimento: string | null; // YYYY-MM-DD
  vencimentoOriginal: string;
  status: string;
  observacoes: string;
}

export interface TransportadoraLike {
  id: string;
  razao_social: string;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
}

export interface CertificadoLike {
  id: string;
  empresa: string;
  vencimento: string;
}

export interface ResultadoLinha extends LinhaPlanilha {
  classificacao: ClassificacaoImportacao;
  motivos: string[];
  avisos: string[];
  transportadoraEncontrada: string | null;
  regimeCadastrado: string | null;
  regimeDivergente: boolean;
  /** Regime da planilha convertido para o valor oficial do sistema (null quando ausente/inválido). */
  regimeConvertido: string | null;
}

export interface ResumoImportacao {
  total: number;
  jaExistentes: number;
  novos: number;
  transportadorasNaoEncontradas: number;
  requerRevisao: number;
  duplicidadesPlanilha: number;
}

export interface AnaliseImportacao {
  linhas: ResultadoLinha[];
  resumo: ResumoImportacao;
}

const REGIMES_OFICIAIS: Record<string, string> = {
  "simples nacional": "Simples nacional",
  "lucro presumido": "Lucro presumido",
  "lucro real": "Lucro real",
  "mei caminhoneiro": "MEI caminhoneiro",
};

const STATUS_PLANILHA_VALIDOS = ["ok", "vencido"];

/** Converte o regime da planilha no valor oficial do sistema, ou null quando não reconhecido. */
export const regimeOficial = (valor: string): string | null =>
  REGIMES_OFICIAIS[normalizarTexto(valor)] ?? null;


/** Normaliza texto: minúsculas, sem acentos, sem espaços extras. */
export const normalizarTexto = (valor: string): string =>
  valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const somenteNumeros = (valor: string): string => valor.replace(/\D/g, "");

/** Converte dd/MM/yyyy em YYYY-MM-DD por manipulação de string (sem Date/timezone). */
export const parseDataBR = (valor: string): string | null => {
  const texto = (valor || "").trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
  if (!match) return null;
  const [, d, m, a] = match;
  const dia = Number(d);
  const mes = Number(m);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${a}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
};

/** Decodifica o arquivo tentando UTF-8 e caindo para ISO-8859-1 quando há caracteres inválidos. */
export const decodificarCsv = (buffer: ArrayBuffer): string => {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("iso-8859-1").decode(buffer);
  }
  return utf8;
};

const dividirLinha = (linha: string, separador: string): string[] => {
  const campos: string[] = [];
  let atual = "";
  let dentroAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (c === separador && !dentroAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
};

const detectarSeparador = (texto: string): string => {
  const amostra = texto.split(/\r?\n/).slice(0, 10).join("\n");
  const ponto = (amostra.match(/;/g) || []).length;
  const virgula = (amostra.match(/,/g) || []).length;
  return ponto >= virgula ? ";" : ",";
};

const CABECALHOS = {
  cnpj: ["cnpj", "cpf/cnpj", "cpf cnpj"],
  regime: ["regime de tributacao", "regime tributario", "regime"],
  renovacao: ["renovacao", "data de renovacao"],
  vencimento: ["vencimento", "data de vencimento", "validade"],
  status: ["status", "situacao"],
  observacoes: ["observacoes", "observacao", "obs"],
};

const acharColuna = (cabecalho: string[], nomes: string[]): number =>
  cabecalho.findIndex((c) => nomes.includes(normalizarTexto(c)));

export class ErroPlanilha extends Error {}

/** Lê o CSV, localizando a linha de cabeçalho real e ignorando linhas vazias. */
export const parsePlanilhaCertificados = (texto: string): LinhaPlanilha[] => {
  const separador = detectarSeparador(texto);
  const brutas = texto.split(/\r?\n/);

  let indiceCabecalho = -1;
  let cabecalho: string[] = [];
  for (let i = 0; i < Math.min(brutas.length, 20); i++) {
    const campos = dividirLinha(brutas[i], separador);
    if (acharColuna(campos, CABECALHOS.cnpj) >= 0 && acharColuna(campos, CABECALHOS.vencimento) >= 0) {
      indiceCabecalho = i;
      cabecalho = campos;
      break;
    }
  }

  if (indiceCabecalho < 0) {
    throw new ErroPlanilha(
      "Não foi possível identificar o cabeçalho da planilha. Esperado colunas de CNPJ e Vencimento.",
    );
  }

  const idxCnpj = acharColuna(cabecalho, CABECALHOS.cnpj);
  const idxRegime = acharColuna(cabecalho, CABECALHOS.regime);
  const idxRenovacao = acharColuna(cabecalho, CABECALHOS.renovacao);
  const idxVencimento = acharColuna(cabecalho, CABECALHOS.vencimento);
  const idxStatus = acharColuna(cabecalho, CABECALHOS.status);
  const idxObs = acharColuna(cabecalho, CABECALHOS.observacoes);
  // A primeira coluna contém o nome da empresa, mesmo quando o rótulo do cabeçalho é inconsistente.
  const idxEmpresa = 0;

  const linhas: LinhaPlanilha[] = [];
  for (let i = indiceCabecalho + 1; i < brutas.length; i++) {
    const bruta = brutas[i];
    const campos = dividirLinha(bruta, separador);
    if (campos.every((c) => c === "")) continue;

    const empresa = (campos[idxEmpresa] ?? "").trim();
    const cnpjBruto = (idxCnpj >= 0 ? campos[idxCnpj] ?? "" : "").trim();
    if (!empresa && !somenteNumeros(cnpjBruto)) continue;

    const renovacaoOriginal = (idxRenovacao >= 0 ? campos[idxRenovacao] ?? "" : "").trim();
    const vencimentoOriginal = (idxVencimento >= 0 ? campos[idxVencimento] ?? "" : "").trim();

    linhas.push({
      linha: i + 1,
      empresa,
      cnpjExibicao: cnpjBruto,
      cnpjNumeros: somenteNumeros(cnpjBruto),
      regime: (idxRegime >= 0 ? campos[idxRegime] ?? "" : "").trim(),
      renovacao: parseDataBR(renovacaoOriginal),
      renovacaoOriginal,
      vencimento: parseDataBR(vencimentoOriginal),
      vencimentoOriginal,
      status: (idxStatus >= 0 ? campos[idxStatus] ?? "" : "").trim(),
      observacoes: (idxObs >= 0 ? campos[idxObs] ?? "" : "").trim(),
    });
  }

  return linhas;
};

/**
 * Classifica cada linha da planilha contra os dados atuais.
 * Correspondência obrigatória: CNPJ da planilha → transportadores.cpf_cnpj →
 * razão social encontrada → certificados.empresa. Nunca por nome da planilha.
 */
export const analisarImportacao = (
  linhas: LinhaPlanilha[],
  transportadoras: TransportadoraLike[],
  certificados: CertificadoLike[],
): AnaliseImportacao => {
  const porCnpj = new Map<string, TransportadoraLike[]>();
  for (const t of transportadoras) {
    const chave = somenteNumeros(t.cpf_cnpj || "");
    if (!chave) continue;
    const lista = porCnpj.get(chave) || [];
    lista.push(t);
    porCnpj.set(chave, lista);
  }

  const certPorEmpresa = new Map<string, CertificadoLike[]>();
  for (const c of certificados) {
    const chave = normalizarTexto(c.empresa);
    const lista = certPorEmpresa.get(chave) || [];
    lista.push(c);
    certPorEmpresa.set(chave, lista);
  }

  const contagemCnpjPlanilha = new Map<string, number>();
  for (const l of linhas) {
    if (!l.cnpjNumeros) continue;
    contagemCnpjPlanilha.set(l.cnpjNumeros, (contagemCnpjPlanilha.get(l.cnpjNumeros) || 0) + 1);
  }

  const resultados: ResultadoLinha[] = linhas.map((linha) => {
    const motivos: string[] = [];
    const avisos: string[] = [];
    let classificacao: ClassificacaoImportacao;
    let transportadoraEncontrada: string | null = null;
    let regimeCadastrado: string | null = null;
    let regimeDivergente = false;

    const duplicadaNaPlanilha = (contagemCnpjPlanilha.get(linha.cnpjNumeros) || 0) > 1;
    if (duplicadaNaPlanilha) {
      avisos.push("Possível duplicidade na planilha");
    }

    const cnpjValido = linha.cnpjNumeros.length === 14;
    const correspondencias = cnpjValido ? porCnpj.get(linha.cnpjNumeros) || [] : [];

    let regimeConvertido: string | null = null;
    const statusValido = !linha.status || STATUS_PLANILHA_VALIDOS.includes(normalizarTexto(linha.status));
    const regimeInvalido = Boolean(linha.regime) && regimeOficial(linha.regime) === null;

    if (correspondencias.length === 1) {
      const t = correspondencias[0];
      transportadoraEncontrada = t.razao_social;
      regimeCadastrado = t.inscricao_estadual || null;

      if (linha.regime) {
        regimeConvertido = regimeOficial(linha.regime);
        if (!regimeConvertido) {
          motivos.push(`Regime "${linha.regime}" não está na lista oficial`);
        } else if (normalizarTexto(regimeCadastrado || "") !== normalizarTexto(regimeConvertido)) {
          regimeDivergente = true;
          avisos.push("Regime diferente — requer atualização");
        }
      }
    }

    if (!cnpjValido) {
      classificacao = "requer_revisao";
      motivos.push(linha.cnpjNumeros ? "CNPJ inválido na planilha" : "CNPJ ausente na planilha");
    } else if (correspondencias.length > 1) {
      classificacao = "requer_revisao";
      motivos.push("CNPJ corresponde a mais de uma transportadora cadastrada");
    } else if (correspondencias.length === 0) {
      classificacao = "transportadora_nao_encontrada";
      motivos.push("Nenhuma transportadora cadastrada com este CNPJ");
    } else if (!linha.vencimento) {
      classificacao = "requer_revisao";
      motivos.push(
        linha.vencimentoOriginal
          ? `Data de vencimento inválida ("${linha.vencimentoOriginal}")`
          : "Data de vencimento ausente",
      );
    } else if (linha.renovacaoOriginal && !linha.renovacao) {
      classificacao = "requer_revisao";
      motivos.push(`Data de renovação inválida ("${linha.renovacaoOriginal}")`);
    } else if (!statusValido) {
      classificacao = "requer_revisao";
      motivos.push(`Situação "${linha.status}" não é reconhecida pelo sistema`);
    } else if (regimeInvalido) {
      classificacao = "requer_revisao";
    } else if (duplicadaNaPlanilha) {
      classificacao = "requer_revisao";
      motivos.push("Mesmo CNPJ aparece mais de uma vez na planilha");
    } else {
      const existentes = certPorEmpresa.get(normalizarTexto(transportadoraEncontrada || "")) || [];
      const mesmoVencimento = existentes.find((c) => (c.vencimento || "").slice(0, 10) === linha.vencimento);

      if (mesmoVencimento) {
        classificacao = "ja_existente";
        motivos.push("Já existe certificado desta transportadora com o mesmo vencimento");
      } else {
        classificacao = "novo";
        motivos.push("Transportadora localizada pelo CNPJ e sem certificado com este vencimento");
        if (existentes.length > 0) {
          avisos.push(
            "Já existe outro certificado desta transportadora com vencimento diferente — conferir antes de importar",
          );
        }
        avisos.push("Será importado com tipo A1");
      }
    }
    return {
      ...linha,
      classificacao,
      motivos,
      avisos,
      transportadoraEncontrada,
      regimeCadastrado,
      regimeDivergente,
      regimeConvertido,
    };

  });

  const resumo: ResumoImportacao = {
    total: resultados.length,
    jaExistentes: resultados.filter((r) => r.classificacao === "ja_existente").length,
    novos: resultados.filter((r) => r.classificacao === "novo").length,
    transportadorasNaoEncontradas: resultados.filter(
      (r) => r.classificacao === "transportadora_nao_encontrada",
    ).length,
    requerRevisao: resultados.filter((r) => r.classificacao === "requer_revisao").length,
    duplicidadesPlanilha: resultados.filter((r) => r.avisos.includes("Possível duplicidade na planilha")).length,
  };

  return { linhas: resultados, resumo };
};

export const LABEL_CLASSIFICACAO: Record<ClassificacaoImportacao, string> = {
  ja_existente: "Já existente",
  novo: "Novo - pronto para importação",
  transportadora_nao_encontrada: "Transportadora não encontrada",
  requer_revisao: "Requer revisão",
};
