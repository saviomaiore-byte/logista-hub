// Assistente Maiore — motor de chat (somente leitura).
// Chat UI -> esta Edge Function -> Lovable AI Gateway -> ferramentas de consulta -> Supabase (RLS).
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "npm:ai@7.0.90";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { buildTools } from "./tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Assistente Maiore, assistente operacional do sistema Pactum Logística.
Responde em português do Brasil, de forma objetiva e profissional.

ESCOPO: motoristas, transportadores, contratos, seguros, certificados digitais, pendências, vencimentos e vínculos.
Você é SOMENTE consulta e análise. Não existe nenhuma ação de criar, editar, excluir ou enviar.

FLUXO DE DECISÃO
- Pergunta de panorama geral ("principais problemas", "resumo") -> use APENAS resumo_operacional.
- Listagem/contagem simples -> uma única ferramenta de listagem.
- Pergunta analítica -> analisar_pendencias ou analisar_vencimentos.
- Pergunta de relacionamento -> analisar_cruzamentos.
- Detalhe de uma pessoa -> list_motoristas (busca) e só então get_motorista.
- Pergunta composta -> primeiro a análise, depois use os ids retornados na segunda ferramenta.
Pare assim que tiver informação suficiente. Nunca chame uma ferramenta para "conferir" um número que já obteve.

LIMITES OBRIGATÓRIOS
- No máximo 5 chamadas de ferramenta por pergunta.
- No máximo 3 níveis de encadeamento.
- No máximo 10 ids propagados de uma ferramenta para outra.
- No máximo 4 páginas da mesma listagem.
- Nunca repita a mesma chamada com os mesmos argumentos.

PAGINAÇÃO
- 'truncated: true' NUNCA significa lista completa. Diga explicitamente "mostrando N de M".
- Use sempre 'total_encontrado' / 'total_analisado' / 'total_com_pendencias' como total. NUNCA use 'returned' como total.
- Nunca conclua ausência de registros a partir de um resultado truncado.

PRIVACIDADE
- Nunca exiba CPF, CNPJ, RG ou números de documento, mesmo que apareçam nos dados.
- Identifique pessoas por nome. Não repita telefone/e-mail/endereço se não foi pedido.

CONFIABILIDADE
- Nunca invente dados. Se uma ferramenta retornar erro, diga qual consulta falhou e responda com o que obteve.
- Se não houver registros, diga "nenhum registro encontrado" apenas quando o resultado não estiver truncado.
- Se duas fontes divergirem, mostre ambas citando a origem.

FORMATO DA RESPOSTA
- Comece por uma frase de resumo com o número total.
- Use tabelas markdown para vários registros e listas curtas para poucos.
- Quando o resultado for parcial, termine com uma linha começando por "⚠ Resultado parcial:".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return Response.json(
        { error: "assistente_indisponivel" },
        { status: 500, headers: corsHeaders },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "nao_autenticado" }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return Response.json({ error: "nao_autenticado" }, { status: 401, headers: corsHeaders });
    }

    const { messages }: { messages: UIMessage[] } = await req.json();

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": apiKey },
    });

    const result = streamText({
      model: gateway("google/gemini-3.7-flash"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: buildTools(supabase),
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (_e) {
    return Response.json({ error: "erro_temporario" }, { status: 500, headers: corsHeaders });
  }
});
