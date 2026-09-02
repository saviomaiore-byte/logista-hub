import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dbErrorMessage } from "@/lib/dbError";
import { toast } from "sonner";

export interface Conversa {
  id: string;
  titulo: string;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  role: string;
  content: string;
  created_at: string;
}

export function useConversas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["assistente", "conversas"],
    enabled: !!user,
    queryFn: async (): Promise<Conversa[]> => {
      const { data, error } = await supabase
        .from("assistente_conversas")
        .select("id, titulo, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMensagens(conversaId?: string) {
  return useQuery({
    queryKey: ["assistente", "mensagens", conversaId],
    enabled: !!conversaId,
    queryFn: async (): Promise<Mensagem[]> => {
      const { data, error } = await supabase
        .from("assistente_mensagens")
        .select("id, conversa_id, role, content, created_at")
        .eq("conversa_id", conversaId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCriarConversa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (titulo?: string): Promise<Conversa> => {
      if (!user) throw new Error("Sessão expirada. Entre novamente.");
      const { data, error } = await supabase
        .from("assistente_conversas")
        .insert({ user_id: user.id, titulo: titulo?.slice(0, 80) || "Nova conversa" })
        .select("id, titulo, created_at, updated_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistente", "conversas"] });
    },
    onError: (e) => toast.error(dbErrorMessage(e, "processar a conversa")),
  });
}

export function useExcluirConversa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assistente_conversas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistente", "conversas"] });
      toast.success("Conversa excluída");
    },
    onError: (e) => toast.error(dbErrorMessage(e, "processar a conversa")),
  });
}

export function useSalvarMensagem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { conversa_id: string; role: "user" | "assistant"; content: string }) => {
      if (!user) return;
      const { error } = await supabase.from("assistente_mensagens").insert({
        conversa_id: payload.conversa_id,
        user_id: user.id,
        role: payload.role,
        content: payload.content,
      });
      if (error) throw error;
      await supabase
        .from("assistente_conversas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", payload.conversa_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistente", "conversas"] });
    },
    onError: (e) => toast.error(dbErrorMessage(e, "processar a conversa")),
  });
}

export function useRenomearConversa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, titulo }: { id: string; titulo: string }) => {
      const { error } = await supabase
        .from("assistente_conversas")
        .update({ titulo: titulo.slice(0, 80) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistente", "conversas"] });
    },
  });
}
