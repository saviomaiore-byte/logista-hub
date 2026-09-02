import { defineTool } from "@lovable.dev/mcp-js";
import {
  likeTerm,
  maskDocumento,
  notAuthenticated,
  paginationMeta,
  rangeFor,
  supabaseForUser,
} from "../supabase";
import { paginationShape } from "../schemas";
import { z } from "zod";

export default defineTool({
  name: "list_motoristas",
  title: "Listar motoristas",
  description:
    "Lista motoristas cadastrados, com busca por nome ou CPF e filtro por situação operacional. " +
    "Filtros: 'busca' (nome ou CPF, correspondência parcial), 'situacao_operacional', 'limite' e 'offset'. " +
    "Campo 'status' do motorista (retornado, não filtrável): 'ativo', 'inativo' ou 'pendente'. " +
    "Campo 'situacao_operacional' do motorista é um marcador operacional legado, não editado nas telas atuais; valores existentes: " +
    "'em_praca_apto' e 'em_praca' (em praça, apto), 'em_viagem_apto' (em viagem, apto) e 'inapto'. " +
    "A situação operacional usada oficialmente nos relatórios é a do TRANSPORTADOR vinculado (ver list_transportadores), não a do motorista. " +
    "O CPF é retornado mascarado (apenas os 4 últimos dígitos visíveis); a busca continua funcionando com o CPF completo ou parcial. " +
    "Resultado paginado com total de registros encontrados para os filtros aplicados.",
  inputSchema: {
    busca: z.string().trim().optional().describe("Texto para buscar em nome ou CPF (parcial)."),
    situacao_operacional: z
      .string()
      .trim()
      .optional()
      .describe(
        "Filtra pela situação operacional do motorista (campo legado). Valores em uso: 'em_praca_apto', 'em_praca', 'em_viagem_apto', 'inapto'."
      ),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros por página."),
    offset: z.number().int().min(0).default(0).describe("Deslocamento para paginação (padrão 0)."),
  },
  outputSchema: {
    motoristas: z.array(
      z.object({
        id: z.string(),
        nome: z.string(),
        cpf: z.string().nullable().describe("CPF mascarado (apenas 4 últimos dígitos visíveis)."),
        telefone: z.string().nullable(),
        email: z.string().nullable(),
        cidade: z.string().nullable(),
        estado: z.string().nullable(),
        status: z.string().nullable(),
        situacao_operacional: z.string().nullable(),
        cnh_vencimento: z.string().nullable(),
        mopp_vencimento: z.string().nullable(),
        mopp_vitalicio: z.boolean().nullable(),
      })
    ),
    ...paginationShape,
    filtros_aplicados: z.object({
      busca: z.string().nullable(),
      situacao_operacional: z.string().nullable(),
    }),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, situacao_operacional, limite, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [from, to] = rangeFor(limite, offset);
    let query = supabase
      .from("motoristas")
      .select(
        "id, nome, cpf, telefone, email, cidade, estado, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio",
        { count: "exact" }
      )
      .order("nome", { ascending: true })
      .range(from, to);

    if (busca) {
      const termo = likeTerm(busca);
      query = query.or(`nome.ilike.${termo},cpf.ilike.${termo}`);
    }
    if (situacao_operacional) query = query.eq("situacao_operacional", situacao_operacional);

    const { data, error, count } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const motoristas = (data ?? []).map((m) => ({ ...m, cpf: maskDocumento(m.cpf) }));
    const payload = {
      motoristas,
      ...paginationMeta(motoristas.length, count ?? null, limite, offset),
      filtros_aplicados: {
        busca: busca ?? null,
        situacao_operacional: situacao_operacional ?? null,
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
