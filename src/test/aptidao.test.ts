// @vitest-environment node
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

describe("checkMotoristaAptidao", () => {
  it("marca como apto quando tudo está regular", () => {
    const r = checkMotoristaAptidao(motoristaOk, true, transportadoraOk);
    expect(r.apto).toBe(true);
    expect(r.motivos).toEqual([]);
  });

  it("inapto sem contrato assinado", () => {
    const r = checkMotoristaAptidao(motoristaOk, false, transportadoraOk);
    expect(r.apto).toBe(false);
    expect(r.motivos).toContain("Sem contrato assinado");
  });

  it("inapto quando a transportadora não tem ANTT, Alvará ou Certificado", () => {
    const r = checkMotoristaAptidao(motoristaOk, true, {
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
