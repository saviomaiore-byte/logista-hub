import { useState, useEffect } from "react";
import { Formik, Form } from "formik";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
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
  Users
} from "lucide-react";
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
};

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);

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
    const { error } = await supabase.from("motoristas").insert({
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
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("CPF já cadastrado");
      } else {
        toast.error("Erro ao salvar motorista");
      }
    } else {
      toast.success("Motorista cadastrado!");
      setOpen(false);
      resetForm();
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
        <div className="flex items-center justify-between mb-8">
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
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="nome" label="Nome Completo" required />
                      <FormField 
                        name="cpf" 
                        label="CPF" 
                        placeholder="000.000.000-00" 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField 
                        name="telefone" 
                        label="Telefone" 
                        placeholder="(00) 00000-0000" 
                      />
                      <FormField 
                        name="email" 
                        label="Email" 
                        type="email" 
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
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
                      {isSubmitting ? "Salvando..." : "Cadastrar"}
                    </Button>
                  </Form>
                )}
              </Formik>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
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
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
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
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                        <FileText className="h-3 w-3" />
                        Ver docs
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
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
      </div>
    </MainLayout>
  );
}
