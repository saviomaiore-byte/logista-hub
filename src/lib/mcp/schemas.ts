import { z } from "zod";

/**
 * Blocos de schema de saída reutilizáveis pelas tools MCP.
 * Refletem exatamente o formato já retornado pelos handlers — nenhum campo novo.
 */

export const paginationShape = {
  returned: z.number().int().describe("Quantidade de registros nesta página."),
  total_encontrado: z
    .number()
    .int()
    .nullable()
    .describe("Total de registros que atendem aos filtros (null quando indisponível)."),
  limite: z.number().int().describe("Limite aplicado na consulta."),
  offset: z.number().int().describe("Deslocamento aplicado na consulta."),
  truncated: z.boolean().describe("true quando existem mais registros além desta página."),
  aviso: z.string().describe("Mensagem sobre a completude do resultado."),
};

/** Data ISO (YYYY-MM-DD) ou timestamp, conforme armazenado no banco. */
export const dataNullable = z.string().nullable();
