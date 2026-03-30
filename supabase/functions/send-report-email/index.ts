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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatParagraph(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function base64Utf8(value: string): string {
  let binary = "";
  for (const byte of encoder.encode(value)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function encodeMimeHeader(value: string): string {
  return `=?UTF-8?B?${base64Utf8(value)}?=`;
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function dotStuff(value: string): string {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

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

  dados.forEach((transportador) =>
    transportador.motoristas.forEach((motorista) => {
      totalMotoristas++;
      if (motorista.apto) aptos++;
      else inaptos++;
    })
  );

  let html = `
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
      h1 { color: #1a2b4a; font-size: 22px; }
      h2 { color: #1a2b4a; font-size: 16px; margin-top: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 13px; }
      th { background: #1a2b4a; color: white; padding: 8px 10px; text-align: left; }
      td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
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
    <p style="color: #666; font-size: 13px;">Gerado em: ${escapeHtml(dataAtual)}</p>
    <p class="corpo">${formatParagraph(corpo)}</p>

    <div class="resumo">
      <strong>Resumo:</strong><br/>
      <span>Transportadoras: <strong>${dados.length}</strong></span>
      <span>Total Motoristas: <strong>${totalMotoristas}</strong></span>
      <span class="apto">Aptos: ${aptos}</span>
      <span class="inapto">Inaptos: ${inaptos}</span>
    </div>
  `;

  dados.forEach((transportador) => {
    html += `<h2>${escapeHtml(transportador.razao_social)} — CNPJ: ${escapeHtml(transportador.cpf_cnpj)}</h2>`;

    if (transportador.motoristas.length === 0) {
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

    transportador.motoristas.forEach((motorista) => {
      html += `
      <tr>
        <td>${escapeHtml(motorista.nome)}</td>
        <td>${escapeHtml(motorista.cpf)}</td>
        <td class="${motorista.apto ? "apto" : "inapto"}">${motorista.apto ? "APTO" : "INAPTO"}</td>
        <td>${motorista.status === "ativo" ? "Ativo" : "Inativo"}</td>
        <td>${escapeHtml(motorista.situacao_operacional)}</td>
        <td>${motorista.tem_contrato ? "Sim" : "Não"}</td>
        <td>${escapeHtml(motorista.antt_status)}</td>
        <td>${escapeHtml(motorista.certificado_status)}</td>
        <td>${escapeHtml(motorista.alvara_status)}</td>
        <td class="motivo">${motorista.motivos_inaptidao.length > 0 ? escapeHtml(motorista.motivos_inaptidao.join("; ")) : "—"}</td>
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

class SmtpSocket {
  private buffer = "";
  private conn: Deno.Conn;

  constructor(conn: Deno.Conn) {
    this.conn = conn;
  }

  async readResponse(expectedCodes?: number[]): Promise<{ code: number; message: string }> {
    const lines: string[] = [];
    let code: number | null = null;

    while (true) {
      const line = await this.readLine();
      if (line === null) throw new Error("SMTP connection closed unexpectedly");
      lines.push(line);
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;
      code = Number(match[1]);
      if (match[2] === " ") break;
    }

    if (code === null) throw new Error(`Invalid SMTP response: ${lines.join(" | ")}`);
    if (expectedCodes && !expectedCodes.includes(code)) {
      throw new Error(`SMTP ${code}: ${lines.join(" | ")}`);
    }
    return { code, message: lines.join("\n") };
  }

  async sendLine(line: string): Promise<void> {
    await this.conn.write(encoder.encode(`${line}\r\n`));
  }

  async sendRaw(value: string): Promise<void> {
    await this.conn.write(encoder.encode(value));
  }

  async upgradeToTls(hostname: string): Promise<void> {
    this.buffer = "";
    this.conn = await Deno.startTls(this.conn as Deno.TcpConn, { hostname });
  }

  async close(): Promise<void> {
    try { this.conn.close(); } catch { /* noop */ }
  }

  private async readLine(): Promise<string | null> {
    while (!this.buffer.includes("\n")) {
      const chunk = new Uint8Array(1024);
      const size = await this.conn.read(chunk);
      if (size === null) {
        if (this.buffer.length === 0) return null;
        const rest = this.buffer;
        this.buffer = "";
        return rest.replace(/\r$/, "");
      }
      this.buffer += decoder.decode(chunk.subarray(0, size));
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

  console.log(`Connecting to SMTP ${hostname}:${port}...`);
  const conn = await Deno.connect({ hostname, port });
  const socket = new SmtpSocket(conn);

  try {
    await socket.readResponse([220]);
    await socket.sendLine(`EHLO ${hostname}`);
    const ehloResp = await socket.readResponse([250]);
    console.log("EHLO response received");

    // Upgrade to STARTTLS if server supports it (standard for port 587)
    if (ehloResp.message.toUpperCase().includes("STARTTLS")) {
      console.log("STARTTLS supported, upgrading...");
      await socket.sendLine("STARTTLS");
      await socket.readResponse([220]);
      await socket.upgradeToTls(hostname);
      console.log("TLS upgrade complete");

      // Re-EHLO after TLS
      await socket.sendLine(`EHLO ${hostname}`);
      await socket.readResponse([250]);
    }

    // AUTH LOGIN
    console.log("Authenticating...");
    await socket.sendLine("AUTH LOGIN");
    await socket.readResponse([334]);
    await socket.sendLine(btoa(username));
    await socket.readResponse([334]);
    await socket.sendLine(btoa(password));
    await socket.readResponse([235]);
    console.log("Authentication successful");

    await socket.sendLine(`MAIL FROM:<${fromEnvelope}>`);
    await socket.readResponse([250]);

    for (const recipient of to) {
      await socket.sendLine(`RCPT TO:<${recipient}>`);
      await socket.readResponse([250, 251]);
    }

    await socket.sendLine("DATA");
    await socket.readResponse([354]);

    const message = [
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

    await socket.sendRaw(message);
    await socket.readResponse([250]);
    console.log("Email sent successfully");

    await socket.sendLine("QUIT");
    try { await socket.readResponse([221]); } catch { /* server may close */ }
  } finally {
    await socket.close();
  }
}
  async readResponse(expectedCodes?: number[]): Promise<{ code: number; message: string }> {
    const lines: string[] = [];
    let code: number | null = null;

    while (true) {
      const line = await this.readLine();
      if (line === null) {
        throw new Error("SMTP connection closed unexpectedly");
      }

      lines.push(line);
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;

      code = Number(match[1]);
      if (match[2] === " ") break;
    }

    if (code === null) {
      throw new Error(`Invalid SMTP response: ${lines.join(" | ")}`);
    }

    if (expectedCodes && !expectedCodes.includes(code)) {
      throw new Error(`SMTP ${code}: ${lines.join(" | ")}`);
    }

    return { code, message: lines.join("\n") };
  }

  async sendLine(line: string): Promise<void> {
    await this.conn.write(encoder.encode(`${line}\r\n`));
  }

  async sendRaw(value: string): Promise<void> {
    await this.conn.write(encoder.encode(value));
  }

  async close(): Promise<void> {
    try {
      this.conn.close();
    } catch {
      // noop
    }
  }

  private async readLine(): Promise<string | null> {
    while (!this.buffer.includes("\n")) {
      const chunk = new Uint8Array(1024);
      const size = await this.conn.read(chunk);
      if (size === null) {
        if (this.buffer.length === 0) return null;
        const rest = this.buffer;
        this.buffer = "";
        return rest.replace(/\r$/, "");
      }
      this.buffer += decoder.decode(chunk.subarray(0, size));
    }

    const lineBreakIndex = this.buffer.indexOf("\n");
    const line = this.buffer.slice(0, lineBreakIndex);
    this.buffer = this.buffer.slice(lineBreakIndex + 1);
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

  const conn = await Deno.connect({ hostname, port });
  const socket = new SmtpSocket(conn);

  try {
    await socket.readResponse([220]);
    await socket.sendLine(`EHLO ${hostname}`);
    await socket.readResponse([250]);

    const authPlain = btoa(`\u0000${username}\u0000${password}`);
    await socket.sendLine(`AUTH PLAIN ${authPlain}`);
    await socket.readResponse([235]);

    await socket.sendLine(`MAIL FROM:<${fromEnvelope}>`);
    await socket.readResponse([250]);

    for (const recipient of to) {
      await socket.sendLine(`RCPT TO:<${recipient}>`);
      await socket.readResponse([250, 251]);
    }

    await socket.sendLine("DATA");
    await socket.readResponse([354]);

    const headers = [
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

    await socket.sendRaw(headers);
    await socket.readResponse([250]);
    await socket.sendLine("QUIT");
    await socket.readResponse([221]);
  } finally {
    await socket.close();
  }
}

async function insertAuditLog(userId: string, destinatarios: string[], assunto: string, dados: z.infer<typeof TransportadorSchema>[]) {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    await serviceClient.from("audit_log").insert({
      table_name: "relatorio_envio",
      action: "SEND",
      record_id: null,
      user_id: userId,
      new_data: {
        destinatarios,
        assunto,
        data_envio: new Date().toISOString(),
        total_transportadoras: dados.length,
        total_motoristas: dados.reduce((acc, transportador) => acc + transportador.motoristas.length, 0),
      },
    });
  } catch (error) {
    console.error("Failed to insert audit log:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { destinatarios, assunto, corpo, dados } = parsed.data;
    const htmlContent = buildHtmlReport(dados, corpo);

    await sendEmailViaSMTP(destinatarios, assunto, htmlContent);
    await insertAuditLog(claimsData.claims.sub, destinatarios, assunto, dados);

    return new Response(JSON.stringify({
      success: true,
      message: `Relatório enviado com sucesso para ${destinatarios.length} destinatário(s).`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unexpected error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
