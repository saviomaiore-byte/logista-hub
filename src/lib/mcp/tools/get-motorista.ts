import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_motorista",
  title: "Detalhar motorista",
  description:
    "Retorna o cadastro completo de um motorista pelo id, incluindo documentos, vencimentos e transportadoras vinculadas.",
  inputSchema: { id: z.string().uuid().describe("Identificador do motorista.") },
  outputSchema: {
    motorista: z.object({
      id: z.string(),
      nome: z.string(),
      cpf: z.string().nullable(),
      telefone: z.string().nullable(),
      email: z.string().nullable(),
      cidade: z.string().nullable(),
      estado: z.string().nullable(),
      status: z.string().nullable(),
      situacao_operacional: z.string().nullable(),
      is_transportador_proprio: z.boolean().nullable(),
      cnh_numero: z.string().nullable(),
      cnh_vencimento: z.string().nullable(),
      mopp_numero: z.string().nullable(),
      mopp_vencimento: z.string().nullable(),
      mopp_vitalicio: z.boolean().nullable(),
      antt_numero: z.string().nullable(),
      antt_vencimento: z.string().nullable(),
      alvara_numero: z.string().nullable(),
      alvara_vencimento: z.string().nullable(),
      certificado_numero: z.string().nullable(),
      certificado_vencimento: z.string().nullable(),
      created_at: z.string().nullable(),
      updated_at: z.string().nullable(),
    }),
    transportadores: z.array(
      z.object({
        transportador_id: z.string().nullable(),
        transportadores: z
          .object({
            id: z.string(),
            razao_social: z.string(),
            cpf_cnpj: z.string().nullable(),
            status: z.string().nullable(),
            situacao_operacional: z.string().nullable(),
          })
          .nullable(),
      })
    ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    const { data: motorista, error } = await supabase
      .from("motoristas")
      .select(
        [
          "id",
          "nome",
          "cpf",
          "telefone",
          "email",
          "cidade",
          "estado",
          "status",
          "situacao_operacional",
          "is_transportador_proprio",
          "cnh_numero",
          "cnh_vencimento",
          "mopp_numero",
          "mopp_vencimento",
          "mopp_vitalicio",
          "antt_numero",
          "antt_vencimento",
          "alvara_numero",
          "alvara_vencimento",
          "certificado_numero",
          "certificado_vencimento",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!motorista)
      return { content: [{ type: "text", text: "Motorista não encontrado." }], isError: true };

    const { data: vinculos } = await supabase
      .from("transportador_motoristas")
      .select("transportador_id, transportadores(id, razao_social, cpf_cnpj, status, situacao_operacional)")
      .eq("motorista_id", id);

    const payload = { motorista, transportadores: vinculos ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
