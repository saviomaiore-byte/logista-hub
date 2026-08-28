import { useState } from "react";
import {
  useConferencias,
  useConferenciaItens,
  useMotoristasAtivos,
  useCriarConferencia,
  useAtualizarItemCoberto,
  useAtualizarItemObservacoes,
  useExcluirConferencia,
} from "@/hooks/useConferenciaSeguros";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardCheck, Search, Trash2, Download, FileText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileUpload } from "@/components/FileUpload";
import { Textarea } from "@/components/ui/textarea";
import { ConferenciaComparativo } from "@/components/conferencia/ConferenciaComparativo";
import { usePdfExtraction } from "@/hooks/usePdfExtraction";
import { useIsMobile } from "@/hooks/use-mobile";

interface Conferencia {
  id: string;
  titulo: string;
  periodo_referencia: string;
  arquivo_apolice_url: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface ConferenciaItem {
  id: string;
  conferencia_id: string;
  motorista_id: string;
  coberto: boolean;
  seguro_id: string | null;
  observacoes: string | null;
  motoristas?: { nome: string; cpf: string; status: string | null } | null;
}

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  status: string | null;
}

export default function ConferenciaSeguros() {
  const [openNew, setOpenNew] = useState(false);
  const [selectedConferencia, setSelectedConferencia] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newTitulo, setNewTitulo] = useState("");
  const [newPeriodo, setNewPeriodo] = useState("");
  const [newArquivoUrl, setNewArquivoUrl] = useState("");
  const [newObs, setNewObs] = useState("");
  const [activeTab, setActiveTab] = useState("manual");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const pdfExtraction = usePdfExtraction();

  const { data: conferencias, isLoading: loadingConferencias } = useConferencias();
  const { data: itens, isLoading: loadingItens } = useConferenciaItens(selectedConferencia);
  const { data: motoristas } = useMotoristasAtivos();

  const createMutation = useCriarConferencia();
  const toggleCobertoMutation = useAtualizarItemCoberto(selectedConferencia);
  const updateItemObsMutation = useAtualizarItemObservacoes(selectedConferencia);
  const deleteMutation = useExcluirConferencia();

  const handleCreateConferencia = () => {
    createMutation.mutate(
      {
        titulo: newTitulo,
        periodo_referencia: newPeriodo,
        arquivo_apolice_url: newArquivoUrl,
        observacoes: newObs,
        motoristas,
      },
      {
        onSuccess: (conf) => {
          toast({ title: "Conferência criada com sucesso!" });
          setOpenNew(false);
          setNewTitulo("");
          setNewPeriodo("");
          setNewArquivoUrl("");
          setNewObs("");
          setSelectedConferencia(conf.id);
        },
        onError: (error: any) =>
          toast({ title: "Erro ao criar conferência", description: error?.message, variant: "destructive" }),
      },
    );
  };

  const handleDeleteConferencia = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (selectedConferencia) setSelectedConferencia(null);
        toast({ title: "Conferência excluída!" });
      },
      onError: (error: any) =>
        toast({ title: "Erro ao excluir", description: error?.message, variant: "destructive" }),
    });
  };

  const selectedConf = conferencias?.find((c) => c.id === selectedConferencia);

  const filteredItens = itens?.filter(
    (item) =>
      item.motoristas?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.motoristas?.cpf.includes(searchTerm)
  );

  const totalItens = itens?.length || 0;
  const cobertosCount = itens?.filter((i) => i.coberto).length || 0;
  const cobertura = totalItens > 0 ? Math.round((cobertosCount / totalItens) * 100) : 0;

  const handleExtract = () => {
    if (selectedConf?.arquivo_apolice_url) {
      pdfExtraction.extractFromPdf(selectedConf.arquivo_apolice_url);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conferência de Seguros</h1>
            <p className="text-muted-foreground">
              Confronte apólices com transportadores ativos
            </p>
          </div>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Nova Conferência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Conferência de Seguros</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título *</label>
                  <Input
                    placeholder="Ex: Apólice Mensal - Março/2026"
                    value={newTitulo}
                    onChange={(e) => setNewTitulo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Período de Referência *</label>
                  <Input
                    placeholder="Ex: 03/2026"
                    value={newPeriodo}
                    onChange={(e) => setNewPeriodo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Apólice PDF (anexar)</label>
                  <FileUpload
                    currentUrl={newArquivoUrl || undefined}
                    onUpload={(url) => setNewArquivoUrl(url)}
                    onRemove={() => setNewArquivoUrl("")}
                    folder="conferencia-seguros"
                    accept=".pdf,.jpg,.jpeg,.png"
                    label="Anexar Apólice"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <Textarea
                    placeholder="Observações gerais..."
                    value={newObs}
                    onChange={(e) => setNewObs(e.target.value)}
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setOpenNew(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateConferencia}
                    disabled={!newTitulo || !newPeriodo || createMutation.isPending}
                  >
                    Criar Conferência
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lista de conferências */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Conferências</h3>
            {loadingConferencias ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : conferencias?.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma conferência criada</p>
              </div>
            ) : (
              conferencias?.map((conf) => (
                <button
                  key={conf.id}
                  onClick={() => {
                    setSelectedConferencia(conf.id);
                    pdfExtraction.setSeguradosExtraidos([]);
                  }}
                  className={`w-full text-left bg-card rounded-xl border p-3 transition-colors hover:border-primary ${
                    selectedConferencia === conf.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="font-medium text-foreground text-sm truncate">{conf.titulo}</p>
                  <p className="text-xs text-muted-foreground">{conf.periodo_referencia}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(conf.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {conf.arquivo_apolice_url && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" /> PDF
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConferencia(conf.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detalhe da conferência */}
          <div className="lg:col-span-3">
            {!selectedConferencia ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Selecione ou crie uma conferência para confrontar os motoristas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header with info */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{selectedConf?.titulo}</h2>
                      <p className="text-sm text-muted-foreground">
                        Período: {selectedConf?.periodo_referencia}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedConf?.arquivo_apolice_url && (
                        <a
                          href={selectedConf.arquivo_apolice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Ver Apólice
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs: Manual vs IA */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="manual" className="flex-1 gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Checklist Manual
                    </TabsTrigger>
                    <TabsTrigger value="ia" className="flex-1 gap-2">
                      <Sparkles className="h-4 w-4" />
                      Comparativo IA
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual">
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Cobertura: {cobertosCount}/{totalItens} motoristas
                          </span>
                          <span className={`font-bold ${cobertura === 100 ? "text-success" : cobertura >= 80 ? "text-warning" : "text-destructive"}`}>
                            {cobertura}%
                          </span>
                        </div>
                        <Progress value={cobertura} className="mt-2 h-3" />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar motorista por nome ou CPF..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full sm:max-w-md"
                        />
                      </div>

                      {loadingItens ? (
                        <div className="py-8 text-center text-muted-foreground">Carregando...</div>
                      ) : filteredItens?.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">Nenhum motorista encontrado</div>
                      ) : isMobile ? (
                        <div className="space-y-3">
                          {filteredItens?.map((item) => (
                            <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={item.coberto}
                                    onCheckedChange={(checked) =>
                                      toggleCobertoMutation.mutate({
                                        itemId: item.id,
                                        coberto: !!checked,
                                      })
                                    }
                                  />
                                  <div>
                                    <p className="font-medium text-foreground">{item.motoristas?.nome}</p>
                                    <p className="text-xs text-muted-foreground">{item.motoristas?.cpf}</p>
                                  </div>
                                </div>
                                {item.coberto ? (
                                  <Badge className="bg-success text-success-foreground text-xs">Coberto</Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">Descoberto</Badge>
                                )}
                              </div>
                              <Input
                                placeholder="Obs..."
                                defaultValue={item.observacoes || ""}
                                className="h-9 text-sm"
                                onBlur={(e) => {
                                  if (e.target.value !== (item.observacoes || "")) {
                                    updateItemObsMutation.mutate({
                                      itemId: item.id,
                                      observacoes: e.target.value,
                                    });
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">Coberto</TableHead>
                                <TableHead>Motorista</TableHead>
                                <TableHead>CPF</TableHead>
                                <TableHead>Observação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredItens?.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={item.coberto}
                                      onCheckedChange={(checked) =>
                                        toggleCobertoMutation.mutate({
                                          itemId: item.id,
                                          coberto: !!checked,
                                        })
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{item.motoristas?.nome}</span>
                                      {item.coberto ? (
                                        <Badge className="bg-success text-success-foreground text-xs">Coberto</Badge>
                                      ) : (
                                        <Badge variant="destructive" className="text-xs">Descoberto</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {item.motoristas?.cpf}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      placeholder="Obs..."
                                      defaultValue={item.observacoes || ""}
                                      className="h-8 text-sm"
                                      onBlur={(e) => {
                                        if (e.target.value !== (item.observacoes || "")) {
                                          updateItemObsMutation.mutate({
                                            itemId: item.id,
                                            observacoes: e.target.value,
                                          });
                                        }
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ia">
                    <ConferenciaComparativo
                      seguradosExtraidos={pdfExtraction.seguradosExtraidos}
                      motoristas={motoristas || []}
                      isExtracting={pdfExtraction.isExtracting}
                      progress={pdfExtraction.progress}
                      onExtract={handleExtract}
                      hasApolice={!!selectedConf?.arquivo_apolice_url}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
