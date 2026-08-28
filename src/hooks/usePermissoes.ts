import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

/**
 * Reflete na UI as permissões que já existem nas policies do banco.
 * - DELETE: somente admin (policies "Only admins can delete ...").
 * - UPDATE: autor do registro (created_by) ou admin.
 *
 * O banco continua sendo a camada definitiva de segurança; aqui apenas
 * evitamos exibir ações que certamente seriam recusadas.
 */
export function usePermissoes() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  const podeEditar = (registro?: { created_by?: string | null } | null) => {
    if (isAdmin) return true;
    if (!user?.id || !registro?.created_by) return false;
    return registro.created_by === user.id;
  };

  return { isAdmin, userId: user?.id ?? null, podeEditar, podeExcluir: isAdmin };
}
