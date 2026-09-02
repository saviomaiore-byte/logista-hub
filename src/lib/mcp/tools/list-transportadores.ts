import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { likeTerm, notAuthenticated, paginationMeta, rangeFor, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transportadores",
  title: "Listar transportadores",
  description:
    "Lista transportadores cadastrados com razão social, CPF/CNPJ, situação operacional e documentos (ANTT, alvará, certificado). " +
    "Suporta busca por razão social ou CPF/CNPJ, paginação por offset e retorna o total de registros encontrados.",
  inputSchema: {
    busca: z.string().trim().optional().describe("Texto para buscar em razão social ou CPF/CNPJ."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros por página."),
    offset: z.number().int().min(0).default(0).describe("Deslocamento para paginação (padrão 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, limite, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [from, to] = rangeFor(limite, offset);
    let query = supabase
      .from("transportadores")
      .select(
        "id, razao_social, cpf_cnpj, contato, email, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero",
        { count: "exact" }
      )
      .order("razao_social", { ascending: true })
      .range(from, to);

    if (busca) {
      const termo = likeTerm(busca);
      query = query.or(`razao_social.ilike.${termo},cpf_cnpj.ilike.${termo}`);
    }

    const { data, error, count } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const transportadores = data ?? [];
    const payload = {
      transportadores,
      ...paginationMeta(transportadores.length, count ?? null, limite, offset),
      filtros_aplicados: { busca: busca ?? null },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
