import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportDbError } from "@/lib/dbError";

export interface DocumentoEmpresa {
  id: string;
  empresa: string;
  tipo: string;
  descricao: string | null;
  vencimento: string | null;
  status: string;
}

export interface NovoDocumentoEmpresa {
  empresa: string;
  tipo: string;
  descricao: string;
  vencimento: string;
}

export const documentosEmpresaKey = ["documentos_empresa"] as const;

/** Lista de documentos de empresa, mais recentes primeiro (igual à consulta anterior). */
export function useDocumentosEmpresa() {
  return useQuery({
    queryKey: documentosEmpresaKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_empresa")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportDbError("carregar documentos", error, toast.error)) throw error;
      return (data || []) as DocumentoEmpresa[];
    },
  });
}

/** Criação de documento de empresa — mesmo payload e mesmo status padrão da versão anterior. */
export function useCriarDocumentoEmpresa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: NovoDocumentoEmpresa) => {
      const { error } = await supabase.from("documentos_empresa").insert({
        empresa: values.empresa,
        tipo: values.tipo,
        descricao: values.descricao || null,
        vencimento: values.vencimento || null,
        status: "valido",
      });

      if (reportDbError("salvar documento", error, toast.error)) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentosEmpresaKey });
    },
  });
}
