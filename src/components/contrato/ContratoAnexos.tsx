import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Trash2, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Contrato {
  id: string;
  tipo: string;
  empresa: string;
  cnpj: string | null;
  status: string | null;
  arquivo_url: string | null;
  data_envio: string | null;
  observacoes: string | null;
}

interface ContratoAnexosProps {
  motorista_id?: string;
  transportador_id?: string;
  nome: string;
}

export function ContratoAnexos({ motorista_id, transportador_id, nome }: ContratoAnexosProps) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchContratos = async () => {
    let query = supabase.from("contratos").select("*").order("created_at", { ascending: false });
    if (motorista_id) query = query.eq("motorista_id", motorista_id);
    if (transportador_id) query = query.eq("transportador_id", transportador_id);
    
    const { data, error } = await query;
    if (!error) setContratos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchContratos();
  }, [motorista_id, transportador_id]);

  const handleAdd = async () => {
    if (!tipo) {
      toast.error("Selecione o tipo do contrato");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("contratos").insert({
      tipo,
      empresa: nome,
      observacoes: observacoes || null,
      arquivo_url: arquivoUrl || null,
      status: "pendente",
      motorista_id: motorista_id || null,
      transportador_id: transportador_id || null,
    });

    if (error) {
      toast.error("Erro ao salvar contrato");
    } else {
      toast.success("Contrato adicionado!");
      setTipo("");
      setObservacoes("");
      setArquivoUrl("");
      setShowForm(false);
      fetchContratos();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contratos").delete().eq("id", id);
    if (!error) {
      toast.success("Contrato excluído!");
      fetchContratos();
    }
  };

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { class: string; label: string; icon: typeof CheckCircle }> = {
      enviado: { class: "status-warning", label: "Enviado", icon: Clock },
      assinado: { class: "status-success", label: "Assinado", icon: CheckCircle },
      pendente: { class: "bg-muted text-muted-foreground", label: "Pendente", icon: Clock },
      recusado: { class: "status-danger", label: "Recusado", icon: XCircle },
    };
    const s = status || "pendente";
    const { class: className, label, icon: Icon } = config[s] || config.pendente;
    return (
      <span className={cn("status-badge inline-flex items-center gap-1 text-xs", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const tipoLabels: Record<string, string> = {
    contrato: "Contrato",
    distrato: "Distrato",
    adesao: "Termo de Adesão",
  };

  if (loading) return <p className="text-sm text-muted-foreground py-4">Carregando contratos...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Contratos ({contratos.length})</h4>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" />
          Novo Contrato
        </Button>
      </div>

      {showForm && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
          <div>
            <Label className="text-sm">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="distrato">Distrato</SelectItem>
                <SelectItem value="adesao">Termo de Adesão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Observações</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações..." />
          </div>
          <div>
            <Label className="text-sm">Anexar Documento (PDF)</Label>
            <FileUpload
              currentUrl={arquivoUrl || undefined}
              onUpload={(url) => setArquivoUrl(url)}
              onRemove={() => setArquivoUrl("")}
              folder="contratos"
              accept=".pdf,.doc,.docx"
              label="Anexar Contrato"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving || !tipo}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {contratos.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum contrato vinculado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contratos.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{tipoLabels[c.tipo] || c.tipo}</span>
                  {getStatusBadge(c.status)}
                </div>
                {c.observacoes && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.observacoes}</p>}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {c.arquivo_url && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(c.arquivo_url!, "_blank")}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
