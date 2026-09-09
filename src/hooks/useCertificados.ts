import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportDbError } from "@/lib/dbError";
import {
  analisarImportacao,
  montarPayloadImportacao,
  type AnaliseImportacao,
  type LinhaPlanilha,
} from "@/lib/importacaoCertificados";

export interface Certificado {
  id: string;
  empresa: string;
  tipo: string;
  vencimento: string;
  data_renovacao_agendada: string | null;
  status: string;
  observacoes: string | null;
  arquivo_url: string | null;
  created_by?: string | null;
}

export interface TransportadoraResumo {
  id: string;
  razao_social: string;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
}

export interface NovoCertificado {
  empresa: string;
  tipo: string;
  vencimento: string;
  data_renovacao_agendada: string;
  observacoes: string;
  arquivo_url: string;
}

export const certificadosKey = ["certificados"] as const;
export const transportadorasResumoKey = ["transportadores", "resumo"] as const;

/** Lista de certificados, ordenada por vencimento crescente (igual à consulta anterior). */
export function useCertificados() {
  return useQuery({
    queryKey: certificadosKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("certificados").select("*").order("vencimento", { ascending: true });

      if (reportDbError("carregar certificados", error, toast.error)) throw error;
      return (data || []) as Certificado[];
    },
  });
}

/** Transportadoras usadas no seletor do formulário de certificado. */
export function useTransportadorasResumo() {
  return useQuery({
    queryKey: transportadorasResumoKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportadores")
        .select("id, razao_social, cpf_cnpj, inscricao_estadual")
        .order("razao_social", { ascending: true });

      if (reportDbError("carregar transportadoras", error, toast.error)) throw error;
      return (data || []) as TransportadoraResumo[];
    },
  });
}

/** Criação de certificado — mesmo payload e mesma regra de status da versão anterior. */
export function useCriarCertificado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: NovoCertificado) => {
      const { error } = await supabase.from("certificados").insert({
        empresa: values.empresa,
        tipo: values.tipo,
        vencimento: values.vencimento,
        data_renovacao_agendada: values.data_renovacao_agendada || null,
        observacoes: values.observacoes || null,
        arquivo_url: values.arquivo_url || null,
        status: values.data_renovacao_agendada ? "renovacao_agendada" : "ativo",
      });

      if (reportDbError("salvar certificado", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificadosKey });
    },
  });
}

/** Agendamento de renovação para daqui a 7 dias — mesma lógica de data da versão anterior. */
export function useAgendarRenovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const dataRenovacao = new Date();
      dataRenovacao.setDate(dataRenovacao.getDate() + 7);

      const { error } = await supabase
        .from("certificados")
        .update({
          status: "renovacao_agendada",
          data_renovacao_agendada: dataRenovacao.toISOString().split("T")[0],
        })
        .eq("id", id);

      if (reportDbError("agendar renovação", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificadosKey });
    },
  });
}

/** Atualização de certificado — mesmos campos do formulário de criação. */
export function useAtualizarCertificado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: NovoCertificado }) => {
      const { error } = await supabase
        .from("certificados")
        .update({
          empresa: values.empresa,
          tipo: values.tipo,
          vencimento: values.vencimento,
          data_renovacao_agendada: values.data_renovacao_agendada || null,
          observacoes: values.observacoes || null,
          arquivo_url: values.arquivo_url || null,
          status: values.data_renovacao_agendada ? "renovacao_agendada" : "ativo",
        })
        .eq("id", id);

      if (reportDbError("atualizar certificado", error, toast.error)) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: certificadosKey });
      await queryClient.refetchQueries({ queryKey: certificadosKey });
    },
  });
}

/**
 * Sincroniza o Regime Tributário (armazenado em transportadores.inscricao_estadual)
 * da transportadora correspondente à razão social informada.
 * Não faz nada quando não há correspondência exata.
 */
export function useAtualizarRegimeTransportadora() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transportadorId, regime }: { transportadorId: string; regime: string }) => {
      const { error } = await supabase
        .from("transportadores")
        .update({ inscricao_estadual: regime || null })
        .eq("id", transportadorId);

      if (reportDbError("atualizar regime tributário da transportadora", error, toast.error)) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transportadorasResumoKey });
      await queryClient.refetchQueries({ queryKey: transportadorasResumoKey });
      queryClient.invalidateQueries({ queryKey: ["transportadores"] });
    },
  });
}

/** Exclusão de certificado (somente admin, conforme policies). */
export function useExcluirCertificado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certificados").delete().eq("id", id);
      if (reportDbError("excluir certificado", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: certificadosKey });
    },
  });
}

export interface ResultadoGravacao {
  inseridos: { cnpj: string; empresa: string; vencimento: string }[];
  ignorados: { cnpj: string; motivo: string }[];
  regimes: { transportadora: string; anterior: string | null; novo: string }[];
}

/** Relê os dados atuais do banco e refaz a análise da planilha (revalidação). */
export async function revalidarImportacao(linhas: LinhaPlanilha[]): Promise<AnaliseImportacao> {
  const [certRes, transRes] = await Promise.all([
    supabase.from("certificados").select("id, empresa, vencimento"),
    supabase.from("transportadores").select("id, razao_social, cpf_cnpj, inscricao_estadual"),
  ]);

  if (reportDbError("revalidar certificados", certRes.error, toast.error)) throw certRes.error;
  if (reportDbError("revalidar transportadoras", transRes.error, toast.error)) throw transRes.error;

  return analisarImportacao(linhas, transRes.data || [], (certRes.data || []) as never);
}

/**
 * Gravação transacional: a função do banco insere os certificados e atualiza os
 * regimes na mesma transação. Nada é gravado se qualquer passo falhar.
 */
export function useImportarCertificados() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (analise: AnaliseImportacao): Promise<ResultadoGravacao> => {
      const payload = montarPayloadImportacao(analise);
      const { data, error } = await supabase.rpc("importar_certificados", {
        payload: payload as unknown as never,
      });

      if (reportDbError("importar certificados", error, toast.error)) throw error;
      return data as unknown as ResultadoGravacao;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: certificadosKey });
      await queryClient.invalidateQueries({ queryKey: transportadorasResumoKey });
      await queryClient.refetchQueries({ queryKey: certificadosKey });
      await queryClient.refetchQueries({ queryKey: transportadorasResumoKey });
      queryClient.invalidateQueries({ queryKey: ["transportadores"] });
    },
  });
}

