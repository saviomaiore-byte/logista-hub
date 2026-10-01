import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Contratos from "@/pages/Contratos";

const state = vi.hoisted(() => ({
  mobile: false, admin: true, edit: true,
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
  }] }),
  useTransportadoresOpcoes: () => ({ data: [] }),
  useCriarContrato: () => ({ mutateAsync: vi.fn() }),
  useAtualizarContrato: () => ({ mutateAsync: vi.fn() }),
  useExcluirContrato: () => ({ mutateAsync: state.excluir }),
  useEnviarContrato: () => ({ mutateAsync: state.enviar }),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, { mobile: false, admin: true, edit: true, motoristaCnpj: "12.345.678/0001-90" });
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
