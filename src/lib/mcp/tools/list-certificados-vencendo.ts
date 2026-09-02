import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_certificados_vencendo",
  title: "Certificados digitais a vencer",
  description:
    "Lista certificados digitais DA EMPRESA (ex.: e-CNPJ/e-CPF, tabela de certificados) que vencem dentro de um número de dias (padrão 30), incluindo os já vencidos. " +
    "Não confundir com o 'certificado' do transportador (documento operacional exibido como 'tem_certificado' em list_transportadores).",
  inputSchema: {
    dias: z.number().int().min(0).max(365).default(30).describe("Janela em dias a partir de hoje."),
    limite: z.number().int().min(1).max(100).default(50).describe("Máximo de registros."),
  },
  outputSchema: {
    certificados: z.array(
      z.object({
        id: z.string(),
        empresa: z.string().nullable(),
        tipo: z.string().nullable(),
        status: z.string().nullable(),
        vencimento: z.string().nullable(),
        data_renovacao_agendada: z.string().nullable(),
        observacoes: z.string().nullable(),
      })
    ),
    ate: z.string().describe("Data limite (YYYY-MM-DD) usada no filtro de vencimento."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ dias, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const limite_data = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("certificados")
      .select("id, empresa, tipo, status, vencimento, data_renovacao_agendada, observacoes")
      .lte("vencimento", limite_data)
      .order("vencimento", { ascending: true })
      .limit(limite);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { certificados: data ?? [], ate: limite_data },
    };
  },
});
