import { describe, it, expect, vi } from "vitest";
import { dbErrorMessage, reportDbError } from "@/lib/dbError";

describe("dbErrorMessage", () => {
  it("traduz erro de RLS", () => {
    expect(dbErrorMessage({ message: "new row violates row-level security policy" }, "salvar")).toBe(
      "Sem permissão para salvar.",
    );
  });

  it("traduz duplicidade e chave estrangeira", () => {
    expect(dbErrorMessage({ message: "duplicate key value" }, "cadastrar")).toBe(
      "Registro duplicado ao cadastrar.",
    );
    expect(dbErrorMessage({ message: "violates foreign key constraint" }, "excluir")).toBe(
      "Não foi possível excluir: existem registros vinculados.",
    );
  });

  it("usa mensagem genérica com detalhe quando desconhecido", () => {
    expect(dbErrorMessage({ message: "boom" }, "carregar")).toBe("Erro ao carregar: boom");
    expect(dbErrorMessage(null, "carregar")).toBe("Erro ao carregar.");
  });
});

describe("reportDbError", () => {
  it("retorna false e não notifica sem erro", () => {
    const notify = vi.fn();
    expect(reportDbError("carregar", null, notify)).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });

  it("retorna true e notifica quando há erro", () => {
    const notify = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(reportDbError("carregar", { message: "boom" }, notify)).toBe(true);
    expect(notify).toHaveBeenCalledWith("Erro ao carregar: boom");
    spy.mockRestore();
  });
});
