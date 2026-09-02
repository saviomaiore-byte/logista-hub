import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { likeTerm, notAuthenticated, paginationMeta, rangeFor, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_motoristas",
  title: "Listar motoristas",
  description:
    "Lista motoristas cadastrados, com busca opcional por nome ou CPF e filtro por situação operacional. " +
    "Suporta paginação por offset e retorna o total de registros encontrados para os filtros aplicados.",
  inputSchema: {
    busca: z.string().trim().optional().describe("Texto para buscar em nome ou CPF."),
    situacao_operacional: z
      .string()
      .trim()
      .optional()
      .describe("Filtra pela situação operacional (ex.: 'apto em viagem', 'inapto')."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros por página."),
    offset: z.number().int().min(0).default(0).describe("Deslocamento para paginação (padrão 0)."),
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
    const motoristas = data ?? [];
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
