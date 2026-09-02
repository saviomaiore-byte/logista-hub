import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

/**
 * Campos de vencimento que realmente existem no cadastro de motoristas.
 * A tabela `transportadores` armazena apenas os NÚMEROS de ANTT, alvará e
 * certificado (sem data), portanto não há vencimento a analisar por lá.
 */
const CAMPOS_MOTORISTA = [
  { campo: "cnh_vencimento", tipo: "CNH" },
  { campo: "mopp_vencimento", tipo: "MOPP" },
  { campo: "antt_vencimento", tipo: "ANTT" },
  { campo: "alvara_vencimento", tipo: "Alvará" },
  { campo: "certificado_vencimento", tipo: "Certificado" },
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Retorna a diferença em dias inteiros, ou `null` quando a data armazenada não
 * pode ser interpretada com segurança (formato inesperado ou data inválida).
 * Nunca retorna NaN.
 */
function diasEntre(hojeISO: string, dataISO: string): number | null {
  const bruto = String(dataISO).slice(0, 10);
  if (!ISO_DATE.test(bruto)) return null;
  const alvo = Date.parse(`${bruto}T00:00:00Z`);
  const base = Date.parse(`${hojeISO}T00:00:00Z`);
  if (!Number.isFinite(alvo) || !Number.isFinite(base)) return null;
  // Rejeita datas "roláveis" como 2025-02-31.
  if (new Date(alvo).toISOString().slice(0, 10) !== bruto) return null;
  const dias = Math.round((alvo - base) / 86400000);
  return Number.isFinite(dias) ? dias : null;
}


export default defineTool({
  name: "analisar_vencimentos",
  title: "Analisar vencimentos de documentos",
  description:
    "Lista documentos já vencidos ou que vencem dentro de uma janela de dias (padrão 30), usando apenas os campos de vencimento existentes no sistema. " +
    "Motorista: CNH ('cnh_vencimento'), MOPP ('mopp_vencimento', ignorado quando 'mopp_vitalicio' = true), ANTT, Alvará e Certificado. " +
    "Transportador: o cadastro guarda apenas os números de ANTT, alvará e certificado, SEM data de vencimento — por isso não há vencimentos a analisar para transportadores (use analisar_pendencias para ausência desses documentos). " +
    "Para certificados digitais DA EMPRESA use list_certificados_vencendo. " +
    "'dias_para_vencer' negativo significa documento já vencido. Nenhum CPF/CNPJ ou número de documento é retornado. Ferramenta somente leitura.",
  inputSchema: {
    dias: z
      .number()
      .int()
      .min(0)
      .max(365)
      .default(30)
      .describe("Janela em dias a partir de hoje. Vencidos são sempre incluídos."),
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
      .describe("Máximo de itens retornados na lista (os totais consideram tudo)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  outputSchema: {
    total_analisado: z.number().int().describe("Total de campos de vencimento preenchidos que foram avaliados."),
    total_vencidos: z.number().int(),
    total_a_vencer: z.number().int().describe("Vencem dentro da janela de dias informada (ainda não vencidos)."),
    returned: z.number().int(),
    limite: z.number().int(),
    truncated: z.boolean(),
    aviso: z.string(),
    filtros_aplicados: z.object({
      dias: z.number().int(),
      entidade: z.string(),
      data_limite: z.string().describe("Data limite (YYYY-MM-DD) considerada na janela."),
    }),
    vencimentos: z.array(
      z.object({
        entidade: z.enum(["motorista", "transportador"]),
        id: z.string(),
        nome: z.string(),
        tipo_documento: z.string(),
        data_vencimento: z.string().describe("Data de vencimento (YYYY-MM-DD)."),
        dias_para_vencer: z.number().int().describe("Negativo quando já vencido."),
        vencido: z.boolean(),
        situacao_operacional: z.string().nullable(),
      })
    ),
  },
  handler: async ({ dias, entidade, limite }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const hoje = new Date().toISOString().slice(0, 10);
    const data_limite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

    type Item = {
      entidade: "motorista" | "transportador";
      id: string;
      nome: string;
      tipo_documento: string;
      data_vencimento: string;
      dias_para_vencer: number;
      vencido: boolean;
      situacao_operacional: string | null;
    };

    const itens: Item[] = [];
    let total_analisado = 0;
    let total_datas_invalidas = 0;


    if (entidade !== "transportador") {
      const { data, error } = await supabase
        .from("motoristas")
        .select(
          "id, nome, situacao_operacional, mopp_vitalicio, cnh_vencimento, mopp_vencimento, antt_vencimento, alvara_vencimento, certificado_vencimento"
        )
        .order("nome", { ascending: true });
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };

      for (const m of data ?? []) {
        for (const { campo, tipo } of CAMPOS_MOTORISTA) {
          if (campo === "mopp_vencimento" && m.mopp_vitalicio) continue;
          const valor = m[campo] as string | null;
          if (!valor) continue;
          total_analisado++;
          const dias_para_vencer = diasEntre(hoje, valor);
          if (dias_para_vencer === null) {
            total_datas_invalidas++;
            continue;
          }
          if (dias_para_vencer > dias) continue;

          itens.push({
            entidade: "motorista",
            id: m.id,
            nome: m.nome,
            tipo_documento: tipo,
            data_vencimento: valor,
            dias_para_vencer,
            vencido: dias_para_vencer < 0,
            situacao_operacional: m.situacao_operacional ?? null,
          });
        }
      }
    }

    itens.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));

    const total_vencidos = itens.filter((i) => i.vencido).length;
    const total_a_vencer = itens.length - total_vencidos;
    const lista = itens.slice(0, limite);
    const truncated = itens.length > lista.length;

    const semTransportador =
      entidade !== "motorista"
        ? " Transportadores não possuem datas de vencimento cadastradas no sistema, portanto não entram nesta análise."
        : "";

    const avisoDatasInvalidas =
      total_datas_invalidas > 0
        ? ` ${total_datas_invalidas} registro(s) possuem data de vencimento inválida ou não interpretável e foram excluídos da lista (nenhuma data foi inferida).`
        : "";


    const payload = {
      total_analisado,
      total_vencidos,
      total_a_vencer,
      returned: lista.length,
      limite,
      truncated,
      aviso:
        (truncated
          ? `Resultado parcial: ${lista.length} de ${itens.length} documento(s) retornados. Aumente 'limite' antes de concluir qualquer coisa sobre a lista completa.`
          : `Lista completa: ${lista.length} documento(s) vencidos ou a vencer em até ${dias} dia(s), de ${total_analisado} vencimento(s) analisados.`) +
        semTransportador +
        avisoDatasInvalidas,

      filtros_aplicados: { dias, entidade, data_limite },
      vencimentos: lista,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
