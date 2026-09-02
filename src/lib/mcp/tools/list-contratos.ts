import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { paginationShape } from "../schemas";
import { notAuthenticated, paginationMeta, rangeFor, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_contratos",
  title: "Listar contratos",
  description:
    "Lista contratos cadastrados. Permite filtrar por motorista (motorista_id), por transportador (transportador_id) e por status. " +
    "Status em uso: 'pendente', 'enviado', 'assinado', 'recusado'. " +
    "Campo 'tipo': 'contrato', 'distrato' ou 'adesao'. Campo 'modelo': 'Maiore', 'Start' ou 'Comodato'. " +
    "O resultado é paginado (limite/offset) e informa o total de contratos encontrados para os filtros aplicados.",
  inputSchema: {
    status: z
      .string()
      .trim()
      .optional()
      .describe("Filtra pelo status do contrato: 'pendente', 'enviado', 'assinado' ou 'recusado'."),
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
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros por página."),
    offset: z.number().int().min(0).default(0).describe("Deslocamento para paginação (padrão 0)."),
  },
  outputSchema: {
    contratos: z.array(
      z.object({
        id: z.string(),
        empresa: z.string().nullable(),
        cnpj: z.string().nullable(),
        tipo: z.string().nullable(),
        modelo: z.string().nullable(),
        status: z.string().nullable(),
        data_envio: z.string().nullable(),
        data_assinatura: z.string().nullable(),
        motorista_id: z.string().nullable(),
        transportador_id: z.string().nullable(),
        observacoes: z.string().nullable(),
      })
    ),
    ...paginationShape,
    filtros_aplicados: z.object({
      status: z.string().nullable(),
      motorista_id: z.string().nullable(),
      transportador_id: z.string().nullable(),
    }),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, motorista_id, transportador_id, limite, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [from, to] = rangeFor(limite, offset);
    let query = supabase
      .from("contratos")
      .select(
        "id, empresa, cnpj, tipo, modelo, status, data_envio, data_assinatura, motorista_id, transportador_id, observacoes",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (motorista_id) query = query.eq("motorista_id", motorista_id);
    if (transportador_id) query = query.eq("transportador_id", transportador_id);

    const { data, error, count } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const contratos = data ?? [];
    const payload = {
      contratos,
      ...paginationMeta(contratos.length, count ?? null, limite, offset),
      filtros_aplicados: {
        status: status ?? null,
        motorista_id: motorista_id ?? null,
        transportador_id: transportador_id ?? null,
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
