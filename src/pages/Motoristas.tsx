import { useState, useEffect } from "react";
import { Formik, Form } from "formik";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MotoristaAnexos } from "@/components/motorista/MotoristaAnexos";
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
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motoristaSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  status: string;
  cnh_numero: string | null;
  cnh_vencimento: string | null;
  mopp_numero: string | null;
  mopp_vencimento: string | null;
  antt_numero: string | null;
  antt_vencimento: string | null;
  is_transportador_proprio: boolean;
}

const initialValues = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  status: "ativo",
  cnh_numero: "",
  cnh_vencimento: "",
  mopp_numero: "",
  mopp_vencimento: "",
  antt_numero: "",
  antt_vencimento: "",
  is_transportador_proprio: false,
};

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [docsMotorista, setDocsMotorista] = useState<Motorista | null>(null);
  const [editMotorista, setEditMotorista] = useState<Motorista | null>(null);
  const isMobile = useIsMobile();

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
  }, []);

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    const motoristaData = {
      nome: values.nome,
      cpf: values.cpf,
      telefone: values.telefone || null,
      email: values.email || null,
      cidade: values.cidade || null,
      estado: values.estado || null,
      status: values.status,
      cnh_numero: values.cnh_numero || null,
      cnh_vencimento: values.cnh_vencimento || null,
      mopp_numero: values.mopp_numero || null,
      mopp_vencimento: values.mopp_vencimento || null,
      antt_numero: values.antt_numero || null,
      antt_vencimento: values.antt_vencimento || null,
      is_transportador_proprio: values.is_transportador_proprio,
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

    // Auto-create transportadora if flagged
    if (values.is_transportador_proprio && inserted) {
      const { data: transp, error: transpError } = await supabase.from("transportadores").insert({
        razao_social: values.nome,
        cpf_cnpj: values.cpf,
        status: "ativo",
        motorista_id: inserted.id,
      }).select().single();

      if (!transpError && transp) {
        // Auto-link via junction table
        await supabase.from("transportador_motoristas").insert({
          transportador_id: transp.id,
          motorista_id: inserted.id,
        });
      }
    }

    toast.success("Motorista cadastrado!");
    setOpen(false);
    resetForm();
    fetchMotoristas();
  };
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

  const filteredMotoristas = motoristas.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cpf.includes(searchTerm)
  );

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

                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3">Documentos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField name="cnh_numero" label="CNH Número" />
                        <FormField name="cnh_vencimento" label="CNH Vencimento" type="date" />
                        <FormField name="mopp_numero" label="MOPP Número" />
                        <FormField name="mopp_vencimento" label="MOPP Vencimento" type="date" />
                        <FormField name="antt_numero" label="ANTT Número" />
                        <FormField name="antt_vencimento" label="ANTT Vencimento" type="date" />
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
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
                        <DropdownMenuItem onClick={() => setEditMotorista(motorista)}>
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
                          <DropdownMenuItem onClick={() => setEditMotorista(motorista)}>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documentos - {docsMotorista?.nome}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="docs" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="docs" className="flex-1">Dados</TabsTrigger>
                <TabsTrigger value="anexos" className="flex-1">Anexos</TabsTrigger>
              </TabsList>
              <TabsContent value="docs" className="space-y-4 mt-4">
                {[
                  { label: "CNH", numero: docsMotorista?.cnh_numero, vencimento: docsMotorista?.cnh_vencimento },
                  { label: "MOPP", numero: docsMotorista?.mopp_numero, vencimento: docsMotorista?.mopp_vencimento },
                  { label: "ANTT", numero: docsMotorista?.antt_numero, vencimento: docsMotorista?.antt_vencimento },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-sm">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">{doc.numero || "Não informado"}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
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
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editMotorista} onOpenChange={(v) => !v && setEditMotorista(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  status: editMotorista.status || "ativo",
                  cnh_numero: editMotorista.cnh_numero || "",
                  cnh_vencimento: editMotorista.cnh_vencimento || "",
                  mopp_numero: editMotorista.mopp_numero || "",
                  mopp_vencimento: editMotorista.mopp_vencimento || "",
                  antt_numero: editMotorista.antt_numero || "",
                  antt_vencimento: editMotorista.antt_vencimento || "",
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
                      status: values.status,
                      cnh_numero: values.cnh_numero || null,
                      cnh_vencimento: values.cnh_vencimento || null,
                      mopp_numero: values.mopp_numero || null,
                      mopp_vencimento: values.mopp_vencimento || null,
                      antt_numero: values.antt_numero || null,
                      antt_vencimento: values.antt_vencimento || null,
                    })
                    .eq("id", editMotorista.id);
                  if (error) {
                    toast.error("Erro ao atualizar motorista");
                  } else {
                    toast.success("Motorista atualizado!");
                    setEditMotorista(null);
                    fetchMotoristas();
                  }
                }}
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="nome" label="Nome Completo" required />
                      <FormField name="cpf" label="CPF" placeholder="000.000.000-00" mask="cpf" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="telefone" label="Telefone" placeholder="(00) 00000-0000" mask="telefone" />
                      <FormField name="email" label="Email" type="email" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
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
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3">Documentos</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField name="cnh_numero" label="CNH Número" />
                        <FormField name="cnh_vencimento" label="CNH Vencimento" type="date" />
                        <FormField name="mopp_numero" label="MOPP Número" />
                        <FormField name="mopp_vencimento" label="MOPP Vencimento" type="date" />
                        <FormField name="antt_numero" label="ANTT Número" />
                        <FormField name="antt_vencimento" label="ANTT Vencimento" type="date" />
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
