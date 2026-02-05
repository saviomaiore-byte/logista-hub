import { useState } from "react";
import { Formik, Form } from "formik";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, Search, Pencil, Trash2, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileUpload } from "@/components/FileUpload";
import { seguroSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";

interface Seguro {
  id: string;
  motorista_id: string | null;
  tipo: string;
  seguradora: string;
  numero_apolice: string | null;
  valor_premio: number | null;
  vigencia_inicio: string;
  vigencia_fim: string;
  status: string | null;
  observacoes: string | null;
  arquivo_url: string | null;
  motoristas?: { nome: string; cpf: string } | null;
}

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
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
  const [open, setOpen] = useState(false);
  const [editingSeguro, setEditingSeguro] = useState<Seguro | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formInitialValues, setFormInitialValues] = useState(initialValues);
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
      return data as Motorista[];
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
        vigencia_inicio: data.vigencia_inicio,
        vigencia_fim: data.vigencia_fim,
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
        vigencia_inicio: data.vigencia_inicio,
        vigencia_fim: data.vigencia_fim,
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

  const getStatusBadge = (seguro: Seguro) => {
    const diasRestantes = differenceInDays(parseISO(seguro.vigencia_fim), new Date());
    
    if (diasRestantes < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (diasRestantes <= 30) {
      return <Badge className="bg-warning text-warning-foreground">Vence em {diasRestantes} dias</Badge>;
    }
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
    const dias = differenceInDays(parseISO(s.vigencia_fim), new Date());
    return dias >= 0 && dias <= 30;
  }).length || 0;

  const segurosVencidos = seguros?.filter((s) => {
    return differenceInDays(parseISO(s.vigencia_fim), new Date()) < 0;
  }).length || 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Seguros</h1>
            <p className="text-muted-foreground">Gestão de seguros dos motoristas</p>
          </div>
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
                      <FormSelectWrapper name="motorista_id" label="Motorista (opcional)">
                        <Select value={values.motorista_id} onValueChange={(v) => setFieldValue("motorista_id", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um motorista" />
                          </SelectTrigger>
                          <SelectContent>
                            {motoristas?.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.nome} - {m.cpf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                      <FormSelectWrapper name="tipo" label="Tipo de Seguro" required>
                        <Select value={values.tipo} onValueChange={(v) => setFieldValue("tipo", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="vencido">Vencido</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                      <FormField name="vigencia_inicio" label="Vigência Início" type="date" required />
                      <FormField name="vigencia_fim" label="Vigência Fim" type="date" required />
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
                      <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                        Cancelar
                      </Button>
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
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por seguradora, tipo, motorista ou apólice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motorista</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
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
                    <TableCell>
                      <Badge variant="outline">{seguro.tipo}</Badge>
                    </TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(seguro.arquivo_url!, "_blank")}
                            title="Baixar Apólice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(seguro)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(seguro.id)}
                        >
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
      </div>
    </MainLayout>
  );
}
