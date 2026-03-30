import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MotoristaSchema = z.object({
  nome: z.string(),
  cpf: z.string(),
  apto: z.boolean(),
  status: z.string().nullable(),
  situacao_operacional: z.string(),
  tem_contrato: z.boolean(),
  antt_status: z.string(),
  certificado_status: z.string(),
  alvara_status: z.string(),
  motivos_inaptidao: z.array(z.string()),
});

const TransportadorSchema = z.object({
  razao_social: z.string(),
  cpf_cnpj: z.string(),
  motoristas: z.array(MotoristaSchema),
});

const BodySchema = z.object({
  destinatarios: z.array(z.string().email()).min(1),
  assunto: z.string().min(1).max(255),
  corpo: z.string().min(1),
  dados: z.array(TransportadorSchema),
});

function buildHtmlReport(dados: z.infer<typeof TransportadorSchema>[], corpo: string): string {
  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let totalMotoristas = 0;
  let aptos = 0;
  let inaptos = 0;

  dados.forEach((t) =>
    t.motoristas.forEach((m) => {
      totalMotoristas++;
      if (m.apto) aptos++;
      else inaptos++;
    })
  );

  let html = `
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
      h1 { color: #1a2b4a; font-size: 22px; }
      h2 { color: #1a2b4a; font-size: 16px; margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 13px; }
      th { background: #1a2b4a; color: white; padding: 8px 10px; text-align: left; }
      td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
      tr:nth-child(even) { background: #f9fafb; }
      .apto { color: #16a34a; font-weight: bold; }
      .inapto { color: #dc2626; font-weight: bold; }
      .resumo { background: #f0f4ff; padding: 16px; border-radius: 8px; margin: 16px 0; }
      .resumo span { margin-right: 24px; }
      .motivo { color: #dc2626; font-size: 12px; }
      p.corpo { color: #555; margin-bottom: 20px; }
      .footer { margin-top: 30px; color: #999; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Relatório Semanal de Motoristas</h1>
    <p style="color: #666; font-size: 13px;">Gerado em: ${dataAtual}</p>
    <p class="corpo">${corpo}</p>
    
    <div class="resumo">
      <strong>Resumo:</strong><br/>
      <span>Transportadoras: <strong>${dados.length}</strong></span>
      <span>Total Motoristas: <strong>${totalMotoristas}</strong></span>
      <span class="apto">Aptos: ${aptos}</span>
      <span class="inapto">Inaptos: ${inaptos}</span>
    </div>
  `;

  dados.forEach((t) => {
    html += `<h2>${t.razao_social} — CNPJ: ${t.cpf_cnpj}</h2>`;

    if (t.motoristas.length === 0) {
      html += `<p style="color: #999;">Nenhum motorista vinculado.</p>`;
      return;
    }

    html += `
    <table>
      <tr>
        <th>Nome</th>
        <th>CPF</th>
        <th>Aptidão</th>
        <th>Status</th>
        <th>Situação</th>
        <th>Contrato</th>
        <th>ANTT</th>
        <th>Certificado</th>
        <th>Alvará</th>
        <th>Motivos Inaptidão</th>
      </tr>
    `;

    t.motoristas.forEach((m) => {
      html += `
      <tr>
        <td>${m.nome}</td>
        <td>${m.cpf}</td>
        <td class="${m.apto ? "apto" : "inapto"}">${m.apto ? "APTO" : "INAPTO"}</td>
        <td>${m.status === "ativo" ? "Ativo" : "Inativo"}</td>
        <td>${m.situacao_operacional}</td>
        <td>${m.tem_contrato ? "Sim" : "Não"}</td>
        <td>${m.antt_status}</td>
        <td>${m.certificado_status}</td>
        <td>${m.alvara_status}</td>
        <td class="motivo">${m.motivos_inaptidao.length > 0 ? m.motivos_inaptidao.join("; ") : "—"}</td>
      </tr>
      `;
    });

    html += `</table>`;
  });

  html += `
    <div class="footer">
      <p>Este relatório foi gerado automaticamente pelo sistema Pactum Logística.</p>
    </div>
  </body>
  </html>`;

  return html;
}

async function sendEmailViaSMTP(
  to: string[],
  subject: string,
  htmlContent: string
): Promise<void> {
  const client = new SmtpClient();

  await client.connectTLS({
    hostname: Deno.env.get("SMTP_HOST") ?? "smtp.titan.email",
    port: 587,
    username: Deno.env.get("SMTP_USER") ?? "",
    password: Deno.env.get("SMTP_PASS") ?? "",
  });

  await client.send({
    from: Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER") ?? "",
    to: to,
    subject: subject,
    content: "Este e-mail requer um cliente com suporte a HTML.",
    html: htmlContent,
  });

  await client.close();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { destinatarios, assunto, corpo, dados } = parsed.data;
    const htmlContent = buildHtmlReport(dados, corpo);

    // Send email via SMTP
    await sendEmailViaSMTP(destinatarios, assunto, htmlContent);

    // Log the send
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await serviceClient.from("audit_log").insert({
      table_name: "relatorio_envio",
      action: "SEND",
      record_id: null,
      user_id: user.id,
      new_data: {
        destinatarios,
        assunto,
        data_envio: new Date().toISOString(),
        total_transportadoras: dados.length,
        total_motoristas: dados.reduce((acc, t) => acc + t.motoristas.length, 0),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatório enviado com sucesso para ${destinatarios.length} destinatário(s).`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
