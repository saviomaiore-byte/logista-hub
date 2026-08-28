import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reportDbError } from "@/lib/dbError";

export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role: string;
}

export const usuariosKey = ["usuarios"] as const;
export const usuariosPerfisKey = ["usuarios", "perfis"] as const;
export const usuariosRolesKey = ["usuarios", "roles"] as const;

/** Perfis cadastrados, ordenados por created_at desc (mesma consulta anterior). */
export function useUsuariosPerfis(enabled: boolean) {
  return useQuery({
    queryKey: usuariosPerfisKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportDbError("carregar usuários", error)) throw error;
      return (data || []) as Profile[];
    },
  });
}

/** Papéis (roles) dos usuários — mesma consulta anterior, sem ordenação. */
export function useUsuariosRoles(enabled: boolean) {
  return useQuery({
    queryKey: usuariosRolesKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");

      if (reportDbError("carregar permissões", error)) throw error;
      return (data || []) as UserRole[];
    },
  });
}

/** Concede papel de admin — mesmo payload da versão anterior. */
export function useTornarAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" } as any);

      if (reportDbError("adicionar permissão de admin", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosPerfisKey });
      queryClient.invalidateQueries({ queryKey: usuariosRolesKey });
    },
  });
}

/** Remove papel de admin — mesmos filtros da versão anterior. */
export function useRemoverAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (reportDbError("remover permissão de admin", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosPerfisKey });
      queryClient.invalidateQueries({ queryKey: usuariosRolesKey });
    },
  });
}

/** Remove o perfil do usuário (auth.users não é removível pelo cliente). */
export function useRemoverPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

      if (reportDbError("remover usuário", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usuariosPerfisKey });
      queryClient.invalidateQueries({ queryKey: usuariosRolesKey });
    },
  });
}
