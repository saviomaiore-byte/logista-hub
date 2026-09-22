import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportDbError } from "@/lib/dbError";
import { motoristaVinculosKey } from "@/hooks/useMotoristas";
import type { RegistroAntt, Transportador } from "@/components/transportador/types";

/**
 * Entidade Transportadores.
 *
 * Cobre a listagem central (`transportadores`), os vínculos N:N com motoristas
 * (`transportador_motoristas`, com join de motorista para exibição), a frota
 * o Registro ANTT (`registros_antt`, com join de `transportadores(razao_social)`)
 * e os anexos do transportador (`transportador_arquivos` + storage `documentos`).
 *
 * O seletor de transportadores do formulário de contrato continua em
 * `useContratos.useTransportadoresOpcoes()` — não é duplicado aqui.
 */

/** Prefixo de cache da entidade. */
export const transportadoresKey = ["transportadores"] as const;

/** Vínculos transportador ↔ motorista, com o motorista embutido. */
export const transportadorVinculosKey = ["transportadores", "vinculos"] as const;

export const registrosAnttKey = ["registros_antt"] as const;

/** Anexos de um transportador específico. */
export const transportadorArquivosKey = (transportadorId: string) =>
  ["transportadores", "arquivos", transportadorId] as const;

export interface TransportadorVinculo {
  id: string;
  transportador_id: string;
  motorista_id: string;
  /** Marcação explícita e manual: motorista próprio desta transportadora. */
  motorista_proprio: boolean;
  motoristas?: { id: string; nome: string; cpf: string } | null;
}

export interface TransportadorArquivo {
  id: string;
  nome_arquivo: string;
  arquivo_url: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

/** Listagem central de transportadores, ordenada por razão social. */
export function useTransportadores() {
  return useQuery({
    queryKey: transportadoresKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportadores")
        .select("*")
        .order("razao_social");

      if (reportDbError("carregar transportadores", error, toast.error)) throw error;
      return (data as Transportador[]) || [];
    },
  });
}

/** Vínculos existentes (join com motorista para exibir nome/CPF na lista). */
export function useTransportadorVinculos() {
  return useQuery({
    queryKey: transportadorVinculosKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportador_motoristas")
        .select("*, motoristas(id, nome, cpf)");

      if (reportDbError("carregar vínculos de motoristas", error, toast.error)) throw error;
      return (data as unknown as TransportadorVinculo[]) || [];
    },
  });
}

/** Registros ANTT com a razão social do transportador. */
export function useRegistrosAntt() {
  return useQuery({
    queryKey: registrosAnttKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_antt")
        .select("*, transportadores(razao_social)")
        .order("created_at", { ascending: false });

      if (reportDbError("carregar registros ANTT", error, toast.error)) throw error;
      return (data as unknown as RegistroAntt[]) || [];
    },
  });
}

type TransportadorFormValues = Record<string, unknown> & {
  inscricao_estadual?: string | null;
  contato?: string | null;
  endereco?: string | null;
  data_nascimento?: string | null;
  email?: string | null;
  estado_civil?: string | null;
  rg?: string | null;
  situacao_operacional?: string | null;
};

/**
 * Criação/atualização de transportador.
 * O payload (trim + null nos opcionais) é idêntico ao anterior; o toast de
 * sucesso/erro continua na página, por isso aqui só registramos e relançamos.
 */
export function useSalvarTransportador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: TransportadorFormValues }) => {
      const payload = {
        ...values,
        inscricao_estadual: values.inscricao_estadual?.trim() || null,
        contato: values.contato?.trim() || null,
        endereco: values.endereco?.trim() || null,
        data_nascimento: values.data_nascimento || null,
        email: values.email?.trim() || null,
        estado_civil: values.estado_civil?.trim() || null,
        rg: values.rg?.trim() || null,
        situacao_operacional: values.situacao_operacional || null,
      };

      if (id) {
        const { error } = await supabase
          .from("transportadores")
          .update(payload as never)
          .eq("id", id);
        if (reportDbError("atualizar transportador", error)) throw error;
      } else {
        const { error } = await supabase.from("transportadores").insert(payload as never);
        if (reportDbError("salvar transportador", error)) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportadoresKey });
    },
  });
}

/** Exclusão de transportador. */
export function useExcluirTransportador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transportadores").delete().eq("id", id);
      if (reportDbError("excluir transportador", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportadoresKey });
    },
  });
}

/** Vincula um motorista ao transportador (tabela de junção). */
export function useVincularMotorista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transportador_id,
      motorista_id,
    }: {
      transportador_id: string;
      motorista_id: string;
    }) => {
      const { error } = await supabase
        .from("transportador_motoristas")
        .insert({ transportador_id, motorista_id });
      if (reportDbError("vincular motorista", error)) throw error;
    },
    onSuccess: () => {
      // A junção alimenta esta tela e também o mapa usado na tela de Motoristas.
      queryClient.invalidateQueries({ queryKey: transportadorVinculosKey });
      queryClient.invalidateQueries({ queryKey: motoristaVinculosKey });
    },
  });
}

/** Remove o vínculo motorista ↔ transportador. */
export function useDesvincularMotorista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transportador_motoristas").delete().eq("id", id);
      if (reportDbError("desvincular motorista", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportadorVinculosKey });
      queryClient.invalidateQueries({ queryKey: motoristaVinculosKey });
    },
  });
}

/**
 * Marca/desmarca manualmente o motorista próprio de um vínculo.
 * Única forma de alterar `motorista_proprio` — nunca é inferido automaticamente.
 */
export function useMarcarMotoristaProprio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motorista_proprio }: { id: string; motorista_proprio: boolean }) => {
      // `id` é sempre transportador_motoristas.id (a linha do vínculo).
      // O `select` devolve a linha afetada: sem retorno, o UPDATE não gravou
      // (tipicamente permissão), e falhamos em vez de fingir sucesso na UI.
      const { data, error } = await supabase
        .from("transportador_motoristas")
        .update({ motorista_proprio })
        .eq("id", id)
        .select("id, motorista_proprio");
      if (reportDbError("atualizar motorista próprio", error)) throw error;
      if (!data || data.length === 0) {
        const err = new Error(
          "Não foi possível salvar a marcação de motorista próprio (vínculo não encontrado ou sem permissão).",
        );
        console.error("[motorista_proprio] UPDATE sem linhas afetadas", { vinculoId: id, motorista_proprio });
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportadorVinculosKey });
      queryClient.invalidateQueries({ queryKey: motoristaVinculosKey });
    },
  });
}


interface RegistroAnttPayload {
  transportador_id: string;
  arquivo_url?: string | null;
  /** Data de emissão do ANTT (sem vencimento). */
  antt_data_emissao?: string | null;
  qtd_cavalos?: number | string | null;
  qtd_reboques?: number | string | null;
}

/** Vazio sempre grava null; quantidades inválidas também. */
function toQuantidade(value: number | string | null | undefined) {
  if (value === "" || value === null || value === undefined) return null;
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
}

function registroAnttPayload(values: RegistroAnttPayload) {
  return {
    transportador_id: values.transportador_id,
    arquivo_url: values.arquivo_url?.trim() || null,
    antt_data_emissao: values.antt_data_emissao?.trim() || null,
    qtd_cavalos: toQuantidade(values.qtd_cavalos),
    qtd_reboques: toQuantidade(values.qtd_reboques),
  };
}

/** Criação/atualização do Registro ANTT. */
export function useSalvarRegistroAntt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: RegistroAnttPayload }) => {
      const payload = registroAnttPayload(values);

      if (id) {
        const { error } = await supabase.from("registros_antt").update(payload).eq("id", id);
        if (reportDbError("atualizar extrato ANTT", error)) throw error;
      } else {
        const { error } = await supabase.from("registros_antt").insert(payload);
        if (reportDbError("salvar extrato ANTT", error)) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrosAnttKey });
    },
  });
}

/** Exclusão do Registro ANTT. */
export function useExcluirRegistroAntt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("registros_antt").delete().eq("id", id);
      if (reportDbError("excluir extrato ANTT", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: registrosAnttKey });
    },
  });
}

/** Anexos de um transportador (tabela `transportador_arquivos`). */
export function useTransportadorArquivos(transportadorId: string) {
  return useQuery({
    queryKey: transportadorArquivosKey(transportadorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportador_arquivos")
        .select("*")
        .eq("transportador_id", transportadorId)
        .order("created_at", { ascending: false });

      if (reportDbError("carregar arquivos", error, toast.error)) throw error;
      return (data as TransportadorArquivo[]) || [];
    },
  });
}

/**
 * Registro do metadado do anexo após o upload no storage.
 * O upload em si (bucket `documentos`, path `${userId}/transportadores/...`)
 * permanece no componente, sem qualquer alteração.
 */
export function useCriarTransportadorArquivo(transportadorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (row: {
      transportador_id: string;
      nome_arquivo: string;
      arquivo_url: string;
      tipo_arquivo: string | null;
      tamanho_bytes: number;
    }) => {
      const { error } = await supabase.from("transportador_arquivos").insert(row);
      if (reportDbError("enviar arquivo", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportadorArquivosKey(transportadorId) });
    },
  });
}

/** Exclusão do registro do anexo (a remoção no storage segue no componente). */
export function useExcluirTransportadorArquivo(transportadorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transportador_arquivos").delete().eq("id", id);
      if (reportDbError("excluir arquivo", error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportadorArquivosKey(transportadorId) });
    },
  });
}
