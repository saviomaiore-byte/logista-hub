import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contratos",
  title: "Listar contratos",
  description: "Lista contratos cadastrados, com filtro opcional por status.",
  inputSchema: {
    status: z.string().trim().optional().describe("Filtra pelo status do contrato."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("contratos")
      .select(
        "id, empresa, cnpj, tipo, modelo, status, data_envio, data_assinatura, motorista_id, transportador_id, observacoes"
      )
      .order("created_at", { ascending: false })
      .limit(limite);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { contratos: data ?? [] },
    };
  },
});
