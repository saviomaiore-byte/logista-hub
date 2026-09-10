import { describe, it, expect } from "vitest";
import { checkMotoristaAptidao } from "@/lib/aptidao";

const transportadoraOk = {
  antt_numero: "1",
  alvara_numero: "1",
  certificado_numero: "1",
};

const motoristaOk = {
  status: "ativo",
  cnh_vencimento: "2099-01-01",
  mopp_vencimento: "2099-01-01",
  mopp_vitalicio: false,
};

const docsOk = { contrato: true, adesao: true };

/** Simula a derivação de documentos válidos a partir da tabela contratos. */
function derivarDocs(registros: { tipo: string; arquivo_url: string | null; status?: string }[]) {
  return {
    contrato: registros.some((c) => !!c.arquivo_url && c.tipo === "contrato"),
    adesao: registros.some((c) => !!c.arquivo_url && c.tipo === "adesao"),
  };
}

describe("checkMotoristaAptidao", () => {
  it("marca como apto quando tudo está regular", () => {
    const r = checkMotoristaAptidao(motoristaOk, docsOk, transportadoraOk);
    expect(r.apto).toBe(true);
    expect(r.motivos).toEqual([]);
  });

  it("contrato + termo de adesão com arquivo atendem aos documentos obrigatórios", () => {
    const docs = derivarDocs([
      { tipo: "contrato", arquivo_url: "a.pdf", status: "pendente" },
      { tipo: "adesao", arquivo_url: "b.pdf", status: "pendente" },
    ]);
    const r = checkMotoristaAptidao(motoristaOk, docs, transportadoraOk);
    expect(r.apto).toBe(true);
  });

  it("somente contrato → inapto por falta de termo de adesão", () => {
    const docs = derivarDocs([{ tipo: "contrato", arquivo_url: "a.pdf" }]);
    const r = checkMotoristaAptidao(motoristaOk, docs, transportadoraOk);
    expect(r.apto).toBe(false);
    expect(r.motivos).toContain("Sem Termo de Adesão");
    expect(r.motivos).not.toContain("Sem contrato assinado");
  });

  it("somente adesão → inapto por falta de contrato", () => {
    const docs = derivarDocs([{ tipo: "adesao", arquivo_url: "b.pdf" }]);
    const r = checkMotoristaAptidao(motoristaOk, docs, transportadoraOk);
    expect(r.motivos).toContain("Sem contrato assinado");
    expect(r.motivos).not.toContain("Sem Termo de Adesão");
  });

  it("nenhum documento → os dois motivos", () => {
    const r = checkMotoristaAptidao(motoristaOk, derivarDocs([]), transportadoraOk);
    expect(r.motivos).toContain("Sem contrato assinado");
    expect(r.motivos).toContain("Sem Termo de Adesão");
  });

  it("distrato não substitui contrato nem adesão", () => {
    const docs = derivarDocs([{ tipo: "distrato", arquivo_url: "d.pdf" }]);
    expect(docs).toEqual({ contrato: false, adesao: false });
    const r = checkMotoristaAptidao(motoristaOk, docs, transportadoraOk);
    expect(r.motivos).toContain("Sem contrato assinado");
    expect(r.motivos).toContain("Sem Termo de Adesão");
  });

  it("documento sem arquivo_url não conta", () => {
    const docs = derivarDocs([
      { tipo: "contrato", arquivo_url: null },
      { tipo: "adesao", arquivo_url: null },
    ]);
    expect(docs).toEqual({ contrato: false, adesao: false });
  });

  it("status pendente não altera o resultado", () => {
    const docs = derivarDocs([
      { tipo: "contrato", arquivo_url: "a.pdf", status: "pendente" },
      { tipo: "adesao", arquivo_url: "b.pdf", status: "pendente" },
    ]);
    expect(checkMotoristaAptidao(motoristaOk, docs, transportadoraOk).apto).toBe(true);
  });

  it("acumula múltiplos motivos", () => {
    const r = checkMotoristaAptidao(
      { ...motoristaOk, cnh_vencimento: "2020-01-01", mopp_vencimento: "2020-01-01" },
      { contrato: false, adesao: false },
      { antt_numero: null, alvara_numero: "1", certificado_numero: "1" },
    );
    expect(r.motivos).toEqual([
      "Sem contrato assinado",
      "Sem Termo de Adesão",
      "Transportadora sem ANTT",
      "CNH vencida",
      "MOPP vencido",
    ]);
  });

  it("inapto quando a transportadora não tem ANTT, Alvará ou Certificado", () => {
    const r = checkMotoristaAptidao(motoristaOk, docsOk, {
      antt_numero: null,
      alvara_numero: null,
      certificado_numero: null,
    });
    expect(r.motivos).toEqual([
      "Transportadora sem ANTT",
      "Transportadora sem Alvará",
      "Transportadora sem Certificado",
    ]);
  });

  it("inapto com CNH vencida", () => {
    const r = checkMotoristaAptidao(
      { ...motoristaOk, cnh_vencimento: "2020-01-01" },
      true,
      transportadoraOk,
    );
    expect(r.motivos).toContain("CNH vencida");
  });

  it("inapto com MOPP vencido, exceto quando vitalício", () => {
    const vencido = { ...motoristaOk, mopp_vencimento: "2020-01-01" };
    expect(checkMotoristaAptidao(vencido, true, transportadoraOk).motivos).toContain("MOPP vencido");
    expect(
      checkMotoristaAptidao({ ...vencido, mopp_vitalicio: true }, true, transportadoraOk).apto,
    ).toBe(true);
  });

  it("inapto quando o motorista está inativo", () => {
    const r = checkMotoristaAptidao({ ...motoristaOk, status: "inativo" }, true, transportadoraOk);
    expect(r.motivos).toContain("Motorista inativo");
  });

  it("apto quando não há datas de vencimento cadastradas", () => {
    const r = checkMotoristaAptidao(
      { status: "ativo", cnh_vencimento: null, mopp_vencimento: null, mopp_vitalicio: false },
      true,
      transportadoraOk,
    );
    expect(r.apto).toBe(true);
  });
});
