import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MotoristaForm } from "@/components/motorista/MotoristaForm";
import {
  formValuesToRow,
  initialValues,
  motoristaToFormValues,
  type Motorista,
  type MotoristaFormValues,
} from "@/components/motorista/types";

afterEach(cleanup);

const validValues = {
  ...initialValues,
  nome: "Motorista de teste",
  cpf: "123.456.789-00",
  telefone: "(11) 99999-9999",
};

function form(values: MotoristaFormValues, onSubmit = vi.fn()) {
  return render(
    <MotoristaForm
      initialValues={values}
      submitLabel="Salvar"
      moppCheckboxId="teste-mopp"
      transportadoras={[]}
      selectedTransportadoras={[]}
      onSelectedTransportadorasChange={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
}

describe("Projeto Start no formulário de motorista", () => {
  it("envia Não como boolean false ao cadastrar sem alterar o seletor", async () => {
    const onSubmit = vi.fn();
    form(validValues, onSubmit);
    expect(screen.getByRole("combobox", { name: "Projeto Start" })).toHaveTextContent("Não");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(formValuesToRow(onSubmit.mock.calls[0][0]).projeto_start).toBe(false);
  });

  it.each([true, false])("salva projeto_start=%s e recupera a escolha ao reabrir", async (target) => {
    const onSubmit = vi.fn();
    const view = form({ ...validValues, projeto_start: !target }, onSubmit);
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Projeto Start" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: target ? "Sim" : "Não" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const row = formValuesToRow(onSubmit.mock.calls[0][0]);
    expect(row.projeto_start).toBe(target);
    expect(row.nome).toBe(validValues.nome);
    expect(row.cpf).toBe(validValues.cpf);
    view.unmount();

    const saved: Motorista = { id: "teste", ...row };
    const edit = form(motoristaToFormValues(saved));
    expect(screen.getByRole("combobox", { name: "Projeto Start" })).toHaveTextContent(target ? "Sim" : "Não");
    edit.unmount();

    form(initialValues);
    expect(screen.getByRole("combobox", { name: "Projeto Start" })).toHaveTextContent("Não");
  });
});
