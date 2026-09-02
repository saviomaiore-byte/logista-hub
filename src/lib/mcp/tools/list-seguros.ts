import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { likeTerm, notAuthenticated, paginationMeta, rangeFor, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_seguros",
  title: "Listar seguros",
  description:
    "Lista apólices de seguro cadastradas, com filtro opcional por status ou seguradora. " +
    "Suporta paginação por offset e retorna o total de apólices encontradas para os filtros aplicados.",
  inputSchema: {
    status: z.string().trim().optional().describe("Filtra pelo status da apólice."),
    seguradora: z.string().trim().optional().describe("Filtra pelo nome da seguradora (busca parcial)."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros por página."),
    offset: z.number().int().min(0).default(0).describe("Deslocamento para paginação (padrão 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, seguradora, limite, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [from, to] = rangeFor(limite, offset);
    let query = supabase
      .from("seguros")
      .select(
        "id, seguradora, tipo, numero_apolice, status, vigencia_inicio, vigencia_fim, valor_premio, motorista_id",
        { count: "exact" }
      )
      .order("vigencia_fim", { ascending: true, nullsFirst: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (seguradora) query = query.or(`seguradora.ilike.${likeTerm(seguradora)}`);

    const { data, error, count } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const seguros = data ?? [];
    const payload = {
      seguros,
      ...paginationMeta(seguros.length, count ?? null, limite, offset),
      filtros_aplicados: { status: status ?? null, seguradora: seguradora ?? null },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
