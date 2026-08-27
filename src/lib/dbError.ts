// Padronização do tratamento de erros vindos do banco (PostgREST/Supabase).
// Uso: if (reportDbError("carregar motoristas", error, msg => toast.error(msg))) return;

export function dbErrorMessage(error: unknown, contexto: string): string {
  const raw = (error as { message?: string } | null)?.message ?? "";

  if (/row-level security|permission denied|not authorized/i.test(raw)) {
    return `Sem permissão para ${contexto}.`;
  }
  if (/duplicate key|already exists|unique constraint/i.test(raw)) {
    return `Registro duplicado ao ${contexto}.`;
  }
  if (/violates foreign key/i.test(raw)) {
    return `Não foi possível ${contexto}: existem registros vinculados.`;
  }
  if (/failed to fetch|networkerror|timeout/i.test(raw)) {
    return `Falha de conexão ao ${contexto}. Tente novamente.`;
  }

  return raw ? `Erro ao ${contexto}: ${raw}` : `Erro ao ${contexto}.`;
}

/**
 * Registra o erro no console e (opcionalmente) notifica o usuário.
 * Retorna `true` quando houve erro, permitindo `if (reportDbError(...)) return;`
 */
export function reportDbError(
  contexto: string,
  error: unknown,
  notify?: (message: string) => void,
): boolean {
  if (!error) return false;

  console.error(`[db] Falha ao ${contexto}`, error);
  notify?.(dbErrorMessage(error, contexto));
  return true;
}
