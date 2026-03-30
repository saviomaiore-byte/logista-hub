import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

function escapeHtml(v: string): string {
  return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

function formatParagraph(v: string): string {
  return escapeHtml(v).replace(/\r?\n/g, "<br />");
}

function base64Utf8(v: string): string {
  let b = "";
  for (const byte of encoder.encode(v)) b += String.fromCharCode(byte);
  return btoa(b);
}

function encodeMimeHeader(v: string): string {
  return `=?UTF-8?B?${base64Utf8(v)}?=`;
}

function extractEmailAddress(v: string): string {
  const m = v.match(/<([^>]+)>/);
  return (m?.[1] ?? v).trim();
}

function getRequiredEnv(name: string): string {
  const v = Deno.env.get(name)?.trim();
  if (!v) throw new Error(`Missing required secret: ${name}`);
  return v;
}

function dotStuff(v: string): string {
  return v.replace(/\r?\n/g, "\r\n").split("\r\n").map(l => l.startsWith(".") ? `.${l}` : l).join("\r\n");
}

function buildHtmlReport(dados: z.infer<typeof TransportadorSchema>[], corpo: string): string {
  const dataAtual = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  let total = 0, aptos = 0, inaptos = 0;
  dados.forEach(t => t.motoristas.forEach(m => { total++; if (m.apto) aptos++; else inaptos++; }));

  let html = `<html><head><meta charset="UTF-8"/><style>
body{font-family:Arial,sans-serif;color:#333;margin:0;padding:20px}
h1{color:#1a2b4a;font-size:22px}
h2{color:#1a2b4a;font-size:16px;margin-top:24px;border-bottom:2px solid #e5e7eb;padding-bottom:6px}
table{border-collapse:collapse;width:100%;margin-top:10px;font-size:13px}
th{background:#1a2b4a;color:#fff;padding:8px 10px;text-align:left}
td{padding:6px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
tr:nth-child(even){background:#f9fafb}
.apto{color:#16a34a;font-weight:bold}.inapto{color:#dc2626;font-weight:bold}
.resumo{background:#f0f4ff;padding:16px;border-radius:8px;margin:16px 0}
.resumo span{margin-right:24px}
.motivo{color:#dc2626;font-size:12px}
p.corpo{color:#555;margin-bottom:20px}
.footer{margin-top:30px;color:#999;font-size:12px}
</style></head><body>
<h1>Relatório Semanal de Motoristas</h1>
<p style="color:#666;font-size:13px">Gerado em: ${escapeHtml(dataAtual)}</p>
<p class="corpo">${formatParagraph(corpo)}</p>
<div class="resumo"><strong>Resumo:</strong><br/>
<span>Transportadoras: <strong>${dados.length}</strong></span>
<span>Total Motoristas: <strong>${total}</strong></span>
<span class="apto">Aptos: ${aptos}</span>
<span class="inapto">Inaptos: ${inaptos}</span></div>`;

  for (const t of dados) {
    html += `<h2>${escapeHtml(t.razao_social)} — CNPJ: ${escapeHtml(t.cpf_cnpj)}</h2>`;
    if (t.motoristas.length === 0) { html += `<p style="color:#999">Nenhum motorista vinculado.</p>`; continue; }
    html += `<table><tr><th>Nome</th><th>CPF</th><th>Aptidão</th><th>Status</th><th>Situação</th><th>Contrato</th><th>ANTT</th><th>Certificado</th><th>Alvará</th><th>Motivos Inaptidão</th></tr>`;
    for (const m of t.motoristas) {
      html += `<tr>
<td>${escapeHtml(m.nome)}</td><td>${escapeHtml(m.cpf)}</td>
<td class="${m.apto?"apto":"inapto"}">${m.apto?"APTO":"INAPTO"}</td>
<td>${m.status==="ativo"?"Ativo":"Inativo"}</td>
<td>${escapeHtml(m.situacao_operacional)}</td>
<td>${m.tem_contrato?"Sim":"Não"}</td>
<td>${escapeHtml(m.antt_status)}</td>
<td>${escapeHtml(m.certificado_status)}</td>
<td>${escapeHtml(m.alvara_status)}</td>
<td class="motivo">${m.motivos_inaptidao.length>0?escapeHtml(m.motivos_inaptidao.join("; ")):"—"}</td></tr>`;
    }
    html += `</table>`;
  }
  html += `<div class="footer"><p>Este relatório foi gerado automaticamente pelo sistema Pactum Logística.</p></div></body></html>`;
  return html;
}

// ── SMTP client with STARTTLS support ──

class SmtpSocket {
  private buffer = "";
  private conn: Deno.Conn;
  constructor(conn: Deno.Conn) { this.conn = conn; }

  async readResponse(expected?: number[]): Promise<{ code: number; message: string }> {
    const lines: string[] = [];
    let code: number | null = null;
    while (true) {
      const line = await this.readLine();
      if (line === null) throw new Error("SMTP connection closed unexpectedly");
      lines.push(line);
      const m = line.match(/^(\d{3})([ -])(.*)$/);
      if (!m) continue;
      code = Number(m[1]);
      if (m[2] === " ") break;
    }
    if (code === null) throw new Error(`Invalid SMTP response: ${lines.join(" | ")}`);
    if (expected && !expected.includes(code)) throw new Error(`SMTP ${code}: ${lines.join(" | ")}`);
    return { code, message: lines.join("\n") };
  }

  async sendLine(line: string) { await this.conn.write(encoder.encode(`${line}\r\n`)); }
  async sendRaw(data: string) { await this.conn.write(encoder.encode(data)); }

  async upgradeToTls(hostname: string) {
    this.buffer = "";
    this.conn = await Deno.startTls(this.conn as Deno.TcpConn, { hostname });
  }

  async close() { try { this.conn.close(); } catch { /* ok */ } }

  private async readLine(): Promise<string | null> {
    while (!this.buffer.includes("\n")) {
      const chunk = new Uint8Array(1024);
      const n = await this.conn.read(chunk);
      if (n === null) {
        if (!this.buffer.length) return null;
        const rest = this.buffer; this.buffer = ""; return rest.replace(/\r$/, "");
      }
      this.buffer += decoder.decode(chunk.subarray(0, n));
    }
    const idx = this.buffer.indexOf("\n");
    const line = this.buffer.slice(0, idx);
    this.buffer = this.buffer.slice(idx + 1);
    return line.replace(/\r$/, "");
  }
}

async function sendEmailViaSMTP(to: string[], subject: string, htmlContent: string): Promise<void> {
  const hostname = getRequiredEnv("SMTP_HOST");
  const username = getRequiredEnv("SMTP_USER");
  const password = getRequiredEnv("SMTP_PASS");
  const fromHeader = getRequiredEnv("SMTP_FROM");
  const fromEnvelope = extractEmailAddress(fromHeader);
  const port = Number(Deno.env.get("SMTP_PORT") ?? "587");

  console.log(`SMTP: connecting to ${hostname}:${port}`);
  const conn = await Deno.connect({ hostname, port });
  const socket = new SmtpSocket(conn);

  try {
    await socket.readResponse([220]);

    await socket.sendLine(`EHLO ${hostname}`);
    const ehlo = await socket.readResponse([250]);

    // STARTTLS upgrade (required on port 587 for most providers)
    if (ehlo.message.toUpperCase().includes("STARTTLS")) {
      console.log("SMTP: upgrading to STARTTLS");
      await socket.sendLine("STARTTLS");
      await socket.readResponse([220]);
      await socket.upgradeToTls(hostname);

      // Re-EHLO after TLS
      await socket.sendLine(`EHLO ${hostname}`);
      await socket.readResponse([250]);
    }

    // AUTH LOGIN
    console.log("SMTP: authenticating");
    await socket.sendLine("AUTH LOGIN");
    await socket.readResponse([334]);
    await socket.sendLine(btoa(username));
    await socket.readResponse([334]);
    await socket.sendLine(btoa(password));
    await socket.readResponse([235]);
    console.log("SMTP: auth OK");

    await socket.sendLine(`MAIL FROM:<${fromEnvelope}>`);
    await socket.readResponse([250]);

    for (const r of to) {
      await socket.sendLine(`RCPT TO:<${r}>`);
      await socket.readResponse([250, 251]);
    }

    await socket.sendLine("DATA");
    await socket.readResponse([354]);

    const msg = [
      `Date: ${new Date().toUTCString()}`,
      `From: ${fromHeader}`,
      `To: ${to.join(", ")}`,
      `Subject: ${encodeMimeHeader(subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      dotStuff(htmlContent),
      ".",
      "",
    ].join("\r\n");

    await socket.sendRaw(msg);
    await socket.readResponse([250]);
    console.log("SMTP: email sent");

    await socket.sendLine("QUIT");
    try { await socket.readResponse([221]); } catch { /* server may close early */ }
  } finally {
    await socket.close();
  }
}

// ── Audit log ──

async function insertAuditLog(userId: string, destinatarios: string[], assunto: string, dados: z.infer<typeof TransportadorSchema>[]) {
  try {
    const svc = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    await svc.from("audit_log").insert({
      table_name: "relatorio_envio",
      action: "SEND",
      record_id: null,
      user_id: userId,
      new_data: {
        destinatarios, assunto,
        data_envio: new Date().toISOString(),
        total_transportadoras: dados.length,
        total_motoristas: dados.reduce((a, t) => a + t.motoristas.length, 0),
      },
    });
  } catch (e) { console.error("Audit log error:", e); }
}

// ── HTTP handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { destinatarios, assunto, corpo, dados } = parsed.data;
    const htmlContent = buildHtmlReport(dados, corpo);

    await sendEmailViaSMTP(destinatarios, assunto, htmlContent);
    await insertAuditLog(claimsData.claims.sub, destinatarios, assunto, dados);

    return new Response(JSON.stringify({ success: true, message: `Relatório enviado com sucesso para ${destinatarios.length} destinatário(s).` }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
