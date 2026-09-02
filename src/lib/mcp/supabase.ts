import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (or VITE_SUPABASE_URL) is required");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // Dicionário malformado; tenta os nomes legados abaixo.
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS, or SUPABASE_ANON_KEY is required");
}

/** Encaminha o token verificado para que a RLS rode como o usuário autenticado. */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser requer um token OAuth verificado");
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function notAuthenticated() {
  return {
    content: [{ type: "text" as const, text: "Não autenticado." }],
    isError: true,
  };
}

/**
 * Mascara documentos (CPF ou CPF/CNPJ) mantendo apenas os 4 últimos dígitos
 * visíveis e preservando a pontuação original. A busca continua sendo feita
 * no banco pelo valor real, então a capacidade de localizar registros não muda.
 */
export function maskDocumento(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  const digitos = value.replace(/\D/g, "");
  if (digitos.length <= 4) return value;
  let restantes = digitos.length - 4;
  return value.replace(/\d/g, (d) => (restantes-- > 0 ? "*" : d));
}

/** Presença/ausência de um documento, sem expor o número. */
export function temDocumento(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Torna seguro um valor de usuário usado dentro de uma expressão PostgREST
 * (`.or(...)`). O valor é envolvido em aspas duplas — forma em que o PostgREST
 * trata vírgulas, parênteses e pontos como texto literal — com escape de
 * barras invertidas e aspas. Buscas normais (nome, nome com espaço, CPF/CNPJ)
 * continuam funcionando exatamente como antes.
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Escapa curingas do ILIKE (`%` e `_`) para que sejam tratados como texto
 * literal. O caractere de escape padrão do LIKE/ILIKE no Postgres é `\`.
 */
export function escapeLikeWildcards(value: string): string {
  return value.replace(/([\\%_])/g, "\\$1");
}

/** Termo pronto para `ilike`, com curingas literais escapados e busca parcial. */
export function likeTerm(value: string): string {
  return quoteFilterValue(`%${escapeLikeWildcards(value)}%`);
}

/** Intervalo `[from, to]` para `.range()` a partir de limite/offset. */
export function rangeFor(limite: number, offset: number): [number, number] {
  return [offset, offset + limite - 1];
}

export function paginationMeta(returned: number, total: number | null, limite: number, offset: number) {
  const total_encontrado = total ?? null;
  const truncated =
    total_encontrado !== null ? offset + returned < total_encontrado : returned >= limite;
  return {
    returned,
    total_encontrado,
    limite,
    offset,
    truncated,
    aviso: truncated
      ? `Resultado parcial: ${returned} registro(s) nesta página${
          total_encontrado !== null ? ` de ${total_encontrado} encontrados` : ""
        } (offset ${offset}). Existem mais registros — use offset para as próximas páginas e nunca conclua ausência ou totais a partir desta página.`
      : `Resultado final da paginação: ${returned} registro(s) nesta página${
          total_encontrado !== null ? ` de ${total_encontrado} encontrados` : ""
        } (offset ${offset}).`,
  };
}
