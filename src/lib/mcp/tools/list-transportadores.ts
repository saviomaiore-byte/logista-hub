import { defineTool } from "@lovable.dev/mcp-js";
import {
  likeTerm,
  maskDocumento,
  notAuthenticated,
  paginationMeta,
  rangeFor,
  supabaseForUser,
  temDocumento,
} from "../supabase";
import { z } from "zod";

export default defineTool({
  name: "list_transportadores",
  title: "Listar transportadores",
  description:
    "Lista transportadores cadastrados. Filtros: 'busca' (razão social ou CPF/CNPJ, parcial), 'limite' e 'offset'. " +
    "Campo 'status': 'ativo' ou 'inativo'. " +
    "Campo 'situacao_operacional' do transportador é a situação operacional oficial usada nos relatórios semanais; valores: " +
    "'em_praca_apto' (em praça, apto), 'em_viagem_apto' (em viagem, apto) e 'inapto'. " +
    "Documentos do transportador (ANTT, alvará e certificado de transporte) são retornados apenas como presença/ausência em 'tem_antt', 'tem_alvara' e 'tem_certificado' — sem o número. " +
    "Atenção: esse 'certificado' é o documento do transportador e não se confunde com os certificados digitais da empresa, consultados por list_certificados_vencendo. " +
    "O CPF/CNPJ é retornado mascarado (apenas os 4 últimos dígitos visíveis); a busca continua funcionando com o documento completo ou parcial. " +
    "Resultado paginado com total de registros encontrados para os filtros aplicados.",
  inputSchema: {
    busca: z.string().trim().optional().describe("Texto para buscar em razão social ou CPF/CNPJ (parcial)."),
    limite: z.number().int().min(1).max(100).default(25).describe("Máximo de registros por página."),
    offset: z.number().int().min(0).default(0).describe("Deslocamento para paginação (padrão 0)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, limite, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const [from, to] = rangeFor(limite, offset);
    let query = supabase
      .from("transportadores")
      .select(
        "id, razao_social, cpf_cnpj, contato, email, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero",
        { count: "exact" }
      )
      .order("razao_social", { ascending: true })
      .range(from, to);

    if (busca) {
      const termo = likeTerm(busca);
      query = query.or(`razao_social.ilike.${termo},cpf_cnpj.ilike.${termo}`);
    }

    const { data, error, count } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const transportadores = (data ?? []).map(
      ({ antt_numero, alvara_numero, certificado_numero, cpf_cnpj, ...t }) => ({
        ...t,
        cpf_cnpj: maskDocumento(cpf_cnpj),
        tem_antt: temDocumento(antt_numero),
        tem_alvara: temDocumento(alvara_numero),
        tem_certificado: temDocumento(certificado_numero),
      })
    );
    const payload = {
      transportadores,
      ...paginationMeta(transportadores.length, count ?? null, limite, offset),
      filtros_aplicados: { busca: busca ?? null },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
