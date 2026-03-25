import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Segurado {
  nome: string;
  certificado: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  premio_seguro: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- JWT Verification ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Token de autenticação ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- End JWT Verification ---

    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const allSegurados: Segurado[] = [];

    const batchSize = 2;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      const imageContents = batch.map((img: string) => ({
        type: "image_url" as const,
        image_url: {
          url: img.startsWith("data:") ? img : `data:image/png;base64,${img}`,
        },
      }));

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Você é um extrator de dados de apólices de seguro. Extraia TODOS os segurados (pessoas) listados nas tabelas das imagens. 
Preserve os nomes EXATAMENTE como estão escritos, com acentos e maiúsculas/minúsculas.
Para cada segurado extraia: nome completo, número do certificado, data início vigência, data fim vigência e valor do prêmio do seguro.
Datas devem estar no formato DD/MM/YYYY.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extraia todos os dados dos segurados destas páginas da apólice de seguro.",
                  },
                  ...imageContents,
                ],
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_segurados",
                  description:
                    "Extrair dados de segurados da apólice de seguro",
                  parameters: {
                    type: "object",
                    properties: {
                      segurados: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            nome: {
                              type: "string",
                              description: "Nome completo do segurado",
                            },
                            certificado: {
                              type: "string",
                              description: "Número do certificado",
                            },
                            vigencia_inicio: {
                              type: "string",
                              description: "Data início da vigência (DD/MM/YYYY)",
                            },
                            vigencia_fim: {
                              type: "string",
                              description: "Data fim da vigência (DD/MM/YYYY)",
                            },
                            premio_seguro: {
                              type: "number",
                              description: "Valor do prêmio do seguro",
                            },
                          },
                          required: ["nome"],
                        },
                      },
                    },
                    required: ["segurados"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "extract_segurados" },
            },
          }),
        }
      );

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const result = await response.json();
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          if (parsed.segurados) {
            allSegurados.push(...parsed.segurados);
          }
        } catch (parseErr) {
          console.error("Parse error:", parseErr);
        }
      }
    }

    const unique = new Map<string, Segurado>();
    for (const s of allSegurados) {
      const key = s.nome.trim().toUpperCase();
      if (!unique.has(key)) {
        unique.set(key, s);
      }
    }

    return new Response(
      JSON.stringify({ segurados: Array.from(unique.values()) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
