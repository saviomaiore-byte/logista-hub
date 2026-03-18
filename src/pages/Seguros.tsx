import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Formik, Form } from "formik";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Plus, Shield, Search, Pencil, Trash2, AlertTriangle, Download,
  ClipboardCheck, FileText, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileUpload } from "@/components/FileUpload";
import { seguroSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";
import { Textarea } from "@/components/ui/textarea";
import { ConferenciaComparativo } from "@/components/conferencia/ConferenciaComparativo";
import { usePdfExtraction } from "@/hooks/usePdfExtraction";

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
  const queryClient = useQueryClient();

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
  const queryClient = useQueryClient();

  const { data: seguros, isLoading } = useQuery({
    queryKey: ["seguros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seguros")
        .select("*, motoristas(nome, cpf)")
        .order("vigencia_fim", { ascending: true });
      if (error) throw error;
      return data as Seguro[];
    },
  });

  const { data: motoristas } = useQuery({
    queryKey: ["motoristas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, nome, cpf")
        .order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; cpf: string }[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof initialValues) => {
      const insertData = {
        motorista_id: data.motorista_id || null,
        tipo: data.tipo,
        seguradora: data.seguradora,
        numero_apolice: data.numero_apolice || null,
        valor_premio: data.valor_premio ? parseFloat(data.valor_premio) : null,
        vigencia_inicio: data.vigencia_inicio || null,
        vigencia_fim: data.vigencia_fim || null,
        status: data.status,
        observacoes: data.observacoes || null,
        arquivo_url: data.arquivo_url || null,
      };
      const { error } = await supabase.from("seguros").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seguros"] });
      toast({ title: "Seguro cadastrado com sucesso!" });
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao cadastrar seguro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof initialValues }) => {
      const updateData = {
        motorista_id: data.motorista_id || null,
        tipo: data.tipo,
        seguradora: data.seguradora,
        numero_apolice: data.numero_apolice || null,
        valor_premio: data.valor_premio ? parseFloat(data.valor_premio) : null,
        vigencia_inicio: data.vigencia_inicio || null,
        vigencia_fim: data.vigencia_fim || null,
        status: data.status,
        observacoes: data.observacoes || null,
        arquivo_url: data.arquivo_url || null,
      };
      const { error } = await supabase.from("seguros").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seguros"] });
      toast({ title: "Seguro atualizado com sucesso!" });
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar seguro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seguros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seguros"] });
      toast({ title: "Seguro excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir seguro", description: error.message, variant: "destructive" });
    },
  });

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

  const handleSubmit = (values: typeof initialValues, { resetForm: formikReset }: any) => {
    if (editingSeguro) {
      updateMutation.mutate({ id: editingSeguro.id, data: values });
    } else {
      createMutation.mutate(values);
    }
    formikReset();
  };

  const formatVigencia = (data?: string | null) => {
    if (!data) return "-";
    return format(parseISO(data), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (seguro: Seguro) => {
    if (seguro.status === "cancelado") return <Badge variant="secondary">Cancelado</Badge>;
    if (seguro.status === "vencido") return <Badge variant="destructive">Vencido</Badge>;
    if (!seguro.vigencia_fim) return <Badge variant="outline">Sem vigência</Badge>;

    const diasRestantes = differenceInDays(parseISO(seguro.vigencia_fim), new Date());
    if (diasRestantes < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (diasRestantes <= 30) return <Badge className="bg-warning text-warning-foreground">Vence em {diasRestantes} dias</Badge>;
    return <Badge className="bg-success text-success-foreground">Ativo</Badge>;
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
      {/* New button */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Seguro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSeguro ? "Editar Seguro" : "Novo Seguro"}</DialogTitle>
            </DialogHeader>
            <Formik
              initialValues={formInitialValues}
              validationSchema={seguroSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, setFieldValue, values }) => (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormSelectWrapper name="motorista_id" label="Segurado (opcional)">
                      <Select value={values.motorista_id} onValueChange={(v) => setFieldValue("motorista_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione um segurado" /></SelectTrigger>
                        <SelectContent>
                          {motoristas?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.nome} - {m.cpf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>
                    <FormSelectWrapper name="tipo" label="Tipo de Seguro" required>
                      <Select value={values.tipo} onValueChange={(v) => setFieldValue("tipo", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                        <SelectContent>
                          {tiposSeguros.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>
                    <FormField name="seguradora" label="Seguradora" required />
                    <FormField name="numero_apolice" label="Número da Apólice" />
                    <FormField name="valor_premio" label="Valor do Prêmio (R$)" type="number" step="0.01" />
                    <FormSelectWrapper name="status" label="Status">
                      <Select value={values.status} onValueChange={(v) => setFieldValue("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="vencido">Vencido</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormSelectWrapper>
                    <FormField name="vigencia_inicio" label="Vigência Início" type="date" />
                    <FormField name="vigencia_fim" label="Vigência Fim" type="date" />
                  </div>
                  <FormField name="observacoes" label="Observações" as="textarea" />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Anexar Apólice (PDF)</label>
                    <FileUpload
                      currentUrl={values.arquivo_url || undefined}
                      onUpload={(url) => setFieldValue("arquivo_url", url)}
                      onRemove={() => setFieldValue("arquivo_url", "")}
                      folder="seguros"
                      accept=".pdf,.jpg,.jpeg,.png"
                      label="Anexar Apólice"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                      {editingSeguro ? "Salvar" : "Cadastrar"}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Seguros</p>
              <p className="text-2xl font-bold text-foreground">{seguros?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold text-foreground">
                {seguros?.filter(s => differenceInDays(parseISO(s.vigencia_fim), new Date()) > 30).length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencendo em 30 dias</p>
              <p className="text-2xl font-bold text-foreground">{segurosVencendo}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencidos</p>
              <p className="text-2xl font-bold text-foreground">{segurosVencidos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder="Buscar por seguradora, tipo, segurado ou apólice..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sm:max-w-md"
        />
      </div>

      {/* List */}
      {isMobile ? (
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredSeguros?.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum seguro encontrado</p>
            </div>
          ) : (
            filteredSeguros?.map((seguro) => (
              <div key={seguro.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    {seguro.motoristas ? (
                      <>
                        <p className="font-semibold text-foreground">{seguro.motoristas.nome}</p>
                        <p className="text-xs text-muted-foreground">{seguro.motoristas.cpf}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">Sem segurado</p>
                    )}
                  </div>
                  {getStatusBadge(seguro)}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{seguro.tipo}</Badge>
                  <span className="text-sm text-muted-foreground">{seguro.seguradora}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Vigência</p>
                    <p className="text-foreground">{format(parseISO(seguro.vigencia_inicio), "dd/MM/yy")} - {format(parseISO(seguro.vigencia_fim), "dd/MM/yy")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Valor</p>
                    <p className="text-foreground">{seguro.valor_premio ? `R$ ${seguro.valor_premio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 pt-1 border-t border-border">
                  {seguro.arquivo_url && (
                    <a href={seguro.arquivo_url} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="ghost" size="sm"><Download className="h-4 w-4 mr-1" /> Baixar</Button>
                    </a>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(seguro)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(seguro.id)}>
                    <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Segurado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Seguradora</TableHead>
              <TableHead>Apólice</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : filteredSeguros?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum seguro encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredSeguros?.map((seguro) => (
                <TableRow key={seguro.id}>
                  <TableCell>
                    {seguro.motoristas ? (
                      <div>
                        <p className="font-medium">{seguro.motoristas.nome}</p>
                        <p className="text-sm text-muted-foreground">{seguro.motoristas.cpf}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline">{seguro.tipo}</Badge></TableCell>
                  <TableCell>{seguro.seguradora}</TableCell>
                  <TableCell>{seguro.numero_apolice || "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(parseISO(seguro.vigencia_inicio), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <p className="text-muted-foreground">até {format(parseISO(seguro.vigencia_fim), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {seguro.valor_premio
                      ? `R$ ${seguro.valor_premio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(seguro)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {seguro.arquivo_url && (
                        <a href={seguro.arquivo_url} target="_blank" rel="noopener noreferrer" download>
                          <Button variant="ghost" size="icon" title="Baixar Apólice">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(seguro)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(seguro.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}
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
  const queryClient = useQueryClient();
  const pdfExtraction = usePdfExtraction();

  const { data: conferencias, isLoading: loadingConferencias } = useQuery({
    queryKey: ["conferencia_seguros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferencia_seguros")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Conferencia[];
    },
  });

  const { data: itens, isLoading: loadingItens } = useQuery({
    queryKey: ["conferencia_seguros_itens", selectedConferencia],
    queryFn: async () => {
      if (!selectedConferencia) return [];
      const { data, error } = await supabase
        .from("conferencia_seguros_itens")
        .select("*, motoristas(nome, cpf, status)")
        .eq("conferencia_id", selectedConferencia)
        .order("created_at");
      if (error) throw error;
      return data as ConferenciaItem[];
    },
    enabled: !!selectedConferencia,
  });

  const { data: motoristas } = useQuery({
    queryKey: ["motoristas_ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("motoristas")
        .select("id, nome, cpf, status")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data as Motorista[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: conf, error: confError } = await supabase
        .from("conferencia_seguros")
        .insert({
          titulo: newTitulo,
          periodo_referencia: newPeriodo,
          arquivo_apolice_url: newArquivoUrl || null,
          observacoes: newObs || null,
        })
        .select()
        .single();
      if (confError) throw confError;

      if (motoristas && motoristas.length > 0) {
        const items = motoristas.map((m) => ({
          conferencia_id: conf.id,
          motorista_id: m.id,
          coberto: false,
        }));
        const { error: itemsError } = await supabase
          .from("conferencia_seguros_itens")
          .insert(items);
        if (itemsError) throw itemsError;
      }
      return conf;
    },
    onSuccess: (conf) => {
      queryClient.invalidateQueries({ queryKey: ["conferencia_seguros"] });
      queryClient.invalidateQueries({ queryKey: ["conferencia_seguros_itens"] });
      toast({ title: "Conferência criada com sucesso!" });
      setOpenNew(false);
      setNewTitulo("");
      setNewPeriodo("");
      setNewArquivoUrl("");
      setNewObs("");
      setSelectedConferencia(conf.id);
    },
    onError: (error) => {
      toast({ title: "Erro ao criar conferência", description: error.message, variant: "destructive" });
    },
  });

  const toggleCobertoMutation = useMutation({
    mutationFn: async ({ itemId, coberto }: { itemId: string; coberto: boolean }) => {
      const { error } = await supabase
        .from("conferencia_seguros_itens")
        .update({ coberto })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conferencia_seguros_itens", selectedConferencia] });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("conferencia_seguros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conferencia_seguros"] });
      if (selectedConferencia) setSelectedConferencia(null);
      toast({ title: "Conferência excluída!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const updateItemObsMutation = useMutation({
    mutationFn: async ({ itemId, observacoes }: { itemId: string; observacoes: string }) => {
      const { error } = await supabase
        .from("conferencia_seguros_itens")
        .update({ observacoes: observacoes || null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conferencia_seguros_itens", selectedConferencia] });
    },
  });

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
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
                <Input placeholder="Ex: Apólice Mensal - Março/2026" value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Período de Referência *</label>
                <Input placeholder="Ex: 03/2026" value={newPeriodo} onChange={(e) => setNewPeriodo(e.target.value)} />
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
                <Textarea placeholder="Observações gerais..." value={newObs} onChange={(e) => setNewObs(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!newTitulo || !newPeriodo || createMutation.isPending}>
                  Criar Conferência
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista */}
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
                onClick={() => { setSelectedConferencia(conf.id); pdfExtraction.loadSavedExtraction(conf.id); }}
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
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(conf.id);
                  }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {!selectedConferencia ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <ClipboardCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione ou crie uma conferência para confrontar os motoristas</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedConf?.titulo}</h2>
                    <p className="text-sm text-muted-foreground">Período: {selectedConf?.periodo_referencia}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedConf?.arquivo_apolice_url ? (
                      <a href={selectedConf.arquivo_apolice_url} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Ver Apólice
                        </Button>
                      </a>
                    ) : null}
                    <FileUpload
                      currentUrl={selectedConf?.arquivo_apolice_url || undefined}
                      onUpload={async (url) => {
                        if (!selectedConf) return;
                        await supabase
                          .from("conferencia_seguros")
                          .update({ arquivo_apolice_url: url })
                          .eq("id", selectedConf.id);
                        queryClient.invalidateQueries({ queryKey: ["conferencia_seguros"] });
                        toast({ title: "Apólice anexada com sucesso!" });
                      }}
                      onRemove={async () => {
                        if (!selectedConf) return;
                        await supabase
                          .from("conferencia_seguros")
                          .update({ arquivo_apolice_url: null })
                          .eq("id", selectedConf.id);
                        queryClient.invalidateQueries({ queryKey: ["conferencia_seguros"] });
                      }}
                      folder="conferencia-seguros"
                      accept=".pdf"
                      label="Anexar Apólice PDF"
                    />
                  </div>
                </div>
              </div>

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
                  <div className="space-y-4">
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cobertura: {cobertosCount}/{totalItens} motoristas</span>
                        <span className={`font-bold ${cobertura === 100 ? "text-success" : cobertura >= 80 ? "text-warning" : "text-destructive"}`}>
                          {cobertura}%
                        </span>
                      </div>
                      <Progress value={cobertura} className="h-3 mt-2" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar motorista por nome ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-md" />
                    </div>

                    {loadingItens ? (
                      <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                    ) : filteredItens?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">Nenhum motorista encontrado</div>
                    ) : isMobile ? (
                      <div className="space-y-3">
                        {filteredItens?.map((item) => (
                          <div key={item.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox checked={item.coberto} onCheckedChange={(checked) => toggleCobertoMutation.mutate({ itemId: item.id, coberto: !!checked })} />
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
                              placeholder="Observação..."
                              defaultValue={item.observacoes || ""}
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                if (e.target.value !== (item.observacoes || "")) {
                                  updateItemObsMutation.mutate({ itemId: item.id, observacoes: e.target.value });
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-card rounded-xl border border-border overflow-hidden">
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
                                  <Checkbox checked={item.coberto} onCheckedChange={(checked) => toggleCobertoMutation.mutate({ itemId: item.id, coberto: !!checked })} />
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
                                <TableCell className="text-muted-foreground">{item.motoristas?.cpf}</TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Obs..."
                                    defaultValue={item.observacoes || ""}
                                    className="h-8 text-sm"
                                    onBlur={(e) => {
                                      if (e.target.value !== (item.observacoes || "")) {
                                        updateItemObsMutation.mutate({ itemId: item.id, observacoes: e.target.value });
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
