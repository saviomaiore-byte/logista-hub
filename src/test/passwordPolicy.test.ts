import { describe, it, expect } from "vitest";
import { validatePassword } from "@/lib/passwordPolicy";

describe("validatePassword", () => {
  it("aceita senha forte", () => {
    expect(validatePassword("Pactum@2026").isValid).toBe(true);
  });

  it("rejeita senha curta", () => {
    expect(validatePassword("Ab1@").errors).toContain("Mínimo de 8 caracteres");
  });

  it("exige maiúscula, minúscula, número e caractere especial", () => {
    expect(validatePassword("abcdefgh").errors).toEqual([
      "Pelo menos uma letra maiúscula",
      "Pelo menos um número",
      "Pelo menos um caractere especial (!@#$%...)",
    ]);
    expect(validatePassword("ABCDEFG1").errors).toEqual([
      "Pelo menos uma letra minúscula",
      "Pelo menos um caractere especial (!@#$%...)",
    ]);
  });
});
