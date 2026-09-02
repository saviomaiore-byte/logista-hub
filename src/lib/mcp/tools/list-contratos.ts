import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contratos",
  title: "Listar contratos",
  description: "Lista contratos cadastrados, com filtro opcional por status.",
  inputSchema: {
    status: z.string().trim().optional().describe("Filtra pelo status do contrato."),
    motorista_id: z
      .string()
      .uuid()
      .optional()
      .describe("Filtra contratos vinculados a um motorista específico."),
    transportador_id: z
      .string()
      .uuid()
      .optional()
      .describe("Filtra contratos vinculados a um transportador específico."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, motorista_id, transportador_id, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("contratos")
      .select(
        "id, empresa, cnpj, tipo, modelo, status, data_envio, data_assinatura, motorista_id, transportador_id, observacoes",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(limite);

    if (status) query = query.eq("status", status);
    if (motorista_id) query = query.eq("motorista_id", motorista_id);
    if (transportador_id) query = query.eq("transportador_id", transportador_id);

    const { data, error, count } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const contratos = data ?? [];
    const total_encontrado = count ?? null;
    const truncated =
      total_encontrado !== null ? total_encontrado > contratos.length : contratos.length >= limite;

    const payload = {
      contratos,
      returned: contratos.length,
      total_encontrado,
      limite,
      truncated,
      filtros_aplicados: { status: status ?? null, motorista_id: motorista_id ?? null, transportador_id: transportador_id ?? null },
      aviso: truncated
        ? "Resultado truncado pelo limite: não conclua ausência de contratos nem totais a partir desta lista."
        : "Resultado completo para os filtros aplicados.",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
