import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { paginationShape } from "../schemas";
import { likeTerm, notAuthenticatedimport { likeTerm, notAuthenticated, paginationMeta, rangeFor, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_seguros",
  title: "Listar seguros",
  description:
    "Lista apólices de seguro cadastradas, com filtro opcional por status ou por seguradora (parcial). " +
    "Status em uso: 'ativo', 'vencido' e 'cancelado'. A interface também sinaliza vencimento pela data 'vigencia_fim', " +
    "então uma apólice com status 'ativo' e 'vigencia_fim' no passado deve ser tratada como vencida. " +
    "Suporta paginação por offset e retorna o total de apólices encontradas para os filtros aplicados.",
  inputSchema: {
    status: z
      .string()
      .trim()
      .optional()
      .describe("Filtra pelo status da apólice: 'ativo', 'vencido' ou 'cancelado'."),
    seguradora: z.string().trim().optional().describe("Filtra pelo nome da seguradora (busca parcial)."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros por página."),
    offset: z.number().int().min(0).default(0).describe("Deslocamento para paginação (padrão 0)."),
  },
  outputSchema: {
    seguros: z.array(
      z.object({
        id: z.string(),
        seguradora: z.string().nullable(),
        tipo: z.string().nullable(),
        numero_apolice: z.string().nullable(),
        status: z.string().nullable(),
        vigencia_inicio: z.string().nullable(),
        vigencia_fim: z.string().nullable(),
        valor_premio: z.number().nullable(),
        motorista_id: z.string().nullable(),
      })
    ),
    ...paginationShape,
    filtros_aplicados: z.object({
      status: z.string().nullable(),
      seguradora: z.string().nullable(),
    }),
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
