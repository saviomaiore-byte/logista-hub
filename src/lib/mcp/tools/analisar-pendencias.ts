import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";
import { checkMotoristaAptidao } from "@/lib/aptidao";

/**
 * Extrai apenas os motivos referentes à transportadora, reutilizando as mesmas
 * regras de `checkMotoristaAptidao` (sem duplicar lógica de negócio).
 */
function motivosTransportadora(t: {
  antt_numero?: string | null;
  alvara_numero?: string | null;
  certificado_numero?: string | null;
}): string[] {
  return checkMotoristaAptidao({}, true, t).motivos.filter((m) =>
    m.startsWith("Transportadora")
  );
}

export default defineTool({
  name: "analisar_pendencias",
  title: "Analisar pendências operacionais",
  description:
    "Analisa pendências operacionais de transportadores ativos e dos motoristas vinculados, usando exatamente as mesmas regras de aptidão do relatório semanal. " +
    "Motivos possíveis para motorista: 'Sem contrato assinado', 'Transportadora sem ANTT', 'Transportadora sem Alvará', 'Transportadora sem Certificado', 'CNH vencida', 'MOPP vencido', 'Motorista inativo'. " +
    "Motivos possíveis para transportador: 'Transportadora sem ANTT', 'Transportadora sem Alvará', 'Transportadora sem Certificado'. " +
    "Somente transportadores com status 'ativo' são analisados (mesmo critério do relatório). Nenhum CPF/CNPJ ou número de documento é retornado. Ferramenta somente leitura.",
  inputSchema: {
    entidade: z
      .enum(["ambos", "motorista", "transportador"])
      .default("ambos")
      .describe("Restringe a análise a um tipo de entidade. Padrão: 'ambos'."),
    limite: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(100)
      .describe("Máximo de registros COM pendência retornados na lista (os totais consideram tudo)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  outputSchema: {
    total_analisado: z.number().int().describe("Total de registros analisados (motoristas + transportadores conforme o filtro)."),
    total_com_pendencias: z.number().int(),
    total_sem_pendencias: z.number().int(),
    returned: z.number().int().describe("Quantidade de pendências retornadas na lista."),
    limite: z.number().int(),
    truncated: z.boolean().describe("true quando há mais pendências do que o limite retornado."),
    aviso: z.string(),
    filtros_aplicados: z.object({ entidade: z.string() }),
    pendencias: z.array(
      z.object({
        entidade: z.enum(["motorista", "transportador"]),
        id: z.string(),
        nome: z.string(),
        situacao_operacional: z
          .string()
          .nullable()
          .describe("Situação operacional quando disponível; null caso contrário."),
        motivos: z.array(z.string()),
      })
    ),
  },
  handler: async ({ entidade, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const [transportadoresRes, linksRes, motoristasRes, contratosRes] = await Promise.all([
      supabase
        .from("transportadores")
        .select("id, razao_social, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero")
        .eq("status", "ativo")
        .order("razao_social", { ascending: true }),
      supabase.from("transportador_motoristas").select("transportador_id, motorista_id"),
      supabase
        .from("motoristas")
        .select("id, nome, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio"),
      supabase.from("contratos").select("motorista_id, status").eq("status", "assinado"),
    ]);

    const erro =
      transportadoresRes.error || linksRes.error || motoristasRes.error || contratosRes.error;
    if (erro) return { content: [{ type: "text", text: erro.message }], isError: true };

    const transportadores = transportadoresRes.data ?? [];
    const links = linksRes.data ?? [];
    const motoristas = motoristasRes.data ?? [];
    const contratosSet = new Set((contratosRes.data ?? []).map((c) => c.motorista_id));
    const motoristaPorId = new Map(motoristas.map((m) => [m.id, m]));

    type Pendencia = {
      entidade: "motorista" | "transportador";
      id: string;
      nome: string;
      situacao_operacional: string | null;
      motivos: string[];
    };

    const pendencias: Pendencia[] = [];
    let total_analisado = 0;

    for (const t of transportadores) {
      if (entidade !== "motorista") {
        total_analisado++;
        const motivos = motivosTransportadora(t);
        if (motivos.length > 0) {
          pendencias.push({
            entidade: "transportador",
            id: t.id,
            nome: t.razao_social,
            situacao_operacional: t.situacao_operacional ?? null,
            motivos,
          });
        }
      }

      if (entidade === "transportador") continue;

      const vinculados = links
        .filter((l) => l.transportador_id === t.id)
        .map((l) => motoristaPorId.get(l.motorista_id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));

      for (const m of vinculados) {
        total_analisado++;
        const { apto, motivos } = checkMotoristaAptidao(m, contratosSet.has(m.id), t);
        if (!apto) {
          pendencias.push({
            entidade: "motorista",
            id: m.id,
            nome: m.nome,
            situacao_operacional: m.situacao_operacional ?? null,
            motivos,
          });
        }
      }
    }

    const total_com_pendencias = pendencias.length;
    const lista = pendencias.slice(0, limite);
    const truncated = total_com_pendencias > lista.length;

    const payload = {
      total_analisado,
      total_com_pendencias,
      total_sem_pendencias: total_analisado - total_com_pendencias,
      returned: lista.length,
      limite,
      truncated,
      aviso: truncated
        ? `Resultado parcial: ${lista.length} de ${total_com_pendencias} pendência(s) retornadas. Aumente 'limite' antes de concluir qualquer coisa sobre a lista completa.`
        : `Lista completa: ${lista.length} pendência(s) de ${total_analisado} registro(s) analisados.`,
      filtros_aplicados: { entidade },
      pendencias: lista,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
