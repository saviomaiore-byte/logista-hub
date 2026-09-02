import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

/**
 * Cruza APENAS relacionamentos comprovados por registros existentes:
 * - motorista ↔ transportador: tabela `transportador_motoristas`
 * - motorista ↔ contrato:      `contratos.motorista_id`
 * - transportador ↔ contrato:  `contratos.transportador_id`
 * Nenhum vínculo é inferido na ausência de registro.
 */
export default defineTool({
  name: "analisar_cruzamentos",
  title: "Analisar cruzamentos de vínculos",
  description:
    "Cruza os relacionamentos comprovados entre motoristas, transportadores e contratos. " +
    "Vínculo motorista ↔ transportador vem da tabela de vínculos ('transportador_motoristas'); vínculo com contrato vem dos campos 'motorista_id' e 'transportador_id' do contrato. " +
    "Nenhum vínculo é inferido: se não existe registro, o relacionamento não é retornado. " +
    "Filtros opcionais: 'motorista_id', 'transportador_id' e 'limite'. Nenhum CPF/CNPJ ou número de documento é retornado. Ferramenta somente leitura.",
  inputSchema: {
    motorista_id: z.string().uuid().optional().describe("Restringe os cruzamentos a um motorista específico."),
    transportador_id: z.string().uuid().optional().describe("Restringe os cruzamentos a um transportador específico."),
    limite: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(100)
      .describe("Máximo de relacionamentos retornados por categoria (os totais consideram tudo)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  outputSchema: {
    filtros_aplicados: z.object({
      motorista_id: z.string().nullable(),
      transportador_id: z.string().nullable(),
      limite: z.number().int(),
    }),
    totais: z.object({
      motorista_transportador: z.number().int(),
      motorista_contrato: z.number().int(),
      transportador_contrato: z.number().int(),
    }),
    truncated: z.boolean(),
    aviso: z.string(),
    motorista_transportador: z.array(
      z.object({
        motorista_id: z.string(),
        motorista_nome: z.string().nullable(),
        transportador_id: z.string(),
        transportador_nome: z.string().nullable(),
      })
    ),
    motorista_contrato: z.array(
      z.object({
        motorista_id: z.string(),
        motorista_nome: z.string().nullable(),
        contrato_id: z.string(),
        contrato_tipo: z.string().nullable(),
        contrato_status: z.string().nullable(),
      })
    ),
    transportador_contrato: z.array(
      z.object({
        transportador_id: z.string(),
        transportador_nome: z.string().nullable(),
        contrato_id: z.string(),
        contrato_tipo: z.string().nullable(),
        contrato_status: z.string().nullable(),
      })
    ),
  },
  handler: async ({ motorista_id, transportador_id, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let linksQuery = supabase.from("transportador_motoristas").select("motorista_id, transportador_id");
    if (motorista_id) linksQuery = linksQuery.eq("motorista_id", motorista_id);
    if (transportador_id) linksQuery = linksQuery.eq("transportador_id", transportador_id);

    let contratosQuery = supabase
      .from("contratos")
      .select("id, tipo, status, motorista_id, transportador_id")
      .order("created_at", { ascending: false });
    if (motorista_id) contratosQuery = contratosQuery.eq("motorista_id", motorista_id);
    if (transportador_id) contratosQuery = contratosQuery.eq("transportador_id", transportador_id);

    const [linksRes, contratosRes, motoristasRes, transportadoresRes] = await Promise.all([
      linksQuery,
      contratosQuery,
      supabase.from("motoristas").select("id, nome"),
      supabase.from("transportadores").select("id, razao_social"),
    ]);

    const err = linksRes.error || contratosRes.error || motoristasRes.error || transportadoresRes.error;
    if (err) return { content: [{ type: "text" as const, text: err.message }], isError: true };

    const nomeMotorista = new Map((motoristasRes.data ?? []).map((m) => [m.id, m.nome as string | null]));
    const nomeTransportador = new Map(
      (transportadoresRes.data ?? []).map((t) => [t.id, t.razao_social as string | null])
    );

    const motorista_transportador = (linksRes.data ?? []).map((l) => ({
      motorista_id: l.motorista_id,
      motorista_nome: nomeMotorista.get(l.motorista_id) ?? null,
      transportador_id: l.transportador_id,
      transportador_nome: nomeTransportador.get(l.transportador_id) ?? null,
    }));

    const contratos = contratosRes.data ?? [];

    const motorista_contrato = contratos
      .filter((c) => !!c.motorista_id)
      .map((c) => ({
        motorista_id: c.motorista_id as string,
        motorista_nome: nomeMotorista.get(c.motorista_id as string) ?? null,
        contrato_id: c.id,
        contrato_tipo: c.tipo ?? null,
        contrato_status: c.status ?? null,
      }));

    const transportador_contrato = contratos
      .filter((c) => !!c.transportador_id)
      .map((c) => ({
        transportador_id: c.transportador_id as string,
        transportador_nome: nomeTransportador.get(c.transportador_id as string) ?? null,
        contrato_id: c.id,
        contrato_tipo: c.tipo ?? null,
        contrato_status: c.status ?? null,
      }));

    const totais = {
      motorista_transportador: motorista_transportador.length,
      motorista_contrato: motorista_contrato.length,
      transportador_contrato: transportador_contrato.length,
    };

    const listaMT = motorista_transportador.slice(0, limite);
    const listaMC = motorista_contrato.slice(0, limite);
    const listaTC = transportador_contrato.slice(0, limite);
    const truncated =
      listaMT.length < totais.motorista_transportador ||
      listaMC.length < totais.motorista_contrato ||
      listaTC.length < totais.transportador_contrato;

    const payload = {
      filtros_aplicados: {
        motorista_id: motorista_id ?? null,
        transportador_id: transportador_id ?? null,
        limite,
      },
      totais,
      truncated,
      aviso: truncated
        ? "Resultado parcial: pelo menos uma das listas foi truncada pelo 'limite'. Aumente 'limite' antes de concluir qualquer coisa sobre o conjunto completo."
        : "Listas completas para os filtros aplicados. Apenas vínculos com registro existente são retornados; ausência na lista significa ausência de registro de vínculo.",
      motorista_transportador: listaMT,
      motorista_contrato: listaMC,
      transportador_contrato: listaTC,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
