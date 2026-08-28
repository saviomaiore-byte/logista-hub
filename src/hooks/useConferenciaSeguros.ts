import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { reportDbError } from "@/lib/dbError";
import type { Conferencia, ConferenciaItem, Motorista } from "@/components/seguro/types";

/**
 * Entidade Conferência de Seguros.
 *
 * Cobre `conferencia_seguros` e `conferencia_seguros_itens`.
 * Os dados extraídos por IA (`conferencia_seguros_extraidos`) continuam
 * exclusivamente em `src/hooks/usePdfExtraction.ts` — o fluxo de extração
 * não foi alterado nesta etapa.
 */

export const conferenciasKey = ["conferencia-seguros"] as const;
export const conferenciaItensKey = (conferenciaId: string | null) =>
  ["conferencia-seguros", "itens", conferenciaId] as const;
export const motoristasAtivosKey = ["motoristas", "ativos"] as const;

/** Lista de conferências, mais recentes primeiro. */
export function useConferencias() {
  return useQuery({
    queryKey: conferenciasKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferencia_seguros")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportDbError("carregar conferências", error)) throw error;
      return (data as Conferencia[]) || [];
    },
  });
}

/** Itens (motoristas confrontados) da conferência selecionada. */
export function useConferenciaItens(conferenciaId: string | null) {
  return useQuery({
    queryKey: conferenciaItensKey(conferenciaId),
    queryFn: async () => {
      if (!conferenciaId) return [];
      const { data, error } = await supabase
        .from("conferencia_seguros_itens")
        .select("*, motoristas(nome, cpf, status)")
        .eq("conferencia_id", conferenciaId)
        .order("created_at");

      if (reportDbError("carregar itens da conferência", error)) throw error;
      return (data as ConferenciaItem[]) || [];
    },
    enabled: !!conferenciaId,
  });
}

/** Motoristas ativos usados na criação da conferência e no comparativo. */
export function useMotoristasAtivos() {
  return useQuery({
    queryKey: motoristasAtivosKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, nome, cpf, status")
        .eq("status", "ativo")
        .order("nome");

      if (reportDbError("carregar motoristas ativos", error)) throw error;
      return (data as Motorista[]) || [];
    },
  });
}

/**
 * Criação da conferência + itens para todos os motoristas ativos.
 * Mesma ordem de operações e mesmo payload da versão anterior.
 */
export function useCriarConferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      titulo,
      periodo_referencia,
      arquivo_apolice_url,
      observacoes,
      motoristas,
    }: {
      titulo: string;
      periodo_referencia: string;
      arquivo_apolice_url: string;
      observacoes: string;
      motoristas: Motorista[] | undefined;
    }) => {
      const { data: conf, error: confError } = await supabase
        .from("conferencia_seguros")
        .insert({
          titulo,
          periodo_referencia,
          arquivo_apolice_url: arquivo_apolice_url || null,
          observacoes: observacoes || null,
        })
        .select()
        .single();

      if (reportDbError("criar conferência", confError)) throw confError;

      if (motoristas && motoristas.length > 0) {
        const items = motoristas.map((m) => ({
          conferencia_id: conf.id,
          motorista_id: m.id,
          coberto: false,
        }));
        const { error: itemsError } = await supabase
          .from("conferencia_seguros_itens")
          .insert(items);
        if (reportDbError("criar itens da conferência", itemsError)) throw itemsError;
      }

      return conf as Conferencia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conferenciasKey });
    },
  });
}

/** Marca/desmarca o item como coberto. */
export function useAtualizarItemCoberto(conferenciaId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, coberto }: { itemId: string; coberto: boolean }) => {
      const { error } = await supabase
        .from("conferencia_seguros_itens")
        .update({ coberto })
        .eq("id", itemId);
      if (reportDbError("atualizar cobertura", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conferenciaItensKey(conferenciaId) });
    },
  });
}

/** Observação livre do item da conferência. */
export function useAtualizarItemObservacoes(conferenciaId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, observacoes }: { itemId: string; observacoes: string }) => {
      const { error } = await supabase
        .from("conferencia_seguros_itens")
        .update({ observacoes: observacoes || null })
        .eq("id", itemId);
      if (reportDbError("atualizar observação", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conferenciaItensKey(conferenciaId) });
    },
  });
}

/** Exclusão da conferência. */
export function useExcluirConferencia() {
  const queryClient = useQueryClient();

  return useMutation({
mutationFn: async (id: string) => {
      const { error } = await supabase.from("conferencia_seguros").delete().eq("id", id);
      if (reportDbError("excluir conferência", error)) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: conferenciasKey });
      queryClient.invalidateQueries({ queryKey: conferenciaItensKey(id) });
    },
  });
}

/** Anexa ou remove a apólice PDF da conferência (coluna `arquivo_apolice_url`). */
export function useAtualizarApoliceConferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string | null }) => {
      const { error } = await supabase
        .from("conferencia_seguros")
        .update({ arquivo_apolice_url: url })
        .eq("id", id);
      if (reportDbError(url ? "anexar apólice" : "remover apólice", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conferenciasKey });
    },
  });
}
