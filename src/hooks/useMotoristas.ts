import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportDbError } from "@/lib/dbError";
import type { Motorista } from "@/components/motorista/types";

/**
 * Entidade Motoristas.
 *
 * Cobre a listagem central (`motoristas`), os vínculos N:N com transportadores
 * (`transportador_motoristas`) e os anexos do motorista (`motorista_arquivos`
 * + storage bucket `documentos`).
 *
 * As regras de aptidão continuam em `src/lib/aptidao.ts` — este hook apenas
 * entrega os dados brutos, sem duplicar nenhum cálculo.
 */

/** Prefixo de cache da entidade. */
export const motoristasKey = ["motoristas"] as const;

/** Vínculos motorista ↔ transportador (tabela de junção). */
export const motoristaVinculosKey = ["transportador-motoristas"] as const;

/** Anexos de um motorista específico. */
export const motoristaArquivosKey = (motoristaId: string) =>
  ["motoristas", "arquivos", motoristaId] as const;

export interface MotoristaArquivo {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

/** Listagem central de motoristas, ordenada por nome. */
export function useMotoristas() {
  return useQuery({
    queryKey: motoristasKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("motoristas").select("*").order("nome");

      if (error) {
        console.error("[db] Falha ao carregar motoristas", error);
        toast.error("Erro ao carregar motoristas");
        throw error;
      }
      return (data as Motorista[]) || [];
    },
  });
}

/** Mapa motoristaId -> transportadorIds[], usado pelo filtro e pela lista. */
export function useMotoristaVinculos() {
  return useQuery({
    queryKey: motoristaVinculosKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportador_motoristas")
        .select("motorista_id, transportador_id");

      if (reportDbError("carregar vínculos de transportadoras", error, toast.error)) throw error;

      const map: Record<string, string[]> = {};
      (data || []).forEach((link) => {
        if (!map[link.motorista_id]) map[link.motorista_id] = [];
        map[link.motorista_id].push(link.transportador_id);
      });
      return map;
    },
  });
}

/**
 * Sincroniza os vínculos de transportadoras de um motorista.
 * Mantém exatamente a lógica anterior: remove os que saíram, insere os novos.
 */
async function syncTransportadoraLinks(motoristaId: string, newTransportadoraIds: string[]) {
  const { data: current, error: currentError } = await supabase
    .from("transportador_motoristas")
    .select("id, transportador_id")
    .eq("motorista_id", motoristaId);

  if (reportDbError("carregar vínculos do motorista", currentError, toast.error)) return;

  const currentIds = (current || []).map((c) => c.transportador_id);

  const toRemove = (current || []).filter((c) => !newTransportadoraIds.includes(c.transportador_id));
  for (const r of toRemove) {
    const { error: removeError } = await supabase
      .from("transportador_motoristas")
      .delete()
      .eq("id", r.id);
    if (reportDbError("remover vínculo de transportadora", removeError, toast.error)) return;
  }

  const toAdd = newTransportadoraIds.filter((id) => !currentIds.includes(id));
  if (toAdd.length > 0) {
    const { error: addError } = await supabase.from("transportador_motoristas").insert(
      toAdd.map((transportador_id) => ({ transportador_id, motorista_id: motoristaId })),
    );
    if (reportDbError("vincular transportadora", addError, toast.error)) return;
  }
}

type MotoristaRow = Record<string, unknown>;

/**
 * Criação de motorista + vínculos.
 * O tratamento de CPF duplicado (23505) permanece na página, por isso a
 * mutation devolve o erro sem exibir toast próprio.
 */
export function useCriarMotorista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      row,
      transportadoras,
    }: {
      row: MotoristaRow;
      transportadoras: string[];
    }) => {
      const { data: inserted, error } = await supabase
        .from("motoristas")
        .insert(row as never)
        .select()
        .single();

      if (error) throw error;

      if (inserted && transportadoras.length > 0) {
        await syncTransportadoraLinks(inserted.id, transportadoras);
      }
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motoristasKey });
      queryClient.invalidateQueries({ queryKey: motoristaVinculosKey });
    },
  });
}

/** Atualização de motorista + sincronização dos vínculos. */
export function useAtualizarMotorista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      row,
      transportadoras,
    }: {
      id: string;
      row: MotoristaRow;
      transportadoras: string[];
    }) => {
      const { error } = await supabase
        .from("motoristas")
        .update(row as never)
        .eq("id", id);

      if (error) throw error;

      await syncTransportadoraLinks(id, transportadoras);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motoristasKey });
      queryClient.invalidateQueries({ queryKey: motoristaVinculosKey });
    },
  });
}

/** Exclusão de motorista. */
export function useExcluirMotorista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("motoristas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motoristasKey });
      queryClient.invalidateQueries({ queryKey: motoristaVinculosKey });
    },
  });
}

/** Anexos de um motorista (tabela `motorista_arquivos`). */
export function useMotoristaArquivos(motoristaId: string) {
  return useQuery({
    queryKey: motoristaArquivosKey(motoristaId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motorista_arquivos")
        .select("*")
        .eq("motorista_id", motoristaId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[db] Falha ao carregar arquivos", error);
        toast.error("Erro ao carregar arquivos");
        throw error;
      }
      return (data as MotoristaArquivo[]) || [];
    },
  });
}

/**
 * Registro do metadado do anexo após o upload no storage.
 * O upload em si (bucket `documentos`, path `${userId}/motoristas/...`)
 * permanece no componente, sem qualquer alteração.
 */
export function useCriarMotoristaArquivo(motoristaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (row: {
      motorista_id: string;
      nome_arquivo: string;
      arquivo_url: string;
      tipo_arquivo: string | null;
      tamanho_bytes: number;
    }) => {
      const { error } = await supabase.from("motorista_arquivos").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motoristaArquivosKey(motoristaId) });
    },
  });
}

/** Exclusão do registro do anexo (a remoção no storage segue no componente). */
export function useExcluirMotoristaArquivo(motoristaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("motorista_arquivos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: motoristaArquivosKey(motoristaId) });
    },
  });
}
