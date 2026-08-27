import { describe, it, expect } from "vitest";
import { masks, applyMask } from "@/lib/masks";

describe("masks", () => {
  it("formata CPF", () => {
    expect(masks.cpf("12345678901")).toBe("123.456.789-01");
    expect(masks.cpf("123456789012345")).toBe("123.456.789-01");
    expect(masks.cpf("abc123")).toBe("123");
  });

  it("formata CNPJ", () => {
    expect(masks.cnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("formata telefone fixo e celular", () => {
    expect(masks.telefone("1123456789")).toBe("(11) 2345-6789");
    expect(masks.telefone("11987654321")).toBe("(11) 98765-4321");
  });

  it("applyMask delega para a máscara correta", () => {
    expect(applyMask("12345678901", "cpf")).toBe("123.456.789-01");
  });
});
