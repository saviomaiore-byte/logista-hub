import { useState, useEffect } from "react";
import { Formik, Form } from "formik";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MotoristaAnexos } from "@/components/motorista/MotoristaAnexos";
import { ContratoAnexos } from "@/components/contrato/ContratoAnexos";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  FileText,
  Phone,
  Mail,
  MapPin,
  Users,
  Edit,
  Trash2,
  Building2,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motoristaSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";

interface Transportadora {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  estado_civil: string | null;
  rg: string | null;
  status: string;
  situacao_operacional: string | null;
  cnh_numero: string | null;
  cnh_vencimento: string | null;
  mopp_numero: string | null;
  mopp_vencimento: string | null;
  mopp_vitalicio: boolean;
  antt_numero: string | null;
  antt_vencimento: string | null;
  alvara_numero: string | null;
  alvara_vencimento: string | null;
  certificado_numero: string | null;
  certificado_vencimento: string | null;
}

const initialValues = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  endereco: "",
  data_nascimento: "",
  estado_civil: "",
  rg: "",
  status: "ativo",
  situacao_operacional: "em_praca_apto",
  cnh_numero: "",
  cnh_vencimento: "",
  mopp_numero: "",
  mopp_vencimento: "",
  mopp_vitalicio: false,
  antt_numero: "",
  antt_vencimento: "",
  alvara_numero: "",
  alvara_vencimento: "",
  certificado_numero: "",
  certificado_vencimento: "",
};

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [motoristaTransportadoras, setMotoristaTransportadoras] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [transportadoraFilter, setTransportadoraFilter] = useState("todas");
  const [open, setOpen] = useState(false);
  const [docsMotorista, setDocsMotorista] = useState<Motorista | null>(null);
  const [editMotorista, setEditMotorista] = useState<Motorista | null>(null);
  const [selectedTransportadoras, setSelectedTransportadoras] = useState<string[]>([]);
  const isMobile = useIsMobile();

  const fetchTransportadoras = async () => {
    const { data } = await supabase.from("transportadores").select("id, razao_social, cpf_cnpj").order("razao_social");
    setTransportadoras(data || []);
  };

  const fetchMotoristaTransportadoraLinks = async () => {
    const { data } = await supabase.from("transportador_motoristas").select("motorista_id, transportador_id");
    const map: Record<string, string[]> = {};
    (data || []).forEach((link) => {
      if (!map[link.motorista_id]) map[link.motorista_id] = [];
      map[link.motorista_id].push(link.transportador_id);
    });
    setMotoristaTransportadoras(map);
  };

  const fetchMotoristas = async () => {
    const { data, error } = await supabase
      .from("motoristas")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar motoristas");
    } else {
      setMotoristas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMotoristas();
    fetchTransportadoras();
    fetchMotoristaTransportadoraLinks();
  }, []);

  const syncTransportadoraLinks = async (motoristaId: string, newTransportadoraIds: string[]) => {
    // Get current links
    const { data: current } = await supabase
      .from("transportador_motoristas")
      .select("id, transportador_id")
      .eq("motorista_id", motoristaId);
    
    const currentIds = (current || []).map((c) => c.transportador_id);
    
    // Delete removed
    const toRemove = (current || []).filter((c) => !newTransportadoraIds.includes(c.transportador_id));
    for (const r of toRemove) {
      await supabase.from("transportador_motoristas").delete().eq("id", r.id);
    }
    
    // Insert new
    const toAdd = newTransportadoraIds.filter((id) => !currentIds.includes(id));
    if (toAdd.length > 0) {
      await supabase.from("transportador_motoristas").insert(
        toAdd.map((transportador_id) => ({ transportador_id, motorista_id: motoristaId }))
      );
    }
  };

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    const motoristaData = {
      nome: values.nome,
      cpf: values.cpf,
      telefone: values.telefone || null,
      email: values.email || null,
      cidade: values.cidade || null,
      estado: values.estado || null,
      endereco: values.endereco || null,
      data_nascimento: values.data_nascimento || null,
      estado_civil: values.estado_civil || null,
      rg: values.rg || null,
      status: values.status,
      situacao_operacional: values.situacao_operacional || null,
      cnh_numero: values.cnh_numero || null,
      cnh_vencimento: values.cnh_vencimento || null,
      mopp_numero: values.mopp_numero || null,
      mopp_vencimento: values.mopp_vitalicio ? null : (values.mopp_vencimento || null),
      mopp_vitalicio: values.mopp_vitalicio,
      antt_numero: values.antt_numero || null,
      antt_vencimento: values.antt_vencimento || null,
      alvara_numero: values.alvara_numero || null,
      alvara_vencimento: values.alvara_vencimento || null,
      certificado_numero: values.certificado_numero || null,
      certificado_vencimento: values.certificado_vencimento || null,
    };

    const { data: inserted, error } = await supabase.from("motoristas").insert(motoristaData).select().single();

    if (error) {
      if (error.code === "23505") {
        toast.error("CPF já cadastrado");
      } else {
        toast.error("Erro ao salvar motorista");
      }
      return;
    }

    // Sync selected transportadoras
    if (inserted && selectedTransportadoras.length > 0) {
      await syncTransportadoraLinks(inserted.id, selectedTransportadoras);
    }

    toast.success("Motorista cadastrado!");
    setOpen(false);
    setSelectedTransportadoras([]);
    resetForm();
    fetchMotoristas();
    fetchMotoristaTransportadoraLinks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este motorista?")) return;
    const { error } = await supabase.from("motoristas").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir motorista");
    } else {
      toast.success("Motorista excluído!");
      fetchMotoristas();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ativo: "status-success",
      inativo: "status-danger",
      pendente: "status-warning",
    };
    const labels: Record<string, string> = {
      ativo: "Ativo",
      inativo: "Inativo",
      pendente: "Pendente",
    };
    return <span className={cn("status-badge", styles[status])}>{labels[status]}</span>;
  };

  const filteredMotoristas = motoristas.filter((m) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const transportadorasDoMotorista = motoristaTransportadoras[m.id] || [];

    const matchesSearch =
      normalizedSearch.length === 0 ||
      m.nome.toLowerCase().includes(normalizedSearch) ||
      m.cpf.includes(searchTerm);

    const matchesStatus = statusFilter === "todos" || m.status === statusFilter;
    const matchesTransportadora =
      transportadoraFilter === "todas" || transportadorasDoMotorista.includes(transportadoraFilter);

    return matchesSearch && matchesStatus && matchesTransportadora;
  });

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o cadastro de motoristas e documentos
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Motorista
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Motorista</DialogTitle>
              </DialogHeader>
              <Formik
                initialValues={initialValues}
                validationSchema={motoristaSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField name="nome" label="Nome Completo" required />
                      <FormField 
                        name="cpf" 
                        label="CPF" 
                        placeholder="000.000.000-00" 
                        mask="cpf"
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField 
                        name="telefone" 
                        label="Telefone" 
                        placeholder="(00) 00000-0000" 
                        mask="telefone"
                      />
                      <FormField 
                        name="email" 
                        label="Email" 
                        type="email" 
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField name="rg" label="RG" />
                      <FormField name="data_nascimento" label="Data de Nascimento" type="date" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormSelectWrapper name="estado_civil" label="Estado Civil">
                        <Select
                          value={values.estado_civil || ""}
                          onValueChange={(value) => setFieldValue("estado_civil", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                            <SelectItem value="uniao_estavel">União Estável</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                      <FormField name="endereco" label="Endereço" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField name="cidade" label="Cidade" />
                      <FormField 
                        name="estado" 
                        label="Estado" 
                        placeholder="SP" 
                        maxLength={2} 
                      />
                      <FormSelectWrapper name="status" label="Status">
                        <Select
                          value={values.status}
                          onValueChange={(value) => setFieldValue("status", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormSelectWrapper name="situacao_operacional" label="Situação Operacional">
                        <Select
                          value={values.situacao_operacional || ""}
                          onValueChange={(value) => setFieldValue("situacao_operacional", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="em_praca_apto">Em Praça Apto</SelectItem>
                            <SelectItem value="em_viagem_apto">Em Viagem Apto</SelectItem>
                            <SelectItem value="inapto">Inapto</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                    </div>

                    <div className="space-y-2">
                      <Label>Transportadoras vinculadas</Label>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (!selectedTransportadoras.includes(value)) {
                            setSelectedTransportadoras([...selectedTransportadoras, value]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma transportadora..." />
                        </SelectTrigger>
                        <SelectContent>
                          {transportadoras
                            .filter((t) => !selectedTransportadoras.includes(t.id))
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.razao_social} ({t.cpf_cnpj})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {selectedTransportadoras.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTransportadoras.map((id) => {
                            const t = transportadoras.find((tr) => tr.id === id);
                            return (
                              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                                <Building2 className="h-3 w-3" />
                                {t?.razao_social || id}
                                <button
                                  type="button"
                                  onClick={() => setSelectedTransportadoras(selectedTransportadoras.filter((x) => x !== id))}
                                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3">Documentos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField name="cnh_numero" label="CNH Número" />
                        <FormField name="cnh_vencimento" label="CNH Vencimento" type="date" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <FormField name="mopp_numero" label="MOPP Número" />
                        <FormField name="mopp_vencimento" label="MOPP Vencimento" type="date" disabled={values.mopp_vitalicio} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id="mopp_vitalicio"
                          checked={values.mopp_vitalicio}
                          onCheckedChange={(checked) => setFieldValue("mopp_vitalicio", !!checked)}
                        />
                        <Label htmlFor="mopp_vitalicio" className="text-sm cursor-pointer">MOPP Vitalício</Label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <FormField name="antt_numero" label="ANTT Número" />
                        <FormField name="antt_vencimento" label="ANTT Vencimento" type="date" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <FormField name="alvara_numero" label="Alvará Número" />
                        <FormField name="alvara_vencimento" label="Alvará Vencimento" type="date" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <FormField name="certificado_numero" label="Certificado Número" />
                        <FormField name="certificado_vencimento" label="Certificado Vencimento" type="date" />
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Cadastrar"}
                    </Button>
                  </Form>
                )}
              </Formik>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Transportadora</Label>
                <Select value={transportadoraFilter} onValueChange={setTransportadoraFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as transportadoras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as transportadoras</SelectItem>
                    {transportadoras.map((transportadora) => (
                      <SelectItem key={transportadora.id} value={transportadora.id}>
                        {transportadora.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("todos");
                    setTransportadoraFilter("todas");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filteredMotoristas.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum motorista encontrado" : "Nenhum motorista cadastrado"}
            </p>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {filteredMotoristas.map((motorista) => (
              <div key={motorista.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{motorista.nome}</p>
                    <p className="text-sm text-muted-foreground">{motorista.cpf}</p>
                    {motoristaTransportadoras[motorista.id]?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {motoristaTransportadoras[motorista.id].map((tid) => {
                          const t = transportadoras.find((tr) => tr.id === tid);
                          return t ? (
                            <Badge key={tid} variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                              <Building2 className="h-2.5 w-2.5" />{t.razao_social}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(motorista.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditMotorista(motorista); setSelectedTransportadoras(motoristaTransportadoras[motorista.id] || []); }}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDocsMotorista(motorista)}>
                          <FileText className="h-4 w-4 mr-2" /> Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(motorista.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-sm">
                  {motorista.telefone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      {motorista.telefone}
                    </div>
                  )}
                  {motorista.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{motorista.email}</span>
                    </div>
                  )}
                  {motorista.cidade && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {motorista.cidade}{motorista.estado && `, ${motorista.estado}`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-6 py-4">Motorista</th>
                  <th className="text-left px-6 py-4">Contato</th>
                  <th className="text-left px-6 py-4">Cidade</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Documentos</th>
                  <th className="text-right px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMotoristas.map((motorista) => (
                  <tr key={motorista.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                          <p className="font-medium text-foreground">{motorista.nome}</p>
                        <p className="text-sm text-muted-foreground">{motorista.cpf}</p>
                        {motoristaTransportadoras[motorista.id]?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {motoristaTransportadoras[motorista.id].map((tid) => {
                              const t = transportadoras.find((tr) => tr.id === tid);
                              return t ? (
                                <Badge key={tid} variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                                  <Building2 className="h-2.5 w-2.5" />{t.razao_social}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {motorista.telefone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {motorista.telefone}
                          </div>
                        )}
                        {motorista.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {motorista.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {motorista.cidade && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {motorista.cidade}{motorista.estado && `, ${motorista.estado}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(motorista.status)}
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setDocsMotorista(motorista)}>
                        <FileText className="h-3 w-3" />
                        Ver docs
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditMotorista(motorista); setSelectedTransportadoras(motoristaTransportadoras[motorista.id] || []); }}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(motorista.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <p>Mostrando {filteredMotoristas.length} de {motoristas.length} motoristas</p>
        </div>

        {/* Docs Dialog */}
        <Dialog open={!!docsMotorista} onOpenChange={(v) => !v && setDocsMotorista(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Documentos - {docsMotorista?.nome}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="docs" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="docs" className="flex-1">Dados</TabsTrigger>
                <TabsTrigger value="anexos" className="flex-1">Anexos</TabsTrigger>
                <TabsTrigger value="contratos" className="flex-1">Contratos</TabsTrigger>
              </TabsList>
              <TabsContent value="docs" className="mt-4 space-y-4">
                {docsMotorista?.situacao_operacional && (
                  <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">Situação Operacional:</p>
                    <Badge variant="outline">
                      {({ em_praca_apto: "Em Praça Apto", em_viagem_apto: "Em Viagem Apto", inapto: "Inapto", em_praca: "Em Praça Apto", em_viagem: "Em Viagem Apto" } as Record<string, string>)[docsMotorista.situacao_operacional] || docsMotorista.situacao_operacional}
                    </Badge>
                  </div>
                )}
                {[
                  { label: "CNH", numero: docsMotorista?.cnh_numero, vencimento: docsMotorista?.cnh_vencimento },
                  { label: "MOPP", numero: docsMotorista?.mopp_vitalicio ? "Vitalício" : docsMotorista?.mopp_numero, vencimento: docsMotorista?.mopp_vitalicio ? null : docsMotorista?.mopp_vencimento },
                  { label: "ANTT", numero: docsMotorista?.antt_numero, vencimento: docsMotorista?.antt_vencimento },
                  { label: "Alvará", numero: docsMotorista?.alvara_numero, vencimento: docsMotorista?.alvara_vencimento },
                  { label: "Certificado", numero: docsMotorista?.certificado_numero, vencimento: docsMotorista?.certificado_vencimento },
                ].map((doc) => (
                  <div key={doc.label} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">{doc.numero || "Não informado"}</p>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      {doc.vencimento ? `Vence: ${new Date(doc.vencimento).toLocaleDateString("pt-BR")}` : "Sem vencimento"}
                    </div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="anexos" className="mt-4">
                {docsMotorista && (
                  <MotoristaAnexos motoristaId={docsMotorista.id} motoristaNome={docsMotorista.nome} />
                )}
              </TabsContent>
              <TabsContent value="contratos" className="mt-4">
                {docsMotorista && (
                  <ContratoAnexos motorista_id={docsMotorista.id} nome={docsMotorista.nome} />
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editMotorista} onOpenChange={(v) => !v && setEditMotorista(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Motorista</DialogTitle>
            </DialogHeader>
            {editMotorista && (
              <Formik
                initialValues={{
                  nome: editMotorista.nome,
                  cpf: editMotorista.cpf,
                  telefone: editMotorista.telefone || "",
                  email: editMotorista.email || "",
                  cidade: editMotorista.cidade || "",
                  estado: editMotorista.estado || "",
                  endereco: editMotorista.endereco || "",
                  data_nascimento: editMotorista.data_nascimento || "",
                  estado_civil: editMotorista.estado_civil || "",
                  rg: editMotorista.rg || "",
                  status: editMotorista.status || "ativo",
                  situacao_operacional: editMotorista.situacao_operacional || "em_praca",
                  cnh_numero: editMotorista.cnh_numero || "",
                  cnh_vencimento: editMotorista.cnh_vencimento || "",
                  mopp_numero: editMotorista.mopp_numero || "",
                  mopp_vencimento: editMotorista.mopp_vencimento || "",
                  mopp_vitalicio: editMotorista.mopp_vitalicio || false,
                  antt_numero: editMotorista.antt_numero || "",
                  antt_vencimento: editMotorista.antt_vencimento || "",
                  alvara_numero: editMotorista.alvara_numero || "",
                  alvara_vencimento: editMotorista.alvara_vencimento || "",
                  certificado_numero: editMotorista.certificado_numero || "",
                  certificado_vencimento: editMotorista.certificado_vencimento || "",
                }}
                validationSchema={motoristaSchema}
                onSubmit={async (values) => {
                  const { error } = await supabase
                    .from("motoristas")
                    .update({
                      nome: values.nome,
                      cpf: values.cpf,
                      telefone: values.telefone || null,
                      email: values.email || null,
                      cidade: values.cidade || null,
                      estado: values.estado || null,
                      endereco: values.endereco || null,
                      data_nascimento: values.data_nascimento || null,
                      estado_civil: values.estado_civil || null,
                      rg: values.rg || null,
                      status: values.status,
                      situacao_operacional: values.situacao_operacional || null,
                      cnh_numero: values.cnh_numero || null,
                      cnh_vencimento: values.cnh_vencimento || null,
                      mopp_numero: values.mopp_numero || null,
                      mopp_vencimento: values.mopp_vitalicio ? null : (values.mopp_vencimento || null),
                      mopp_vitalicio: values.mopp_vitalicio,
                      antt_numero: values.antt_numero || null,
                      antt_vencimento: values.antt_vencimento || null,
                      alvara_numero: values.alvara_numero || null,
                      alvara_vencimento: values.alvara_vencimento || null,
                      certificado_numero: values.certificado_numero || null,
                      certificado_vencimento: values.certificado_vencimento || null,
                    })
                    .eq("id", editMotorista.id);
                  if (error) {
                    toast.error("Erro ao atualizar motorista");
                    return;
                  }

                  await syncTransportadoraLinks(editMotorista.id, selectedTransportadoras);

                  toast.success("Motorista atualizado!");
                  setEditMotorista(null);
                  setSelectedTransportadoras([]);
                  fetchMotoristas();
                  fetchMotoristaTransportadoraLinks();
                }}
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField name="nome" label="Nome Completo" required />
                      <FormField name="cpf" label="CPF" placeholder="000.000.000-00" mask="cpf" required />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField name="telefone" label="Telefone" placeholder="(00) 00000-0000" mask="telefone" />
                      <FormField name="email" label="Email" type="email" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField name="rg" label="RG" />
                      <FormField name="data_nascimento" label="Data de Nascimento" type="date" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormSelectWrapper name="estado_civil" label="Estado Civil">
                        <Select
                          value={values.estado_civil || ""}
                          onValueChange={(value) => setFieldValue("estado_civil", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                            <SelectItem value="uniao_estavel">União Estável</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                      <FormField name="endereco" label="Endereço" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField name="cidade" label="Cidade" />
                      <FormField name="estado" label="Estado" placeholder="SP" maxLength={2} />
                      <FormSelectWrapper name="status" label="Status">
                        <Select value={values.status} onValueChange={(value) => setFieldValue("status", value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormSelectWrapper name="situacao_operacional" label="Situação Operacional">
                        <Select
                          value={values.situacao_operacional || ""}
                          onValueChange={(value) => setFieldValue("situacao_operacional", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="em_praca_apto">Em Praça Apto</SelectItem>
                            <SelectItem value="em_viagem_apto">Em Viagem Apto</SelectItem>
                            <SelectItem value="inapto">Inapto</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormSelectWrapper>
                    </div>

                    <div className="space-y-2">
                      <Label>Transportadoras vinculadas</Label>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (!selectedTransportadoras.includes(value)) {
                            setSelectedTransportadoras([...selectedTransportadoras, value]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma transportadora..." />
                        </SelectTrigger>
                        <SelectContent>
                          {transportadoras
                            .filter((t) => !selectedTransportadoras.includes(t.id))
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.razao_social} ({t.cpf_cnpj})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {selectedTransportadoras.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedTransportadoras.map((id) => {
                            const t = transportadoras.find((tr) => tr.id === id);
                            return (
                              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                                <Building2 className="h-3 w-3" />
                                {t?.razao_social || id}
                                <button
                                  type="button"
                                  onClick={() => setSelectedTransportadoras(selectedTransportadoras.filter((x) => x !== id))}
                                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t pt-4">
                      <h4 className="mb-3 font-medium">Documentos</h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField name="cnh_numero" label="CNH Número" />
                        <FormField name="cnh_vencimento" label="CNH Vencimento" type="date" />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField name="mopp_numero" label="MOPP Número" />
                        <FormField name="mopp_vencimento" label="MOPP Vencimento" type="date" disabled={values.mopp_vitalicio} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox
                          id="mopp_vitalicio_edit"
                          checked={values.mopp_vitalicio}
                          onCheckedChange={(checked) => setFieldValue("mopp_vitalicio", !!checked)}
                        />
                        <Label htmlFor="mopp_vitalicio_edit" className="cursor-pointer text-sm">MOPP Vitalício</Label>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField name="antt_numero" label="ANTT Número" />
                        <FormField name="antt_vencimento" label="ANTT Vencimento" type="date" />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField name="alvara_numero" label="Alvará Número" />
                        <FormField name="alvara_vencimento" label="Alvará Vencimento" type="date" />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField name="certificado_numero" label="Certificado Número" />
                        <FormField name="certificado_vencimento" label="Certificado Vencimento" type="date" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </Form>
                )}
              </Formik>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
