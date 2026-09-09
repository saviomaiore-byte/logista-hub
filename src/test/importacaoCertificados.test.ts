import { describe, it, expect } from "vitest";
import {
  analisarImportacao,
  parseDataBR,
  parsePlanilhaCertificados,
  somenteNumeros,
  montarPayloadImportacao,
  alteracoesDeRegime,
  regimeOficial,
} from "@/lib/importacaoCertificados";

const CSV = [
  ";;;;;;",
  "elcim;CNPJ;Regime de Tributação;Renovação;Vencimento;STATUS;OBSERVAÇÕES",
  "A.F. Januário Transportes;15.873.299/0001-66;LUCRO PRESUMIDO;18/05/2026;18/05/2027;OK;",
  "Adalberto de Souza;57.396.373/0001-40;MEI CAMINHONEIRO;25/09/2025;25/09/2026;OK;",
  "Sem Cadastro;11.111.111/0001-11;SIMPLES NACIONAL;01/01/2026;01/01/2027;OK;",
  "Data Ruim;22.222.222/0001-22;MEI;01/01/2026;xx;OK;",
  ";;;;;;",
].join("\r\n");

const transportadoras = [
  {
    id: "1",
    razao_social: "ALEXANDRE FERNANDO JANUÁRIO - A.F TRANSPORTES",
    cpf_cnpj: "15.873.299/0001-66",
    inscricao_estadual: "Lucro presumido",
  },
  { id: "2", razao_social: "ADALBERTO DE SOUZA", cpf_cnpj: "57.396.373/0001-40", inscricao_estadual: "Simples nacional" },
  { id: "3", razao_social: "DATA RUIM LTDA", cpf_cnpj: "22.222.222/0001-22", inscricao_estadual: null },
];

const certificados = [
  { id: "c1", empresa: "ALEXANDRE FERNANDO JANUÁRIO - A.F TRANSPORTES", vencimento: "2027-05-18" },
  { id: "c2", empresa: "ADALBERTO DE SOUZA", vencimento: "2025-01-10" },
];

describe("importacaoCertificados", () => {
  it("converte datas brasileiras sem timezone", () => {
    expect(parseDataBR("18/05/2027")).toBe("2027-05-18");
    expect(parseDataBR("1/2/2026")).toBe("2026-02-01");
    expect(parseDataBR("xx")).toBeNull();
  });

  it("normaliza CNPJ para números", () => {
    expect(somenteNumeros("15.873.299/0001-66 ")).toBe("15873299000166");
  });

  it("lê o CSV ignorando linha vazia inicial e finais", () => {
    const linhas = parsePlanilhaCertificados(CSV);
    expect(linhas).toHaveLength(4);
    expect(linhas[0].empresa).toBe("A.F. Januário Transportes");
    expect(linhas[0].vencimento).toBe("2027-05-18");
  });

  it("classifica pela correspondência de CNPJ", () => {
    const { linhas, resumo } = analisarImportacao(
      parsePlanilhaCertificados(CSV),
      transportadoras,
      certificados,
    );

    expect(linhas[0].classificacao).toBe("ja_existente");
    expect(linhas[0].transportadoraEncontrada).toBe("ALEXANDRE FERNANDO JANUÁRIO - A.F TRANSPORTES");

    // vencimento diferente => novo, com aviso e divergência de regime
    expect(linhas[1].classificacao).toBe("novo");
    expect(linhas[1].regimeDivergente).toBe(true);
    expect(linhas[1].avisos.some((a) => a.includes("vencimento diferente"))).toBe(true);

    expect(linhas[2].classificacao).toBe("transportadora_nao_encontrada");
    expect(linhas[3].classificacao).toBe("requer_revisao");

    expect(resumo.total).toBe(4);
    expect(resumo.jaExistentes).toBe(1);
    expect(resumo.novos).toBe(1);
  });

  it("marca duplicidade de CNPJ dentro da planilha", () => {
    const dup = [
      "Empresa;CNPJ;Regime de Tributação;Renovação;Vencimento;STATUS;OBSERVAÇÕES",
      "Adalberto;57.396.373/0001-40;MEI CAMINHONEIRO;25/09/2025;25/09/2026;OK;",
      "Adalberto 2;57.396.373/0001-40;MEI CAMINHONEIRO;25/09/2025;25/09/2028;OK;",
    ].join("\n");
    const { linhas, resumo } = analisarImportacao(parsePlanilhaCertificados(dup), transportadoras, certificados);
    expect(linhas.every((l) => l.classificacao === "requer_revisao")).toBe(true);
    expect(resumo.duplicidadesPlanilha).toBe(2);
  });
});

describe("importacaoCertificados — etapa 2", () => {
  const linhas = parsePlanilhaCertificados(CSV);
  const analise = analisarImportacao(linhas, transportadoras, certificados);

  it("monta payload somente com linhas novas e sem empresa/tipo do navegador", () => {
    const payload = montarPayloadImportacao(analise);
    expect(payload.length).toBe(analise.resumo.novos);
    for (const item of payload) {
      expect(Object.keys(item).sort()).toEqual(
        ["cnpj", "observacoes", "regime", "renovacao", "status", "vencimento"],
      );
      expect(item.cnpj).toMatch(/^\d{14}$/);
    }
  });

  it("converte o regime da planilha para o valor oficial", () => {
    expect(regimeOficial("MEI CAMINHONEIRO")).toBe("MEI caminhoneiro");
    expect(regimeOficial("Lucro Presumido")).toBe("Lucro presumido");
    expect(regimeOficial("MEI")).toBeNull();
  });

  it("classifica regime fora da lista oficial como requer revisão", () => {
    const linha = analise.linhas.find((l) => l.cnpjNumeros === "22222222000122");
    expect(linha?.classificacao).toBe("requer_revisao");
  });

  it("lista somente alterações de regime das linhas elegíveis", () => {
    const alteracoes = alteracoesDeRegime(analise);
    expect(alteracoes.every((a) => a.transportadora && a.novo)).toBe(true);
    expect(alteracoes.some((a) => a.novo === "MEI caminhoneiro")).toBe(true);
  });

  it("classifica status desconhecido como requer revisão", () => {
    const csv = [
      "elcim;CNPJ;Regime de Tributação;Renovação;Vencimento;STATUS;OBSERVAÇÕES",
      "Adalberto de Souza;57.396.373/0001-40;MEI CAMINHONEIRO;25/09/2025;25/09/2026;PENDENTE;",
    ].join("\r\n");
    const res = analisarImportacao(parsePlanilhaCertificados(csv), transportadoras, certificados);
    expect(res.linhas[0].classificacao).toBe("requer_revisao");
  });
});
