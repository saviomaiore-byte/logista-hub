import { describe, expect, it } from "vitest";
import { calcularDashboardStats } from "@/lib/dashboardStats";

const transportadores = [
  { id: "t1", status: "ativo", situacao_operacional: "em praça apto", antt_numero: "1", certificado_numero: "1" },
  { id: "t2", status: "ativo", situacao_operacional: "inapto" },
  { id: "t3", status: "inativo" },
];
const motoristas = [
  { id: "m1", status: "ativo", mopp_vitalicio: true },
  { id: "m2", status: "inativo" },
  { id: "m3", status: "ativo" },
  { id: "m4", status: "pendente" },
];
const vinculos = [
  { motorista_id: "m1", transportador_id: "t1", motorista_proprio: true },
  { motorista_id: "m1", transportador_id: "t2", motorista_proprio: true },
  { motorista_id: "m2", transportador_id: "t1", motorista_proprio: true },
  { motorista_id: "m3", transportador_id: "t3", motorista_proprio: true },
];

describe("indicadores do dashboard", () => {
  it("conta todos os cadastros e cada motorista uma vez, mesmo com múltiplos vínculos", () => {
    expect(calcularDashboardStats(transportadores, motoristas, vinculos, [])).toEqual({
      transportadores: 3, transportadoresAtivos: 2, transportadoresAptos: 1, transportadoresInaptos: 1,
      motoristas: 4, motoristasAtivos: 2, motoristasInativos: 1, motoristasAptos: 1, motoristasInaptos: 0,
      motoristasSemVinculoAtivo: 1,
    });
  });
  it("não transforma ausência de vínculo em inaptidão e ignora vínculos órfãos", () => {
    const stats = calcularDashboardStats(transportadores, motoristas, [
      { motorista_id: "ausente", transportador_id: "t1" },
      { motorista_id: "m1", transportador_id: "ausente" },
    ], []);
    expect(stats.motoristasSemVinculoAtivo).toBe(2);
    expect(stats.motoristasAptos).toBe(0);
    expect(stats.motoristasInaptos).toBe(0);
  });
  it("separa motorista inativo dos inaptos por pendências", () => {
    const stats = calcularDashboardStats(transportadores, motoristas, vinculos, []);
    expect(stats.motoristasInativos).toBe(1);
    expect(stats.motoristasInaptos).toBe(0);

    const comPendencia = calcularDashboardStats(
      transportadores,
      motoristas,
      [{ motorista_id: "m3", transportador_id: "t1", motorista_proprio: false }],
      [],
    );
    expect(comPendencia.motoristasInativos).toBe(1);
    expect(comPendencia.motoristasInaptos).toBe(1);
  });
  it("mantém exigência de contrato e adesão para motorista não próprio", () => {
    const links = [{ motorista_id: "m1", transportador_id: "t1" }];
    const docs = [{ motorista_id: "m1", tipo: "contrato", arquivo_url: "contrato.pdf" }];
    expect(calcularDashboardStats(transportadores, motoristas, links, docs).motoristasInaptos).toBe(1);
    expect(calcularDashboardStats(transportadores, motoristas, links, [
      ...docs, { motorista_id: "m1", tipo: "adesao", arquivo_url: "adesao.pdf" },
    ]).motoristasAptos).toBe(1);
  });
  it("retorna zeros quando não há cadastros", () => {
    expect(Object.values(calcularDashboardStats([], [], [], [])).every(value => value === 0)).toBe(true);
  });
});
