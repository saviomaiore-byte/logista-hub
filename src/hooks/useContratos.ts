import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportDbError } from "@/lib/dbError";

/**
 * Entidade Contratos.
 *
 * Observação importante de modelagem: não existe tabela separada de anexos de
 * contrato. O componente `ContratoAnexos` opera sobre a MESMA tabela `contratos`,
 * apenas filtrada por `motorista_id` / `transportador_id`. O "anexo" é a coluna
 * `arquivo_url` da própria linha do contrato (upload feito pelo `FileUpload` no
 * storage, download via `openSignedFile`). Por isso as duas telas compartilham
 * as mesmas mutations e o mesmo prefixo de cache.
 */

/** Contrato da listagem central, com os joins de motorista/transportador. */
export interface ContratoComVinculos {
  id: string;
  created_by?: string | null;
  tipo: string;
  modelo: string | null;
  empresa: string;
  cnpj: string | null;
  data_envio: string | null;
  data_assinatura: string | null;
  status: string;
  observacoes: string | null;
  arquivo_url: string | null;
  motorista_id: string | null;
  transportador_id: string | null;
  motoristas?: { nome: string } | null;
  transportadores?: { razao_social: string } | null;
}

/** Contrato listado dentro do dialog de anexos (sem joins). */
export interface ContratoVinculado {
  id: string;
  tipo: string;
  modelo: string | null;
  empresa: string;
  cnpj: string | null;
  status: string | null;
  arquivo_url: string | null;
  data_envio: string | null;
  observacoes: string | null;
  transportador_id: string | null;
}

export interface TransportadorOption {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

/** Payload compartilhado pelo formulário da página de Contratos. */
export interface ContratoPayload {
  tipo: string;
  modelo: string;
  empresa: string;
  cnpj: string | null;
  transportador_id: string;
  motorista_id: null;
  observacoes: string | null;
  arquivo_url: string | null;
}

/** Payload do formulário embutido em ContratoAnexos. */
export interface ContratoVinculadoPayload {
  tipo: string;
  modelo: string | null;
  empresa: string;
  observacoes: string | null;
  arquivo_url: string | null;
  status: string;
  motorista_id: string | null;
  transportador_id: string | null;
}

/**
 * Query keys.
 *
 * `contratosKey` é o prefixo de toda a entidade. A lista escopada dos anexos
 * usa o MESMO prefixo (`["contratos", "vinculados", ...]`) de propósito: assim
 * um único `invalidateQueries({ queryKey: contratosKey })` atualiza tanto a
 * listagem central quanto as listas escopadas, já que todas leem a tabela
 * `contratos`. Não é invalidação "aleatória" — é a mesma entidade.
 */
export const contratosKey = ["contratos"] as const;

export const contratosVinculadosKey = (
  motoristaId?: string,
  transportadorId?: string,
) => ["contratos", "vinculados", motoristaId ?? null, transportadorId ?? null] as const;

/**
 * Transportadores usados no seletor do formulário de contrato.
 * Key própria porque o SELECT inclui `cpf_cnpj` (shape diferente dos caches de
 * transportadores já existentes em outras telas), mas fica sob o prefixo
 * `transportadores` para acompanhar invalidações daquela entidade.
 */
export const transportadoresOpcoesKey = ["transportadores", "opcoes-contrato"] as const;

export const transportadorasVinculadasKey = (motoristaId?: string) =>
  ["transportadores", "vinculadas", motoristaId ?? null] as const;

/** Listagem central de contratos, mais recentes primeiro. */
export function useContratos() {
  return useQuery({
    queryKey: contratosKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*, motoristas(nome, tipo_pessoa), transportadores(razao_social)")
        .order("created_at", { ascending: false });

      if (reportDbError("carregar contratos", error, toast.error)) throw error;

      return ((data as unknown as ContratoComVinculos[]) || []).map((contrato) => ({
        ...contrato,
        modelo: contrato.modelo ?? null,
      }));
    },
  });
}

/** Transportadores do seletor do formulário de contrato. */
export function useTransportadoresOpcoes() {
  return useQuery({
    queryKey: transportadoresOpcoesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportadores")
        .select("id, razao_social, cpf_cnpj")
        .order("razao_social", { ascending: true });

      if (reportDbError("carregar transportadores", error, toast.error)) throw error;
      return (data as TransportadorOption[]) || [];
    },
  });
}

/** Contratos vinculados a um motorista ou a um transportador (dialog de anexos). */
export function useContratosVinculados(motoristaId?: string, transportadorId?: string) {
  return useQuery({
    queryKey: contratosVinculadosKey(motoristaId, transportadorId),
    queryFn: async () => {
      let query = supabase
        .from("contratos")
        .select("*")
        .order("created_at", { ascending: false });

      if (motoristaId) query = query.eq("motorista_id", motoristaId);
      if (transportadorId) query = query.eq("transportador_id", transportadorId);

      const { data, error } = await query;

      if (reportDbError("carregar contratos", error, toast.error)) throw error;
      return (data as ContratoVinculado[]) || [];
    },
  });
}

/**
 * Transportadoras vinculadas a um motorista (via `transportador_motoristas`),
 * usadas no seletor do formulário embutido em ContratoAnexos.
 */
export function useTransportadorasVinculadas(motoristaId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: transportadorasVinculadasKey(motoristaId),
    enabled: enabled && !!motoristaId,
    queryFn: async () => {
      const { data: vinculos, error: vinculosError } = await supabase
        .from("transportador_motoristas")
        .select("transportador_id")
        .eq("motorista_id", motoristaId!);

      if (reportDbError("carregar transportadoras vinculadas", vinculosError, toast.error)) {
        throw vinculosError;
      }

      if (!vinculos || vinculos.length === 0) return [];

      const ids = vinculos.map((v) => v.transportador_id);
      const { data, error } = await supabase
        .from("transportadores")
        .select("id, razao_social, cpf_cnpj")
        .in("id", ids);

      if (reportDbError("carregar transportadoras", error, toast.error)) throw error;
      return (data as TransportadorOption[]) || [];
    },
  });
}

/** Criação de contrato pela página central (status inicial "pendente"). */
export function useCriarContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ContratoPayload) => {
      const { error } = await supabase.from("contratos").insert({
        ...payload,
        status: "pendente",
      });

      if (reportDbError("salvar contrato", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contratosKey });
    },
  });
}

/** Atualização de contrato pela página central. */
export function useAtualizarContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ContratoPayload }) => {
      const { error } = await supabase.from("contratos").update(payload).eq("id", id);

      if (reportDbError("atualizar contrato", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contratosKey });
    },
  });
}

/** Exclusão de contrato — compartilhada pela página central e pelo dialog de anexos. */
export function useExcluirContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratos").delete().eq("id", id);

      if (reportDbError("excluir contrato", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contratosKey });
    },
  });
}

/** Marca o contrato como enviado, gravando a data de envio de hoje. */
export function useEnviarContrato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos")
        .update({ status: "enviado", data_envio: new Date().toISOString().split("T")[0] })
        .eq("id", id);

      if (reportDbError("enviar contrato", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contratosKey });
    },
  });
}

/** Criação de contrato a partir do dialog de anexos (motorista/transportador). */
export function useCriarContratoVinculado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ContratoVinculadoPayload) => {
      const { error } = await supabase.from("contratos").insert(payload);

      if (reportDbError("salvar contrato", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contratosKey });
    },
  });
}
