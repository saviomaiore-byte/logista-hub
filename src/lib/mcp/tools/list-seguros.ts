import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_seguros",
  title: "Listar seguros",
  description: "Lista apólices de seguro cadastradas, com filtro opcional por status ou seguradora.",
  inputSchema: {
    status: z.string().trim().optional().describe("Filtra pelo status da apólice."),
    seguradora: z.string().trim().optional().describe("Filtra pelo nome da seguradora (busca parcial)."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, seguradora, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("seguros")
      .select(
        "id, seguradora, tipo, numero_apolice, status, vigencia_inicio, vigencia_fim, valor_premio, motorista_id"
      )
      .order("vigencia_fim", { ascending: true, nullsFirst: false })
      .limit(limite);

    if (status) query = query.eq("status", status);
    if (seguradora) query = query.ilike("seguradora", `%${seguradora}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { seguros: data ?? [] },
    };
  },
});
