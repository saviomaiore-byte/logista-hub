import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, CheckCircle, Clock, FileWarning, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Documento {
  id: string;
  motorista: string;
  telefone: string | null;
  tipo: "CNH" | "MOPP" | "ANTT";
  numero: string;
  vencimento: string;
  diasRestantes: number;
  status: "valido" | "proximo" | "vencido";
}

const formatPhoneToWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 11) {
    return `55${digits}`;
  }

  if (digits.length === 13 && digits.startsWith("55")) {
    return digits;
  }

  return digits;
};

export default function Conferencia() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const isMobile = useIsMobile();

  const fetchDocumentos = async () => {
    const { data, error } = await supabase
      .from("motoristas")
      .select(
        "id, nome, telefone, cnh_numero, cnh_vencimento, mopp_numero, mopp_vencimento, antt_numero, antt_vencimento",
      )
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar documentos");
      setLoading(false);
      return;
    }

    const docs: Documento[] = [];
    const hoje = new Date();

    (data || []).forEach((motorista) => {
      const addDoc = (tipo: "CNH" | "MOPP" | "ANTT", numero: string | null, vencimento: string | null) => {
        if (!numero || !vencimento) return;

        const venc = new Date(vencimento);
        const diffTime = venc.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: "valido" | "proximo" | "vencido" = "valido";
        if (diasRestantes < 0) status = "vencido";
        else if (diasRestantes <= 30) status = "proximo";

        docs.push({
          id: `${motorista.id}-${tipo}`,
          motorista: motorista.nome,
          telefone: motorista.telefone,
          tipo,
          numero,
          vencimento,
          diasRestantes,
          status,
        });
      };

      addDoc("CNH", motorista.cnh_numero, motorista.cnh_vencimento);
      addDoc("MOPP", motorista.mopp_numero, motorista.mopp_vencimento);
      addDoc("ANTT", motorista.antt_numero, motorista.antt_vencimento);
    });

    docs.sort((a, b) => a.diasRestantes - b.diasRestantes);
    setDocumentos(docs);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocumentos();
  }, []);

  const getMensagemWhatsApp = (doc: Documento) => {
    const vencimentoFormatado = new Date(doc.vencimento).toLocaleDateString("pt-BR");

    if (doc.status === "vencido") {
      return `Olá, ${doc.motorista}! Sua CNH venceu em ${vencimentoFormatado}. Por favor, envie a CNH atualizada assim que possível.`;
    }

    return `Olá, ${doc.motorista}! Sua CNH vence em ${vencimentoFormatado}. Por favor, verifique a renovação e envie a CNH atualizada antes do vencimento.`;
  };

  const handleWhatsAppNotification = (doc: Documento) => {
    if (doc.tipo !== "CNH") {
      toast.info("A notificação por WhatsApp está disponível apenas para CNH.");
      return;
    }

    if (!doc.telefone) {
      toast.error("Este motorista não possui telefone cadastrado.");
      return;
    }

    const phone = formatPhoneToWhatsApp(doc.telefone);
    if (!phone) {
      toast.error("Telefone inválido para envio pelo WhatsApp.");
      return;
    }

    const mensagem = encodeURIComponent(getMensagemWhatsApp(doc));
    window.open(`https://wa.me/${phone}?text=${mensagem}`, "_blank", "noopener,noreferrer");
  };

  const getStatusBadge = (doc: Documento) => {
    if (doc.status === "vencido") {
      return (
        <span className="status-badge status-danger inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencido há {Math.abs(doc.diasRestantes)} dias
        </span>
      );
    }
    if (doc.status === "proximo") {
      return (
        <span className="status-badge status-warning inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {doc.diasRestantes} dias restantes
        </span>
      );
    }
    return (
      <span className="status-badge status-success inline-flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Válido
      </span>
    );
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      CNH: "bg-sidebar-primary/10 text-sidebar-primary",
      MOPP: "bg-warning/10 text-warning",
      ANTT: "bg-primary/10 text-primary",
    };
    return <span className={cn("status-badge", colors[tipo])}>{tipo}</span>;
  };

  const filteredDocs = documentos.filter((doc) => {
    const matchesSearch = doc.motorista.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "todos" || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const vencidos = documentos.filter((d) => d.status === "vencido").length;
  const proximos = documentos.filter((d) => d.status === "proximo").length;
  const validos = documentos.filter((d) => d.status === "valido").length;

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Conferência de Documentos</h1>
          <p className="text-muted-foreground mt-1">Monitore vencimentos de CNH, MOPP e ANTT</p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{vencidos}</p>
              <p className="text-sm text-destructive/80">Documentos vencidos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-warning/20 bg-warning/10 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/20">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{proximos}</p>
              <p className="text-sm text-warning/80">Vencem em 30 dias</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-success/20 bg-success/10 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{validos}</p>
              <p className="text-sm text-success/80">Documentos em dia</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-stretch sm:items-center">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "todos", label: "Todos" },
              { key: "vencido", label: "Vencidos" },
              { key: "proximo", label: "Próximos" },
              { key: "valido", label: "Válidos" },
            ].map((item) => (
              <Button
                key={item.key}
                variant={filterStatus === item.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(item.key)}
                className={cn(
                  "flex-1 sm:flex-none",
                  filterStatus === item.key ? "bg-primary text-primary-foreground" : "",
                )}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12">
            <FileWarning className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {documentos.length === 0
                ? "Nenhum documento cadastrado. Cadastre motoristas com documentos."
                : "Nenhum documento encontrado com os filtros aplicados."}
            </p>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "bg-card rounded-xl border border-border p-4 space-y-3",
                  doc.status === "vencido" && "border-destructive/30 bg-destructive/5",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {doc.status === "vencido" && <FileWarning className="h-4 w-4 text-destructive flex-shrink-0" />}
                    <p className="font-semibold text-foreground">{doc.motorista}</p>
                  </div>
                  {getTipoBadge(doc.tipo)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Número</p>
                    <p className="text-foreground font-mono text-sm">{doc.numero}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vencimento</p>
                    <p className="text-foreground">{new Date(doc.vencimento).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  {getStatusBadge(doc)}
                  {doc.tipo === "CNH" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => handleWhatsAppNotification(doc)}
                    >
                      <Send className="h-3 w-3" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-6 py-4">Motorista</th>
                  <th className="text-left px-6 py-4">Tipo</th>
                  <th className="text-left px-6 py-4">Número</th>
                  <th className="text-left px-6 py-4">Vencimento</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      doc.status === "vencido" && "bg-destructive/5",
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {doc.status === "vencido" && <FileWarning className="h-4 w-4 text-destructive" />}
                        <p className="font-medium text-foreground">{doc.motorista}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getTipoBadge(doc.tipo)}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-sm">{doc.numero}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(doc.vencimento).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(doc)}</td>
                    <td className="px-6 py-4 text-right">
                      {doc.tipo === "CNH" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => handleWhatsAppNotification(doc)}
                        >
                          <Send className="h-3 w-3" />
                          WhatsApp
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
