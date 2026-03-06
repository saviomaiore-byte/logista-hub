import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Link2, Unlink, Truck, Container } from "lucide-react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { masks } from "@/lib/masks";

// Types
type Transportador = {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
  inscricao_estadual: string | null;
  contato: string | null;
  status: string;
  created_at: string;
};

type Cavalo = {
  id: string;
  transportador_id: string;
  placa: string;
  renavam: string | null;
  chassi: string | null;
  marca_modelo: string | null;
  ano: string | null;
  status: string;
  transportadores?: { razao_social: string } | null;
};

type Reboque = {
  id: string;
  transportador_id: string;
  placa: string;
  renavam: string | null;
  tipo: string | null;
  ano: string | null;
  status: string;
  transportadores?: { razao_social: string } | null;
};

// Schemas
const transportadorSchema = Yup.object().shape({
  razao_social: Yup.string().trim().required("Razão Social é obrigatória"),
  cpf_cnpj: Yup.string().trim().required("CPF/CNPJ é obrigatório"),
  inscricao_estadual: Yup.string().trim().nullable(),
  contato: Yup.string().trim().nullable(),
  status: Yup.string().oneOf(["ativo", "inativo"]).required(),
});

const cavaloSchema = Yup.object().shape({
  transportador_id: Yup.string().required("Transportador é obrigatório"),
  placa: Yup.string().trim().required("Placa é obrigatória"),
  renavam: Yup.string().trim().nullable(),
  chassi: Yup.string().trim().nullable(),
  marca_modelo: Yup.string().trim().nullable(),
  ano: Yup.string().trim().nullable(),
  status: Yup.string().oneOf(["ativo", "inativo"]).required(),
});

const reboqueSchema = Yup.object().shape({
  transportador_id: Yup.string().required("Transportador é obrigatório"),
  placa: Yup.string().trim().required("Placa é obrigatória"),
  renavam: Yup.string().trim().nullable(),
  tipo: Yup.string().trim().nullable(),
  ano: Yup.string().trim().nullable(),
  status: Yup.string().oneOf(["ativo", "inativo"]).required(),
});

export default function Transportadores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("transportadores");
  const [search, setSearch] = useState("");

  // Transportador state
  const [showTranspDialog, setShowTranspDialog] = useState(false);
  const [editingTransp, setEditingTransp] = useState<Transportador | null>(null);

  // Motorista vínculo state
  const [showVinculoDialog, setShowVinculoDialog] = useState(false);
  const [vinculoTranspId, setVinculoTranspId] = useState<string | null>(null);

  // Cavalo state
  const [showCavaloDialog, setShowCavaloDialog] = useState(false);
  const [editingCavalo, setEditingCavalo] = useState<Cavalo | null>(null);

  // Reboque state
  const [showReboqueDialog, setShowReboqueDialog] = useState(false);
  const [editingReboque, setEditingReboque] = useState<Reboque | null>(null);

  // Expanded transportador
  const [expandedTransp, setExpandedTransp] = useState<string | null>(null);

  // Queries
  const { data: transportadores = [] } = useQuery({
    queryKey: ["transportadores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transportadores").select("*").order("razao_social");
      if (error) throw error;
      return data as Transportador[];
    },
  });

  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("motoristas").select("id, nome, cpf").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: vinculos = [] } = useQuery({
    queryKey: ["transportador_motoristas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transportador_motoristas")
        .select("*, motoristas(id, nome, cpf)");
      if (error) throw error;
      return data;
    },
  });

  const { data: cavalos = [] } = useQuery({
    queryKey: ["cavalos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cavalos").select("*, transportadores(razao_social)").order("placa");
      if (error) throw error;
      return data as Cavalo[];
    },
  });

  const { data: reboques = [] } = useQuery({
    queryKey: ["reboques"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reboques").select("*, transportadores(razao_social)").order("placa");
      if (error) throw error;
      return data as Reboque[];
    },
  });

  // Mutations
  const saveTransp = useMutation({
    mutationFn: async (values: any) => {
      if (editingTransp) {
        const { error } = await supabase.from("transportadores").update(values).eq("id", editingTransp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transportadores").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportadores"] });
      setShowTranspDialog(false);
      setEditingTransp(null);
      toast({ title: editingTransp ? "Transportador atualizado" : "Transportador cadastrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteTransp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transportadores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportadores"] });
      toast({ title: "Transportador excluído" });
    },
  });

  const addVinculo = useMutation({
    mutationFn: async ({ transportador_id, motorista_id }: { transportador_id: string; motorista_id: string }) => {
      const { error } = await supabase.from("transportador_motoristas").insert({ transportador_id, motorista_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportador_motoristas"] });
      setShowVinculoDialog(false);
      toast({ title: "Motorista vinculado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeVinculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transportador_motoristas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportador_motoristas"] });
      toast({ title: "Motorista desvinculado" });
    },
  });

  const saveCavalo = useMutation({
    mutationFn: async (values: any) => {
      if (editingCavalo) {
        const { error } = await supabase.from("cavalos").update(values).eq("id", editingCavalo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cavalos").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cavalos"] });
      setShowCavaloDialog(false);
      setEditingCavalo(null);
      toast({ title: editingCavalo ? "Cavalo atualizado" : "Cavalo cadastrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteCavalo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cavalos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cavalos"] });
      toast({ title: "Cavalo excluído" });
    },
  });

  const saveReboque = useMutation({
    mutationFn: async (values: any) => {
      if (editingReboque) {
        const { error } = await supabase.from("reboques").update(values).eq("id", editingReboque.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reboques").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reboques"] });
      setShowReboqueDialog(false);
      setEditingReboque(null);
      toast({ title: editingReboque ? "Reboque atualizado" : "Reboque cadastrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteReboque = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reboques").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reboques"] });
      toast({ title: "Reboque excluído" });
    },
  });

  const filteredTransp = transportadores.filter(
    (t) =>
      t.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      t.cpf_cnpj.includes(search)
  );

  const filteredCavalos = cavalos.filter(
    (c) =>
      c.placa.toLowerCase().includes(search.toLowerCase()) ||
      c.marca_modelo?.toLowerCase().includes(search.toLowerCase()) ||
      c.transportadores?.razao_social?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReboques = reboques.filter(
    (r) =>
      r.placa.toLowerCase().includes(search.toLowerCase()) ||
      r.tipo?.toLowerCase().includes(search.toLowerCase()) ||
      r.transportadores?.razao_social?.toLowerCase().includes(search.toLowerCase())
  );

  const getMotoristasByTransp = (transpId: string) =>
    vinculos.filter((v: any) => v.transportador_id === transpId);

  const getAvailableMotoristas = (transpId: string) => {
    const vinculados = vinculos.filter((v: any) => v.transportador_id === transpId).map((v: any) => v.motorista_id);
    return motoristas.filter((m) => !vinculados.includes(m.id));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Transportadores</h1>
            <p className="text-muted-foreground">Gestão de transportadores, veículos e vínculos</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="transportadores">Transportadores</TabsTrigger>
            <TabsTrigger value="cavalos">Cavalos</TabsTrigger>
            <TabsTrigger value="reboques">Reboques</TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-md" />
          </div>

          {/* === TRANSPORTADORES === */}
          <TabsContent value="transportadores" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingTransp(null); setShowTranspDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Transportador
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Inscrição Estadual</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Motoristas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransp.map((t) => {
                      const mots = getMotoristasByTransp(t.id);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.razao_social}</TableCell>
                          <TableCell>{t.cpf_cnpj}</TableCell>
                          <TableCell>{t.inscricao_estadual || "-"}</TableCell>
                          <TableCell>{t.contato || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {mots.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Nenhum</span>
                              ) : (
                                mots.map((v: any) => (
                                  <div key={v.id} className="flex items-center gap-1">
                                    <span className="text-xs">{v.motoristas?.nome}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeVinculo.mutate(v.id)}>
                                      <Unlink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              )}
                              <Button variant="outline" size="sm" className="h-6 text-xs mt-1" onClick={() => { setVinculoTranspId(t.id); setShowVinculoDialog(true); }}>
                                <Link2 className="h-3 w-3 mr-1" /> Vincular
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                              {t.status === "ativo" ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingTransp(t); setShowTranspDialog(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir este transportador?")) deleteTransp.mutate(t.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredTransp.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum transportador encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === CAVALOS === */}
          <TabsContent value="cavalos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingCavalo(null); setShowCavaloDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Cavalo
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Renavam</TableHead>
                      <TableHead>Chassi</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Transportador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCavalos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.placa}</TableCell>
                        <TableCell>{c.renavam || "-"}</TableCell>
                        <TableCell>{c.chassi || "-"}</TableCell>
                        <TableCell>{c.marca_modelo || "-"}</TableCell>
                        <TableCell>{c.ano || "-"}</TableCell>
                        <TableCell>{c.transportadores?.razao_social || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "ativo" ? "default" : "secondary"}>
                            {c.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingCavalo(c); setShowCavaloDialog(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) deleteCavalo.mutate(c.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCavalos.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cavalo encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === REBOQUES === */}
          <TabsContent value="reboques" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingReboque(null); setShowReboqueDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Reboque
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Renavam</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Transportador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReboques.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.placa}</TableCell>
                        <TableCell>{r.renavam || "-"}</TableCell>
                        <TableCell>{r.tipo || "-"}</TableCell>
                        <TableCell>{r.ano || "-"}</TableCell>
                        <TableCell>{r.transportadores?.razao_social || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "ativo" ? "default" : "secondary"}>
                            {r.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingReboque(r); setShowReboqueDialog(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir?")) deleteReboque.mutate(r.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredReboques.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum reboque encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Transportador */}
      <Dialog open={showTranspDialog} onOpenChange={setShowTranspDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTransp ? "Editar Transportador" : "Novo Transportador"}</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={{
              razao_social: editingTransp?.razao_social || "",
              cpf_cnpj: editingTransp?.cpf_cnpj || "",
              inscricao_estadual: editingTransp?.inscricao_estadual || "",
              contato: editingTransp?.contato || "",
              status: editingTransp?.status || "ativo",
            }}
            validationSchema={transportadorSchema}
            onSubmit={(values) => saveTransp.mutate(values)}
            enableReinitialize
          >
            {({ isSubmitting, errors, touched, setFieldValue, values }) => (
              <Form className="space-y-4">
                <div>
                  <Label>Razão Social / Nome *</Label>
                  <Field as={Input} name="razao_social" />
                  {errors.razao_social && touched.razao_social && <p className="text-sm text-destructive mt-1">{errors.razao_social}</p>}
                </div>
                <div>
                  <Label>CPF/CNPJ *</Label>
                  <Input
                    value={values.cpf_cnpj}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setFieldValue("cpf_cnpj", raw.length > 11 ? masks.cnpj(e.target.value) : masks.cpf(e.target.value));
                    }}
                  />
                  {errors.cpf_cnpj && touched.cpf_cnpj && <p className="text-sm text-destructive mt-1">{errors.cpf_cnpj}</p>}
                </div>
                <div>
                  <Label>Inscrição Estadual</Label>
                  <Field as={Input} name="inscricao_estadual" />
                </div>
                <div>
                  <Label>Contato</Label>
                  <Field as={Input} name="contato" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={values.status} onValueChange={(v) => setFieldValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>Salvar</Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* Dialog Vincular Motorista */}
      <Dialog open={showVinculoDialog} onOpenChange={setShowVinculoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Motorista</DialogTitle>
          </DialogHeader>
          {vinculoTranspId && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {getAvailableMotoristas(vinculoTranspId).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Todos os motoristas já estão vinculados</p>
              ) : (
                getAvailableMotoristas(vinculoTranspId).map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.cpf}</p>
                    </div>
                    <Button size="sm" onClick={() => addVinculo.mutate({ transportador_id: vinculoTranspId, motorista_id: m.id })}>
                      <Link2 className="h-3 w-3 mr-1" /> Vincular
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Cavalo */}
      <Dialog open={showCavaloDialog} onOpenChange={setShowCavaloDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCavalo ? "Editar Cavalo" : "Novo Cavalo"}</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={{
              transportador_id: editingCavalo?.transportador_id || "",
              placa: editingCavalo?.placa || "",
              renavam: editingCavalo?.renavam || "",
              chassi: editingCavalo?.chassi || "",
              marca_modelo: editingCavalo?.marca_modelo || "",
              ano: editingCavalo?.ano || "",
              status: editingCavalo?.status || "ativo",
            }}
            validationSchema={cavaloSchema}
            onSubmit={(values) => saveCavalo.mutate(values)}
            enableReinitialize
          >
            {({ isSubmitting, errors, touched, setFieldValue, values }) => (
              <Form className="space-y-4">
                <div>
                  <Label>Transportador *</Label>
                  <Select value={values.transportador_id} onValueChange={(v) => setFieldValue("transportador_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {transportadores.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.transportador_id && touched.transportador_id && <p className="text-sm text-destructive mt-1">{errors.transportador_id}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Placa *</Label>
                    <Field as={Input} name="placa" placeholder="ABC-1234" />
                    {errors.placa && touched.placa && <p className="text-sm text-destructive mt-1">{errors.placa}</p>}
                  </div>
                  <div>
                    <Label>Renavam</Label>
                    <Field as={Input} name="renavam" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Chassi</Label>
                    <Field as={Input} name="chassi" />
                  </div>
                  <div>
                    <Label>Marca/Modelo</Label>
                    <Field as={Input} name="marca_modelo" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ano</Label>
                    <Field as={Input} name="ano" />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={values.status} onValueChange={(v) => setFieldValue("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>Salvar</Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      {/* Dialog Reboque */}
      <Dialog open={showReboqueDialog} onOpenChange={setShowReboqueDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReboque ? "Editar Reboque" : "Novo Reboque"}</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={{
              transportador_id: editingReboque?.transportador_id || "",
              placa: editingReboque?.placa || "",
              renavam: editingReboque?.renavam || "",
              tipo: editingReboque?.tipo || "",
              ano: editingReboque?.ano || "",
              status: editingReboque?.status || "ativo",
            }}
            validationSchema={reboqueSchema}
            onSubmit={(values) => saveReboque.mutate(values)}
            enableReinitialize
          >
            {({ isSubmitting, errors, touched, setFieldValue, values }) => (
              <Form className="space-y-4">
                <div>
                  <Label>Transportador *</Label>
                  <Select value={values.transportador_id} onValueChange={(v) => setFieldValue("transportador_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {transportadores.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.transportador_id && touched.transportador_id && <p className="text-sm text-destructive mt-1">{errors.transportador_id}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Placa *</Label>
                    <Field as={Input} name="placa" placeholder="ABC-1234" />
                    {errors.placa && touched.placa && <p className="text-sm text-destructive mt-1">{errors.placa}</p>}
                  </div>
                  <div>
                    <Label>Renavam</Label>
                    <Field as={Input} name="renavam" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={values.tipo || ""} onValueChange={(v) => setFieldValue("tipo", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carreta">Carreta</SelectItem>
                        <SelectItem value="bitrem">Bitrem</SelectItem>
                        <SelectItem value="rodotrem">Rodotrem</SelectItem>
                        <SelectItem value="sider">Sider</SelectItem>
                        <SelectItem value="bau">Baú</SelectItem>
                        <SelectItem value="tanque">Tanque</SelectItem>
                        <SelectItem value="graneleiro">Graneleiro</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano</Label>
                    <Field as={Input} name="ano" />
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={values.status} onValueChange={(v) => setFieldValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>Salvar</Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
