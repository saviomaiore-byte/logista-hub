import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function Seguros() {
  const [open, setOpen] = useState(false);
  const [editingSeguro, setEditingSeguro] = useState<Seguro | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
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
  });

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
    mutationFn: async (data: typeof formData) => {
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
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
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
    setFormData({
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
    });
    setEditingSeguro(null);
  };

  const handleEdit = (seguro: Seguro) => {
    setEditingSeguro(seguro);
    setFormData({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSeguro) {
      updateMutation.mutate({ id: editingSeguro.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Motorista (opcional)</Label>
                    <Select value={formData.motorista_id} onValueChange={(v) => setFormData({ ...formData, motorista_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoristas?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome} - {m.cpf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Seguro *</Label>
                    <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposSeguros.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Seguradora *</Label>
                    <Input
                      value={formData.seguradora}
                      onChange={(e) => setFormData({ ...formData, seguradora: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número da Apólice</Label>
                    <Input
                      value={formData.numero_apolice}
                      onChange={(e) => setFormData({ ...formData, numero_apolice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Prêmio (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_premio}
                      onChange={(e) => setFormData({ ...formData, valor_premio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vigência Início *</Label>
                    <Input
                      type="date"
                      value={formData.vigencia_inicio}
                      onChange={(e) => setFormData({ ...formData, vigencia_inicio: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vigência Fim *</Label>
                    <Input
                      type="date"
                      value={formData.vigencia_fim}
                      onChange={(e) => setFormData({ ...formData, vigencia_fim: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anexar Apólice (PDF)</Label>
                  <FileUpload
                    currentUrl={formData.arquivo_url || undefined}
                    onUpload={(url) => setFormData({ ...formData, arquivo_url: url })}
                    onRemove={() => setFormData({ ...formData, arquivo_url: "" })}
                    folder="seguros"
                    accept=".pdf,.jpg,.jpeg,.png"
                    label="Anexar Apólice"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSeguro ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum seguro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredSeguros?.map((seguro) => (
                  <TableRow key={seguro.id}>
                    <TableCell className="font-medium">
                      {seguro.motoristas?.nome || "—"}
                    </TableCell>
                    <TableCell>{seguro.tipo}</TableCell>
                    <TableCell>{seguro.seguradora}</TableCell>
                    <TableCell>{seguro.numero_apolice || "—"}</TableCell>
                    <TableCell>
                      {format(parseISO(seguro.vigencia_inicio), "dd/MM/yy", { locale: ptBR })} -{" "}
                      {format(parseISO(seguro.vigencia_fim), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {seguro.valor_premio
                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(seguro.valor_premio)
                        : "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(seguro)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
                          disabled={deleteMutation.isPending}
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
