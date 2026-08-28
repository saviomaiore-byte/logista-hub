import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Formik, Form } from "formik";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Shield, Search, Trash2, AlertTriangle,
  ClipboardCheck, FileText, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { seguroSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";
import { Textarea } from "@/components/ui/textarea";
import { ConferenciaComparativo } from "@/components/conferencia/ConferenciaComparativo";
import { usePdfExtraction } from "@/hooks/usePdfExtraction";
import { SegurosList } from "@/components/seguro/SegurosList";
import { SeguroFormDialog } from "@/components/seguro/SeguroFormDialog";
import { ConferenciasSidebar } from "@/components/seguro/ConferenciasSidebar";
import { NovaConferenciaDialog } from "@/components/seguro/NovaConferenciaDialog";
import { ConferenciaHeaderCard } from "@/components/seguro/ConferenciaHeaderCard";
import { ConferenciaChecklist } from "@/components/seguro/ConferenciaChecklist";
import { useSeguros, useCriarSeguro, useAtualizarSeguro, useExcluirSeguro } from "@/hooks/useSeguros";
import { useMotoristas } from "@/hooks/useMotoristas";
import {
  useConferencias,
  useConferenciaItens,
  useMotoristasAtivos,
  useCriarConferencia,
  useAtualizarItemCoberto,
  useAtualizarItemObservacoes,
  useExcluirConferencia,
  useAtualizarApoliceConferencia,
} from "@/hooks/useConferenciaSeguros";


// ====== Types ======
interface Seguro {
  id: string;
  motorista_id: string | null;
  tipo: string;
  seguradora: string;
  numero_apolice: string | null;
  valor_premio: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string | null;
  observacoes: string | null;
  arquivo_url: string | null;
  motoristas?: { nome: string; cpf: string } | null;
}

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  status: string | null;
}

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

const tiposSeguros = ["RC", "APP", "RCF-DC", "RCTR-C", "Vida", "Outro"];

const initialValues = {
  motorista_id: "",
  tipo: "",
  seguradora: "",
  numero_apolice: "",
  valor_premio: "",
  vigencia_inicio: "",
  vigencia_fim: "",
  status: "ativo",
  observacoes: "",
  arquivo_url: "",
};

export default function Seguros() {
  const [activeMainTab, setActiveMainTab] = useState("seguros");
  const { toast } = useToast();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Seguros</h1>
            <p className="text-muted-foreground">Gestão de seguros e conferência de apólices</p>
          </div>
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList>
            <TabsTrigger value="seguros" className="gap-2">
              <Shield className="h-4 w-4" />
              Seguros
            </TabsTrigger>
            <TabsTrigger value="conferencia" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Conferência de Apólice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seguros">
            <SegurosTab />
          </TabsContent>

          <TabsContent value="conferencia">
            <ConferenciaTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// ====== Seguros Tab ======
function SegurosTab() {
  const [open, setOpen] = useState(false);
  const [editingSeguro, setEditingSeguro] = useState<Seguro | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formInitialValues, setFormInitialValues] = useState(initialValues);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { data: seguros, isLoading } = useSeguros();
  // Reutiliza a listagem central de motoristas (mesma queryKey ["motoristas"]).
  const { data: motoristas } = useMotoristas();

  const createMutation = useCriarSeguro();
  const updateMutation = useAtualizarSeguro();
  const deleteMutation = useExcluirSeguro();


  const resetForm = () => {
    setFormInitialValues(initialValues);
    setEditingSeguro(null);
  };

  const handleEdit = (seguro: Seguro) => {
    setEditingSeguro(seguro);
    setFormInitialValues({
      motorista_id: seguro.motorista_id || "",
      tipo: seguro.tipo,
      seguradora: seguro.seguradora,
      numero_apolice: seguro.numero_apolice || "",
      valor_premio: seguro.valor_premio?.toString() || "",
      vigencia_inicio: seguro.vigencia_inicio,
      vigencia_fim: seguro.vigencia_fim,
      status: seguro.status || "ativo",
      observacoes: seguro.observacoes || "",
      arquivo_url: seguro.arquivo_url || "",
    });
    setOpen(true);
  };

  const onSaved = (title: string) => () => {
    toast({ title });
    resetForm();
    setOpen(false);
  };

  const onSaveError = (title: string) => (error: any) =>
    toast({ title, description: error?.message, variant: "destructive" });

  const handleSubmit = (values: typeof initialValues, { resetForm: formikReset }: any) => {
    if (editingSeguro) {
      updateMutation.mutate(
        { id: editingSeguro.id, data: values },
        {
          onSuccess: onSaved("Seguro atualizado com sucesso!"),
          onError: onSaveError("Erro ao atualizar seguro"),
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: onSaved("Seguro cadastrado com sucesso!"),
        onError: onSaveError("Erro ao cadastrar seguro"),
      });
    }
    formikReset();
  };


  const filteredSeguros = seguros?.filter(
    (s) =>
      s.seguradora.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.motoristas?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.numero_apolice?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const segurosVencendo = seguros?.filter((s) => {
    if (!s.vigencia_fim) return false;
    const dias = differenceInDays(parseISO(s.vigencia_fim), new Date());
    return dias >= 0 && dias <= 30;
  }).length || 0;

  const segurosVencidos = seguros?.filter((s) =>
    s.vigencia_fim ? differenceInDays(parseISO(s.vigencia_fim), new Date()) < 0 : false
  ).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SeguroFormDialog
          open={open}
          onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}
          editingSeguro={editingSeguro}
          formInitialValues={formInitialValues}
          motoristas={motoristas}
          onSubmit={handleSubmit}
          onCancel={() => { setOpen(false); resetForm(); }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Seguros</p>
              <p className="text-2xl font-bold text-foreground">{seguros?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold text-foreground">
                {seguros?.filter(s => s.vigencia_fim ? differenceInDays(parseISO(s.vigencia_fim), new Date()) > 30 : s.status === "ativo").length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencendo em 30 dias</p>
              <p className="text-2xl font-bold text-foreground">{segurosVencendo}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencidos</p>
              <p className="text-2xl font-bold text-foreground">{segurosVencidos}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          placeholder="Buscar por seguradora, tipo, segurado ou apólice..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md"
        />
      </div>

      <SegurosList
        seguros={filteredSeguros}
        isLoading={isLoading}
        isMobile={isMobile}
        onEdit={handleEdit}
        onDelete={(id) =>
          deleteMutation.mutate(id, {
            onSuccess: () => toast({ title: "Seguro excluído com sucesso!" }),
            onError: (error: any) =>
              toast({ title: "Erro ao excluir seguro", description: error?.message, variant: "destructive" }),
          })
        }

      />
    </div>
  );
}

// ====== Conferência Tab ======
function ConferenciaTab() {
  const [openNew, setOpenNew] = useState(false);
  const [selectedConferencia, setSelectedConferencia] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newTitulo, setNewTitulo] = useState("");
  const [newPeriodo, setNewPeriodo] = useState("");
  const [newArquivoUrl, setNewArquivoUrl] = useState("");
  const [newObs, setNewObs] = useState("");
  const [confTab, setConfTab] = useState("manual");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const pdfExtraction = usePdfExtraction();

  const { data: conferencias, isLoading: loadingConferencias } = useConferencias();
  const { data: itens, isLoading: loadingItens } = useConferenciaItens(selectedConferencia);
  const { data: motoristas } = useMotoristasAtivos();

  const createMutation = useCriarConferencia();
  const toggleCobertoMutation = useAtualizarItemCoberto(selectedConferencia);
  const deleteMutation = useExcluirConferencia();
  const updateItemObsMutation = useAtualizarItemObservacoes(selectedConferencia);
  const apoliceMutation = useAtualizarApoliceConferencia();

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
    if (selectedConf?.arquivo_apolice_url && selectedConferencia) {
      pdfExtraction.extractFromPdf(selectedConf.arquivo_apolice_url, selectedConferencia);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end">
        <NovaConferenciaDialog
          open={openNew}
          onOpenChange={setOpenNew}
          titulo={newTitulo}
          onTituloChange={setNewTitulo}
          periodo={newPeriodo}
          onPeriodoChange={setNewPeriodo}
          arquivoUrl={newArquivoUrl}
          onArquivoUrlChange={setNewArquivoUrl}
          observacoes={newObs}
          onObservacoesChange={setNewObs}
          onCreate={handleCreateConferencia}
          isPending={createMutation.isPending}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <ConferenciasSidebar
          items={conferencias}
          selectedId={selectedConferencia}
          isLoading={loadingConferencias}
          onSelect={(id) => { setSelectedConferencia(id); pdfExtraction.loadSavedExtraction(id); }}
          onDelete={handleDeleteConferencia}
        />


        {/* Detail */}
        <div className="lg:col-span-3">
          {!selectedConferencia ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione ou crie uma conferência para confrontar os motoristas</p>
            </div>
          ) : (
            <div className="space-y-4">
              <ConferenciaHeaderCard
                conferencia={selectedConf}
                onUploadApolice={async (url) => {
                  if (!selectedConf) return;
                  try {
                    await apoliceMutation.mutateAsync({ id: selectedConf.id, url });
                    toast({ title: "Apólice anexada com sucesso!" });
                  } catch (error: any) {
                    toast({ title: "Erro ao anexar apólice", description: error?.message, variant: "destructive" });
                  }
                }}
                onRemoveApolice={async () => {
                  if (!selectedConf) return;
                  try {
                    await apoliceMutation.mutateAsync({ id: selectedConf.id, url: null });
                  } catch (error: any) {
                    toast({ title: "Erro ao remover apólice", description: error?.message, variant: "destructive" });
                  }
                }}
              />


              <Tabs value={confTab} onValueChange={setConfTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="manual" className="flex-1 gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Checklist Manual
                  </TabsTrigger>
                  <TabsTrigger value="ia" className="flex-1 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Comparativo Automático
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="manual">
                  <ConferenciaChecklist
                    itens={itens}
                    filteredItens={filteredItens}
                    isLoading={loadingItens}
                    isMobile={isMobile}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    cobertosCount={cobertosCount}
                    totalItens={totalItens}
                    cobertura={cobertura}
                    onToggleCoberto={(itemId, coberto) => toggleCobertoMutation.mutate({ itemId, coberto })}
                    onUpdateObservacoes={(itemId, observacoes) => updateItemObsMutation.mutate({ itemId, observacoes })}
                  />
                </TabsContent>


                <TabsContent value="ia">
                  <ConferenciaComparativo
                    seguradosExtraidos={pdfExtraction.seguradosExtraidos}
                    motoristas={motoristas || []}
                    isExtracting={pdfExtraction.isExtracting}
                    isLoadingSaved={pdfExtraction.isLoadingSaved}
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
  );
}
