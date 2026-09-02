import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";
import analisarPendencias from "./analisar-pendencias";
import analisarVencimentos from "./analisar-vencimentos";

type PendenciasPayload = {
  total_analisado: number;
  total_com_pendencias: number;
  total_sem_pendencias: number;
  returned: number;
  truncated: boolean;
  aviso: string;
  pendencias: Array<{
    entidade: "motorista" | "transportador";
    id: string;
    nome: string;
    situacao_operacional: string | null;
    motivos: string[];
  }>;
};

type VencimentosPayload = {
  total_analisado: number;
  total_vencidos: number;
  total_a_vencer: number;
  returned: number;
  truncated: boolean;
  aviso: string;
};

/**
 * Consolida os resultados das ferramentas de análise já existentes
 * (analisar_pendencias e analisar_vencimentos) e contagens diretas de
 * motoristas, transportadores e contratos. Nenhuma regra de negócio é
 * duplicada aqui.
 */
export default defineTool({
  name: "resumo_operacional",
  title: "Resumo operacional consolidado",
  description:
    "Panorama operacional consolidado, montado a partir das ferramentas de análise já existentes: analisar_pendencias (regras oficiais de aptidão do relatório semanal) e analisar_vencimentos (documentos vencidos e a vencer de motoristas), além das contagens diretas de motoristas, transportadores e contratos. " +
    "Retorna apenas totais comprovados; quando alguma contagem não pode ser confirmada ou alguma lista foi truncada, isso é sinalizado em 'incompleto' e 'avisos'. " +
    "Não classifica ninguém como apto/inapto ou regular/irregular fora dos motivos produzidos pelas regras existentes. Nenhum CPF/CNPJ ou número de documento é retornado. Ferramenta somente leitura.",
  inputSchema: {
    dias: z
      .number()
      .int()
      .min(0)
      .max(365)
      .default(30)
      .describe("Janela em dias usada na análise de vencimentos. Padrão 30."),
    top_pendencias: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Quantidade de motivos de pendência mais frequentes retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  outputSchema: {
    totais: z.object({
      motoristas: z.number().int().nullable().describe("Total de motoristas cadastrados visíveis; null quando não comprovado."),
      transportadores: z.number().int().nullable(),
      contratos: z.number().int().nullable(),
      registros_analisados_pendencias: z
        .number()
        .int()
        .describe("Registros efetivamente analisados por analisar_pendencias (transportadores ativos e motoristas vinculados)."),
      com_pendencias: z.number().int(),
      sem_pendencias: z.number().int(),
      documentos_vencidos: z.number().int(),
      documentos_a_vencer: z.number().int(),
      vencimentos_analisados: z.number().int(),
    }),
    principais_pendencias: z.array(
      z.object({
        motivo: z.string(),
        ocorrencias: z.number().int(),
      })
    ),
    incompleto: z.boolean().describe("true quando alguma métrica veio de lista truncada ou não pôde ser comprovada."),
    avisos: z.array(z.string()),
    filtros_aplicados: z.object({
      dias: z.number().int(),
      top_pendencias: z.number().int(),
    }),
  },
  handler: async ({ dias, top_pendencias }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const [motoristasCount, transportadoresCount, contratosCount, pendRes, vencRes] = await Promise.all([
      supabase.from("motoristas").select("id", { count: "exact", head: true }),
      supabase.from("transportadores").select("id", { count: "exact", head: true }),
      supabase.from("contratos").select("id", { count: "exact", head: true }),
      analisarPendencias.handler({ entidade: "ambos", limite: 200 }, ctx),
      analisarVencimentos.handler({ dias, entidade: "ambos", limite: 200 }, ctx),
    ]);

    if (pendRes.isError) return pendRes;
    if (vencRes.isError) return vencRes;

    const pend = pendRes.structuredContent as PendenciasPayload | undefined;
    const venc = vencRes.structuredContent as VencimentosPayload | undefined;
    if (!pend || !venc) {
      return {
        content: [{ type: "text" as const, text: "Não foi possível consolidar as análises existentes." }],
        isError: true,
      };
    }

    const avisos: string[] = [];
    let incompleto = false;

    if (motoristasCount.error || motoristasCount.count == null) {
      incompleto = true;
      avisos.push("Total de motoristas não pôde ser comprovado (retornado como null).");
    }
    if (transportadoresCount.error || transportadoresCount.count == null) {
      incompleto = true;
      avisos.push("Total de transportadores não pôde ser comprovado (retornado como null).");
    }
    if (contratosCount.error || contratosCount.count == null) {
      incompleto = true;
      avisos.push("Total de contratos não pôde ser comprovado (retornado como null).");
    }

    const contagem = new Map<string, number>();
    for (const p of pend.pendencias) {
      for (const motivo of p.motivos) {
        contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);
      }
    }
    const principais_pendencias = [...contagem.entries()]
      .map(([motivo, ocorrencias]) => ({ motivo, ocorrencias }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias || a.motivo.localeCompare(b.motivo))
      .slice(0, top_pendencias);

    if (pend.truncated) {
      incompleto = true;
      avisos.push(
        `A lista de pendências foi truncada (${pend.returned} de ${pend.total_com_pendencias}); 'principais_pendencias' considera apenas os registros retornados. Use analisar_pendencias com limite maior para o detalhamento completo.`
      );
    }
    if (venc.truncated) {
      incompleto = true;
      avisos.push(
        "A lista de vencimentos foi truncada; os totais de vencidos/a vencer refletem apenas os itens retornados por analisar_vencimentos. Use a ferramenta diretamente com limite maior."
      );
    }
    avisos.push(
      "Vencimentos consideram apenas motoristas: transportadores não possuem datas de vencimento cadastradas. Certificados digitais da empresa são consultados por list_certificados_vencendo."
    );

    const payload = {
      totais: {
        motoristas: motoristasCount.count ?? null,
        transportadores: transportadoresCount.count ?? null,
        contratos: contratosCount.count ?? null,
        registros_analisados_pendencias: pend.total_analisado,
        com_pendencias: pend.total_com_pendencias,
        sem_pendencias: pend.total_sem_pendencias,
        documentos_vencidos: venc.total_vencidos,
        documentos_a_vencer: venc.total_a_vencer,
        vencimentos_analisados: venc.total_analisado,
      },
      principais_pendencias,
      incompleto,
      avisos,
      filtros_aplicados: { dias, top_pendencias },
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
