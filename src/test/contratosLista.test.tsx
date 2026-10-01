import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Contratos from "@/pages/Contratos";

const state = vi.hoisted(() => ({
  mobile: false, admin: true, edit: true, multi: false,
  motoristaCnpj: "12.345.678/0001-90" as string | null,
  enviar: vi.fn(), excluir: vi.fn(), baixar: vi.fn(),
}));
vi.mock("@/components/layout/MainLayout", () => ({ MainLayout: ({ children }) => children }));
vi.mock("@/components/FileUpload", () => ({ FileUpload: () => null }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => state.mobile }));
vi.mock("@/hooks/usePermissoes", () => ({ usePermissoes: () => ({ isAdmin: state.admin, podeEditar: () => state.edit }) }));
vi.mock("@/lib/storage", () => ({ openSignedFile: (...args) => state.baixar(...args) }));
vi.mock("@/hooks/useContratos", () => ({
  useContratos: () => ({ data: [{
    id: "contrato-1", tipo: "contrato", modelo: "Start", empresa: "Empresa Teste",
    cnpj: "98.765.432/0001-10", status: "pendente", arquivo_url: "contratos/teste.pdf",
    motorista_id: "motorista-1", transportador_id: "transportador-1",
    motoristas: { nome: "Motorista Teste", tipo_pessoa: "juridica", cnpj: state.motoristaCnpj },
    transportadores: { razao_social: "Empresa Teste" },
  }, ...(state.multi ? [{
    id: "contrato-2", tipo: "adesao", modelo: "Maiore", empresa: "Outra Empresa",
    cnpj: null, status: "enviado", arquivo_url: null,
    motorista_id: "motorista-2", transportador_id: null,
    motoristas: { nome: "Álvaro Souza", tipo_pessoa: "fisica", cnpj: null },
    transportadores: null,
  }] : [])] }),
  useTransportadoresOpcoes: () => ({ data: [] }),
  useCriarContrato: () => ({ mutateAsync: vi.fn() }),
  useAtualizarContrato: () => ({ mutateAsync: vi.fn() }),
  useExcluirContrato: () => ({ mutateAsync: state.excluir }),
  useEnviarContrato: () => ({ mutateAsync: state.enviar }),
}));
afterEach(cleanup);
function escolher(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name: option }));
}

it.each([false, true])("oculta CNPJ apenas no filtro Pessoa Física (mobile=%s)", (mobile) => {
  state.mobile = mobile;
  state.multi = true;
  render(<Contratos />);
  escolher("Filtrar por vínculo", "Motorista Pessoa Física");
  expect(screen.getByText("Álvaro Souza")).toBeInTheDocument();
  expect(screen.queryByText(/CNPJ:/)).not.toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "CNPJ do motorista" })).not.toBeInTheDocument();
  escolher("Filtrar por vínculo", "Motorista Pessoa Jurídica");
  expect(screen.getByText("12.345.678/0001-90")).toBeInTheDocument();
});

it("pesquisa nome sem acentos e CNPJ sem pontuação, combinando os filtros", () => {
  state.multi = true;
  render(<Contratos />);
  const busca = screen.getByRole("searchbox", { name: "Pesquisar motorista ou CNPJ" });
  fireEvent.change(busca, { target: { value: "alvaro" } });
  expect(screen.getByText("Álvaro Souza")).toBeInTheDocument();
  expect(screen.queryByText("Motorista Teste")).not.toBeInTheDocument();
  fireEvent.change(busca, { target: { value: "12345678000190" } });
  expect(screen.getByText("Motorista Teste")).toBeInTheDocument();
  expect(screen.queryByText("Álvaro Souza")).not.toBeInTheDocument();
  escolher("Filtrar por modelo", "Maiore");
  expect(screen.getByText("Nenhum contrato encontrado")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(busca).toHaveValue("");
  expect(screen.getByText("Motorista Teste")).toBeInTheDocument();
  expect(screen.getByText("Álvaro Souza")).toBeInTheDocument();
});

it("ordena pelo nome do motorista e restaura a ordem mais recente ao limpar", () => {
  state.multi = true;
  render(<Contratos />);
  const nomes = () => screen.getAllByRole("row").slice(1).map(row => row.textContent);
  escolher("Ordenar por", "Motorista A–Z");
  expect(nomes()[0]).toContain("Álvaro Souza");
  escolher("Ordenar por", "Motorista Z–A");
  expect(nomes()[0]).toContain("Motorista Teste");
  escolher("Ordenar por", "Motorista A–Z");
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(nomes()[0]).toContain("Motorista Teste");
  expect(screen.getByRole("combobox", { name: "Ordenar por" })).toHaveTextContent("Mais recentes");
});
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, { mobile: false, admin: true, edit: true, multi: false, motoristaCnpj: "12.345.678/0001-90" });
});

it.each([false, true])("mostra o CNPJ do motorista e um menu compacto (mobile=%s)", (mobile) => {
  state.mobile = mobile;
  render(<Contratos />);
  expect(screen.getByText("12.345.678/0001-90")).toBeInTheDocument();
  expect(screen.queryByText("98.765.432/0001-10")).not.toBeInTheDocument();
  const trigger = screen.getByRole("button", { name: "Ações do contrato" });
  expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(screen.getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: "Excluir" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: "Baixar arquivo" }));
  expect(state.baixar).toHaveBeenCalledWith("contratos/teste.pdf");
});

it("não substitui CNPJ ausente do motorista pelo CNPJ da transportadora", () => {
  state.motoristaCnpj = null;
  render(<Contratos />);
  expect(screen.queryByText("98.765.432/0001-10")).not.toBeInTheDocument();
});

it("mantém as restrições de editar/excluir e a ação de marcar como enviado", () => {
  state.admin = false;
  state.edit = false;
  render(<Contratos />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Ações do contrato" }), { key: "Enter" });
  expect(screen.queryByRole("menuitem", { name: "Editar" })).not.toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Excluir" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("menuitem", { name: "Marcar como enviado" }));
  expect(state.enviar).toHaveBeenCalledWith("contrato-1");
});
