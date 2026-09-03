import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportDbError } from "@/lib/dbError";
import { useAuth } from "@/contexts/AuthContext";

export interface AlertaArquivado {
  id: string;
  user_id: string;
  entidade: string;
  entidade_id: string;
  entidade_nome: string | null;
  tipo_documento: string;
  vencimento: string;
  created_at: string;
}

export interface NovoAlertaArquivado {
  entidade: string;
  entidade_id: string;
  entidade_nome: string | null;
  tipo_documento: string;
  vencimento: string;
}

export const alertasArquivadosKey = ["alertas_arquivados"] as const;

/** Chave estável de um alerta (entidade + documento + vencimento). */
export function alertaKey(
  entidadeId: string,
  tipoDocumento: string,
  vencimento: string
) {
  return `${entidadeId}|${tipoDocumento}|${vencimento}`;
}

export function useAlertasArquivados() {
  return useQuery({
    queryKey: alertasArquivadosKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_arquivados")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportDbError("carregar alertas arquivados", error, toast.error)) throw error;
      return (data || []) as AlertaArquivado[];
    },
  });
}

export function useArquivarAlerta() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alerta: NovoAlertaArquivado) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("alertas_arquivados")
        .insert({ ...alerta, user_id: user.id });

      if (reportDbError("arquivar alerta", error, toast.error)) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: alertasArquivadosKey });
      await queryClient.refetchQueries({ queryKey: alertasArquivadosKey });
    },
  });
}

export function useDesarquivarAlerta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alertas_arquivados").delete().eq("id", id);
      if (reportDbError("desarquivar alerta", error, toast.error)) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: alertasArquivadosKey });
      await queryClient.refetchQueries({ queryKey: alertasArquivadosKey });
    },
  });
}
