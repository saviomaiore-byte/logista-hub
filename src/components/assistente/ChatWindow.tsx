import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { WelcomeState } from "@/components/assistente/WelcomeState";
import type { Mensagem } from "@/hooks/useAssistente";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistente-chat`;

const transport = new DefaultChatTransport({
  api: ENDPOINT,
  headers: async () => {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
  },
});

function toUIMessages(rows: Mensagem[]): UIMessage[] {
  return rows.map((r) => ({
    id: r.id,
    role: r.role === "user" ? "user" : "assistant",
    parts: [{ type: "text" as const, text: r.content }],
  }));
}

function textoDe(message: UIMessage): string {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

interface Props {
  conversaId: string;
  mensagensIniciais: Mensagem[];
  onEnviarUsuario: (texto: string) => void;
  onRespostaFinal: (texto: string) => void;
}

export function ChatWindow({
  conversaId,
  mensagensIniciais,
  onEnviarUsuario,
  onRespostaFinal,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const iniciais = useMemo(() => toUIMessages(mensagensIniciais), [mensagensIniciais]);

  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    id: conversaId,
    messages: iniciais,
    transport,
    onFinish: ({ message }) => {
      const texto = textoDe(message);
      if (texto) onRespostaFinal(texto);
    },
  });

  useEffect(() => {
    setMessages(iniciais);
  }, [iniciais, setMessages]);

  const focar = () => inputRef.current?.focus();

  useEffect(() => {
    focar();
  }, [conversaId]);

  useEffect(() => {
    if (status === "ready") focar();
  }, [status]);

  const ocupado = status === "submitted" || status === "streaming";

  const enviar = (texto: string) => {
    const limpo = texto.trim();
    if (!limpo || ocupado) return;
    onEnviarUsuario(limpo);
    void sendMessage({ text: limpo });
    focar();
  };

  const consultando = messages
    .at(-1)
    ?.parts.some((p) => p.type.startsWith("tool-") && "state" in p && p.state !== "output-available");

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <WelcomeState onSugestao={enviar} />
          ) : (
            messages.map((message) => {
              const texto = textoDe(message);
              if (!texto) return null;
              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    <MessageResponse>{texto}</MessageResponse>
                  </MessageContent>
                </Message>
              );
            })
          )}

          {ocupado && (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
              {consultando ? (
                <Database className="h-4 w-4" aria-hidden />
              ) : (
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
              )}
              <Shimmer>{consultando ? "Consultando os dados..." : "Analisando os dados..."}</Shimmer>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>
                  Não consegui concluir a consulta agora. Verifique sua conexão e tente novamente.
                </span>
                <Button variant="outline" size="sm" onClick={() => regenerate()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background p-3">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(_msg, e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const campo = form.querySelector("textarea");
              const valor = campo?.value ?? "";
              if (campo) campo.value = "";
              enviar(valor);
            }}
          >
            <PromptInputTextarea
              ref={inputRef}
              autoFocus
              disabled={ocupado}
              placeholder="Pergunte sobre motoristas, contratos, vencimentos..."
            />
            <PromptInputFooter className="justify-between">
              <span className="text-xs text-muted-foreground">
                Consulta somente leitura. Enter envia, Shift + Enter quebra linha.
              </span>
              <PromptInputSubmit status={status} disabled={ocupado} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
