import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transportadores",
  title: "Listar transportadores",
  description:
    "Lista transportadores cadastrados com razão social, CPF/CNPJ, situação operacional e documentos (ANTT, alvará, certificado).",
  inputSchema: {
    busca: z.string().trim().optional().describe("Texto para buscar em razão social ou CPF/CNPJ."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("transportadores")
      .select(
        "id, razao_social, cpf_cnpj, contato, email, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero"
      )
      .order("razao_social", { ascending: true })
      .limit(limite);

    if (busca) query = query.or(`razao_social.ilike.%${busca}%,cpf_cnpj.ilike.%${busca}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { transportadores: data ?? [] },
    };
  },
});
