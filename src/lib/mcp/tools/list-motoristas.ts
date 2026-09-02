import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, quoteFilterValue, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_motoristas",
  title: "Listar motoristas",
  description:
    "Lista motoristas cadastrados, com busca opcional por nome ou CPF e filtro por situação operacional.",
  inputSchema: {
    busca: z.string().trim().optional().describe("Texto para buscar em nome ou CPF."),
    situacao_operacional: z
      .string()
      .trim()
      .optional()
      .describe("Filtra pela situação operacional (ex.: 'apto em viagem', 'inapto')."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, situacao_operacional, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("motoristas")
      .select(
        "id, nome, cpf, telefone, email, cidade, estado, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio"
      )
      .order("nome", { ascending: true })
      .limit(limite);

    if (busca) {
      const termo = quoteFilterValue(`%${busca}%`);
      query = query.or(`nome.ilike.${termo},cpf.ilike.${termo}`);
    }
    if (situacao_operacional) query = query.eq("situacao_operacional", situacao_operacional);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const motoristas = data ?? [];
    const truncated = motoristas.length >= limite;
    const payload = {
      motoristas,
      returned: motoristas.length,
      limite,
      truncated,
      aviso: truncated
        ? "Resultado possivelmente truncado pelo limite. Não afirme ausência nem totais a partir desta lista."
        : undefined,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
