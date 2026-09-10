import { usePermissoes } from "@/hooks/usePermissoes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openSignedFile } from "@/lib/storage";
import {
  useContratosVinculados,
  useTransportadorasVinculadas,
  useCriarContratoVinculado,
  useExcluirContrato,
} from "@/hooks/useContratos";

interface ContratoAnexosProps {
  motorista_id?: string;
  transportador_id?: string;
  nome: string;
}


const tipoLabels: Record<string, string> = {
  contrato: "Contrato",
  distrato: "Distrato",
  adesao: "Termo de Adesão",
  transportadora: "Transportadora",
};

export function ContratoAnexos({ motorista_id, transportador_id, nome }: ContratoAnexosProps) {
  const { isAdmin } = usePermissoes();
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState("");
  const [modelo, setModelo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [selectedTransportadorId, setSelectedTransportadorId] = useState("");

  const isFromMotorista = !!motorista_id && !transportador_id;

  // `isFetching` (e não `isLoading`) para preservar o comportamento anterior:
  // o texto "Carregando contratos..." também aparecia nos recarregamentos
  // disparados após adicionar/excluir um contrato.
  const { data: contratos = [], isFetching: loading } = useContratosVinculados(
    motorista_id,
    transportador_id,
  );

  const { data: transportadoras = [] } = useTransportadorasVinculadas(
    motorista_id,
    isFromMotorista,
  );

  const criarContratoVinculado = useCriarContratoVinculado();
  const excluirContrato = useExcluirContrato();

  const saving = criarContratoVinculado.isPending;

  const resetForm = () => {
    setTipo("");
    setModelo("");
    setObservacoes("");
    setArquivoUrl("");
    setSelectedTransportadorId("");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!tipo) {
      toast.error("Selecione o tipo do contrato");
      return;
    }

    if (isFromMotorista && !selectedTransportadorId) {
      toast.error("Selecione a transportadora");
      return;
    }

    const selectedTransp = transportadoras.find((t) => t.id === selectedTransportadorId);
    const empresaNome = isFromMotorista ? selectedTransp?.razao_social || nome : nome;

    try {
      await criarContratoVinculado.mutateAsync({
        tipo,
        modelo: (!isFromMotorista && modelo) ? modelo : null,
        empresa: empresaNome,
        observacoes: observacoes || null,
        arquivo_url: arquivoUrl || null,
        status: "pendente",
        motorista_id: motorista_id || null,
        transportador_id: isFromMotorista ? selectedTransportadorId : transportador_id || null,
      });
    } catch {
      return;
    }

    toast.success("Contrato adicionado!");
    resetForm();
  };

  const handleDelete = async (id: string) => {
    try {
      await excluirContrato.mutateAsync(id);
    } catch {
      return;
    }

    toast.success("Contrato excluído!");
  };


  if (loading) return <p className="py-4 text-sm text-muted-foreground">Carregando contratos...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium">Contratos ({contratos.length})</h4>
          <p className="text-xs text-muted-foreground">
            {isFromMotorista
              ? "Contratos deste motorista com suas transportadoras vinculadas."
              : "Esses contratos são compartilhados com o módulo central de contratos."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-3 w-3" />
          Novo Contrato
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div>
            <Label className="text-sm">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="distrato">Distrato</SelectItem>
                <SelectItem value="adesao">Termo de Adesão</SelectItem>
                <SelectItem value="transportadora">Transportadora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isFromMotorista && (
            <div>
              <Label className="text-sm">Transportadora *</Label>
              {transportadoras.length === 0 ? (
                <p className="text-xs text-destructive mt-1">
                  Nenhuma transportadora vinculada a este motorista. Vincule uma transportadora primeiro.
                </p>
              ) : (
                <Select value={selectedTransportadorId} onValueChange={setSelectedTransportadorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a transportadora" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportadoras.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {!isFromMotorista && (
            <>
              <div>
                <Label className="text-sm">Empresa</Label>
                <Input value={nome} disabled />
              </div>
              <div>
                <Label className="text-sm">Modelo</Label>
                <Select value={modelo} onValueChange={setModelo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Start">Start</SelectItem>
                    <SelectItem value="Maiore">Maiore</SelectItem>
                    <SelectItem value="Comodato">Comodato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label className="text-sm">Observações</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações..." />
          </div>

          <div>
            <Label className="text-sm">Anexar Documento</Label>
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
            <Button size="sm" onClick={handleAdd} disabled={saving || !tipo || (isFromMotorista && !selectedTransportadorId)}>
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {contratos.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Nenhum contrato vinculado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contratos.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{tipoLabels[c.tipo] || c.tipo}</span>
                  {c.modelo && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{c.modelo}</span>
                  )}
                  {getStatusBadge(c.status)}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {c.empresa}
                  {c.observacoes && ` — ${c.observacoes}`}
                </p>
              </div>
              <div className="ml-2 flex items-center gap-1">
                {c.arquivo_url && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSignedFile(c.arquivo_url!)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}