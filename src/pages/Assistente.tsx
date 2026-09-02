import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MessagesSquare, PanelLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ChatWindow } from "@/components/assistente/ChatWindow";
import { ConversasPanel } from "@/components/assistente/ConversasPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useConversas,
  useMensagens,
  useCriarConversa,
  useExcluirConversa,
  useSalvarMensagem,
  useRenomearConversa,
} from "@/hooks/useAssistente";

export default function Assistente() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [painelAberto, setPainelAberto] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);

  const { data: conversas = [], isLoading } = useConversas();
  const { data: mensagens = [] } = useMensagens(threadId);
  const criar = useCriarConversa();
  const excluir = useExcluirConversa();
  const salvar = useSalvarMensagem();
  const renomear = useRenomearConversa();

  // Sem thread na URL: abre a mais recente ou cria uma nova.
  useEffect(() => {
    if (threadId || isLoading || criar.isPending) return;
    if (conversas.length > 0) {
      navigate(`/assistente/${conversas[0].id}`, { replace: true });
      return;
    }
    criar.mutate(undefined, {
      onSuccess: (c) => navigate(`/assistente/${c.id}`, { replace: true }),
    });
  }, [threadId, isLoading, conversas, criar, navigate]);

  const novaConversa = () => {
    criar.mutate(undefined, {
      onSuccess: (c) => {
        setPainelAberto(false);
        navigate(`/assistente/${c.id}`);
      },
    });
  };

  const conversaAtual = conversas.find((c) => c.id === threadId);

  const painel = (
    <ConversasPanel
      conversas={conversas}
      ativaId={threadId}
      carregando={isLoading}
      onNova={novaConversa}
      onSelecionar={(id) => {
        setPainelAberto(false);
        navigate(`/assistente/${id}`);
      }}
      onExcluir={(id) => setExcluirId(id)}
    />
  );

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-lg border bg-card md:h-[calc(100vh-6rem)]">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <Sheet open={painelAberto} onOpenChange={setPainelAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Conversas">
                <PanelLeft className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              {painel}
            </SheetContent>
          </Sheet>
          <MessagesSquare className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-foreground">Assistente Maiore</h1>
            <p className="truncate text-xs text-muted-foreground">
              {conversaAtual?.titulo ?? "Seu assistente operacional"}
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-72 shrink-0 border-r lg:block">{painel}</aside>
          <main className="min-w-0 flex-1">
            {threadId ? (
              <ChatWindow
                key={threadId}
                conversaId={threadId}
                mensagensIniciais={mensagens}
                onEnviarUsuario={(texto) => {
                  salvar.mutate({ conversa_id: threadId, role: "user", content: texto });
                  if (conversaAtual && conversaAtual.titulo === "Nova conversa") {
                    renomear.mutate({ id: threadId, titulo: texto });
                  }
                }}
                onRespostaFinal={(texto) =>
                  salvar.mutate({ conversa_id: threadId, role: "assistant", content: texto })
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preparando sua conversa...
              </div>
            )}
          </main>
        </div>
      </div>

      <AlertDialog open={!!excluirId} onOpenChange={(open) => !open && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              As mensagens desta conversa serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = excluirId!;
                setExcluirId(null);
                excluir.mutate(id, {
                  onSuccess: () => {
                    if (id === threadId) navigate("/assistente", { replace: true });
                  },
                });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
