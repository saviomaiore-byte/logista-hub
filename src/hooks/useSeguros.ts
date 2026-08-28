import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reportDbError } from "@/lib/dbError";
import type { Seguro, SeguroFormValues } from "@/components/seguro/types";
import { formValuesToPayload } from "@/components/seguro/types";

/**
 * Entidade Seguros (tabela `seguros`).
 *
 * Migração estrutural: as mesmas consultas/mutations que existiam em
 * `src/pages/Seguros.tsx`, agora centralizadas em React Query.
 * Payloads, colunas, nulls e ordenação permanecem idênticos.
 *
 * Os anexos de seguro são apenas a coluna `arquivo_url` (upload feito pelo
 * componente FileUpload no bucket `documentos`) — não há tabela auxiliar.
 */

export const segurosKey = ["seguros"] as const;

/** Listagem de seguros com o segurado vinculado, ordenada por vigência final. */
export function useSeguros() {
  return useQuery({
    queryKey: segurosKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seguros")
        .select("*, motoristas(nome, cpf)")
        .order("vigencia_fim", { ascending: true });

      if (reportDbError("carregar seguros", error)) throw error;
      return (data as Seguro[]) || [];
    },
  });
}

/** Criação de seguro — payload idêntico ao anterior. */
export function useCriarSeguro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SeguroFormValues) => {
      const { error } = await supabase.from("seguros").insert(formValuesToPayload(data));
      if (reportDbError("cadastrar seguro", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segurosKey });
    },
  });
}

/** Atualização de seguro — payload idêntico ao anterior. */
export function useAtualizarSeguro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SeguroFormValues }) => {
      const { error } = await supabase
        .from("seguros")
        .update(formValuesToPayload(data))
        .eq("id", id);
      if (reportDbError("atualizar seguro", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segurosKey });
    },
  });
}

/** Exclusão de seguro. */
export function useExcluirSeguro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seguros").delete().eq("id", id);
      if (reportDbError("excluir seguro", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: segurosKey });
    },
  });
}
