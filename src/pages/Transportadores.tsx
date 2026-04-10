import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Link2, Unlink, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ContratoAnexos } from "@/components/contrato/ContratoAnexos";
import { TransportadorAnexos } from "@/components/transportador/TransportadorAnexos";
import { openSignedFile } from "@/lib/storage";
import { FileUpload } from "@/components/FileUpload";
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
  endereco: string | null;
  data_nascimento: string | null;
  email: string | null;
  estado_civil: string | null;
  rg: string | null;
  status: string;
  situacao_operacional: string | null;
  created_at: string;
  motorista_id: string | null;
};

type Cavalo = {
  id: string;
  transportador_id: string;
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  marca_modelo: string | null;
  ano: string | null;
  status: string;
  arquivo_url: string | null;
  transportadores?: { razao_social: string } | null;
};

type Reboque = {
  id: string;
  transportador_id: string;
  placa: string | null;
  renavam: string | null;
  tipo: string | null;
  ano: string | null;
  status: string;
  arquivo_url: string | null;
  transportadores?: { razao_social: string } | null;
};

const REGIME_TRIBUTARIO_OPTIONS = [
  "Simples nacional",
  "Lucro presumido",
  "Lucro real",
  "MEI caminhoneiro",
] as const;

const transportadorSchema = Yup.object().shape({
  razao_social: Yup.string().trim().required("Razão Social é obrigatória"),
  cpf_cnpj: Yup.string().trim().required("CPF/CNPJ é obrigatório"),
  inscricao_estadual: Yup.string().trim().oneOf([...REGIME_TRIBUTARIO_OPTIONS]).nullable(),
  contato: Yup.string().trim().nullable(),
  endereco: Yup.string().trim().nullable(),
  data_nascimento: Yup.string().nullable(),
  email: Yup.string().trim().email("Email inválido").nullable(),
  estado_civil: Yup.string().trim().nullable(),
  rg: Yup.string().trim().nullable(),
  status: Yup.string().oneOf(["ativo", "inativo"]).required(),
});

const cavaloSchema = Yup.object().shape({
  transportador_id: Yup.string().required("Transportador é obrigatório"),
  arquivo_url: Yup.string().trim().nullable(),
});

const reboqueSchema = Yup.object().shape({
  transportador_id: Yup.string().required("Transportador é obrigatório"),
  arquivo_url: Yup.string().trim().nullable(),
});

export default function Transportadores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("transportadores");
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const [showTranspDialog, setShowTranspDialog] = useState(false);
  const [editingTransp, setEditingTransp] = useState<Transportador | null>(null);
  const [showVinculoDialog, setShowVinculoDialog] = useState(false);
  const [vinculoTranspId, setVinculoTranspId] = useState<string | null>(null);
  const [showCavaloDialog, setShowCavaloDialog] = useState(false);
  const [editingCavalo, setEditingCavalo] = useState<Cavalo | null>(null);
  const [showReboqueDialog, setShowReboqueDialog] = useState(false);
  const [editingReboque, setEditingReboque] = useState<Reboque | null>(null);
  const [docsTransp, setDocsTransp] = useState<Transportador | null>(null);
  const [docsTab, setDocsTab] = useState("anexos");

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
      const { data, error } = await supabase.from("cavalos").select("*, transportadores(razao_social)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Cavalo[];
    },
  });

  const { data: reboques = [] } = useQuery({
    queryKey: ["reboques"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reboques").select("*, transportadores(razao_social)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reboque[];
    },
  });

  const saveTransp = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        inscricao_estadual: values.inscricao_estadual?.trim() || null,
        contato: values.contato?.trim() || null,
        endereco: values.endereco?.trim() || null,
        data_nascimento: values.data_nascimento || null,
        email: values.email?.trim() || null,
        estado_civil: values.estado_civil?.trim() || null,
        rg: values.rg?.trim() || null,
      };

      if (editingTransp) {
        const { error } = await supabase.from("transportadores").update(payload).eq("id", editingTransp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transportadores").insert(payload);
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
    mutationFn: async (values: { transportador_id: string; arquivo_url?: string | null }) => {
      const payload = {
        transportador_id: values.transportador_id,
        arquivo_url: values.arquivo_url?.trim() || null,
      };

      if (editingCavalo) {
        const { error } = await supabase.from("cavalos").update(payload).eq("id", editingCavalo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cavalos").insert(payload);
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
    mutationFn: async (values: { transportador_id: string; arquivo_url?: string | null }) => {
      const payload = {
        transportador_id: values.transportador_id,
        arquivo_url: values.arquivo_url?.trim() || null,
      };

      if (editingReboque) {
        const { error } = await supabase.from("reboques").update(payload).eq("id", editingReboque.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reboques").insert(payload);
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

  const filteredCavalos = cavalos.filter((c) =>
    c.transportadores?.razao_social?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReboques = reboques.filter((r) =>
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
            <p className="text-muted-foreground">{transportadores.length} transportador{transportadores.length !== 1 ? "es" : ""} cadastrado{transportadores.length !== 1 ? "s" : ""} • Gestão de transportadores, veículos e vínculos</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="transportadores">Transportadores</TabsTrigger>
            <TabsTrigger value="cavalos">Cavalos</TabsTrigger>
            <TabsTrigger value="reboques">Reboques</TabsTrigger>
          </TabsList>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:max-w-md" />
          </div>

          <TabsContent value="transportadores" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingTransp(null); setShowTranspDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Transportador
              </Button>
            </div>

            {isMobile ? (
              <div className="space-y-3">
                {filteredTransp.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum transportador encontrado</div>
                ) : filteredTransp.map((t) => {
                  const mots = getMotoristasByTransp(t.id);
                  return (
                    <div key={t.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{t.razao_social}</p>
                            {t.motorista_id && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">Motorista Próprio</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{t.cpf_cnpj}</p>
                        </div>
                        <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                          {t.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      {t.contato && <p className="text-sm text-muted-foreground">{t.contato}</p>}
                      <div className="text-sm">
                        <p className="text-xs text-muted-foreground mb-1">Motoristas vinculados:</p>
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
                      <div className="flex items-center gap-1 pt-1 border-t border-border flex-wrap">
                        <Button variant="ghost" size="sm" onClick={() => { setDocsTransp(t); setDocsTab("anexos"); }}>
                          <FileText className="h-4 w-4 mr-1" /> Ver docs
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDocsTransp(t); setDocsTab("contratos"); }}>
                          <FileText className="h-4 w-4 mr-1" /> Ver contratos
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingTransp(t); setShowTranspDialog(true); }}>
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir?")) deleteTransp.mutate(t.id); }}>
                          <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Razão Social</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>Regime Tributário</TableHead>
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
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {t.razao_social}
                                {t.motorista_id && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary text-primary">Motorista Próprio</Badge>
                                )}
                              </div>
                            </TableCell>
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
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button variant="ghost" size="sm" onClick={() => { setDocsTransp(t); setDocsTab("anexos"); }} title="Ver docs">
                                  <FileText className="h-4 w-4 mr-1" /> Ver docs
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setDocsTransp(t); setDocsTab("contratos"); }} title="Ver contratos">
                                  <FileText className="h-4 w-4 mr-1" /> Ver contratos
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setEditingTransp(t); setShowTranspDialog(true); }}>
                                  <Pencil className="h-4 w-4 mr-1" /> Editar
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
            )}
          </TabsContent>

          <TabsContent value="cavalos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingCavalo(null); setShowCavaloDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Cavalo
              </Button>
            </div>

            {isMobile ? (
              <div className="space-y-3">
                {filteredCavalos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum cavalo encontrado</div>
                ) : filteredCavalos.map((c) => (
                  <div key={c.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground">{c.transportadores?.razao_social || "-"}</p>
                      <p className="text-sm text-muted-foreground">Transportador vinculado</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Documento</span>
                      {c.arquivo_url ? (
                        <Button variant="outline" size="sm" onClick={() => openSignedFile(c.arquivo_url!)}>
                          <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem anexo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t border-border">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingCavalo(c); setShowCavaloDialog(true); }}>
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir?")) deleteCavalo.mutate(c.id); }}>
                        <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transportador</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCavalos.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.transportadores?.razao_social || "-"}</TableCell>
                          <TableCell>
                            {c.arquivo_url ? (
                              <Button variant="outline" size="sm" onClick={() => openSignedFile(c.arquivo_url!)}>
                                <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">Sem anexo</span>
                            )}
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
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum cavalo encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reboques" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingReboque(null); setShowReboqueDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Reboque
              </Button>
            </div>

            {isMobile ? (
              <div className="space-y-3">
                {filteredReboques.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum reboque encontrado</div>
                ) : filteredReboques.map((r) => (
                  <div key={r.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground">{r.transportadores?.razao_social || "-"}</p>
                      <p className="text-sm text-muted-foreground">Transportador vinculado</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">Documento</span>
                      {r.arquivo_url ? (
                        <Button variant="outline" size="sm" onClick={() => openSignedFile(r.arquivo_url!)}>
                          <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem anexo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t border-border">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingReboque(r); setShowReboqueDialog(true); }}>
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir?")) deleteReboque.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transportador</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReboques.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.transportadores?.razao_social || "-"}</TableCell>
                          <TableCell>
                            {r.arquivo_url ? (
                              <Button variant="outline" size="sm" onClick={() => openSignedFile(r.arquivo_url!)}>
                                <FileText className="h-4 w-4 mr-1" /> Abrir anexo
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">Sem anexo</span>
                            )}
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
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum reboque encontrado</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
              endereco: editingTransp?.endereco || "",
              data_nascimento: editingTransp?.data_nascimento || "",
              email: editingTransp?.email || "",
              estado_civil: editingTransp?.estado_civil || "",
              rg: editingTransp?.rg || "",
              status: editingTransp?.status || "ativo",
              antt_numero: (editingTransp as any)?.antt_numero || "",
              alvara_numero: (editingTransp as any)?.alvara_numero || "",
              certificado_numero: (editingTransp as any)?.certificado_numero || "",
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
                  {errors.razao_social && touched.razao_social && <p className="mt-1 text-sm text-destructive">{errors.razao_social}</p>}
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
                  {errors.cpf_cnpj && touched.cpf_cnpj && <p className="mt-1 text-sm text-destructive">{errors.cpf_cnpj}</p>}
                </div>
                <div>
                  <Label>Regime Tributário</Label>
                  <Select value={values.inscricao_estadual} onValueChange={(value) => setFieldValue("inscricao_estadual", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o regime tributário" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIME_TRIBUTARIO_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Contato / Telefone</Label>
                  <Field as={Input} name="contato" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Field as={Input} name="email" type="email" />
                  {errors.email && touched.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Field as={Input} name="endereco" />
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
                <div className="border-t pt-4 mt-2 space-y-3">
                  <Label className="font-medium">Documentos</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tem_antt_transp"
                      checked={!!values.antt_numero}
                      onCheckedChange={(checked) => setFieldValue("antt_numero", checked ? "Sim" : "")}
                    />
                    <Label htmlFor="tem_antt_transp" className="text-sm cursor-pointer">Possui ANTT</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tem_alvara_transp"
                      checked={!!values.alvara_numero}
                      onCheckedChange={(checked) => setFieldValue("alvara_numero", checked ? "Sim" : "")}
                    />
                    <Label htmlFor="tem_alvara_transp" className="text-sm cursor-pointer">Possui Alvará</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tem_certificado_transp"
                      checked={!!values.certificado_numero}
                      onCheckedChange={(checked) => setFieldValue("certificado_numero", checked ? "Sim" : "")}
                    />
                    <Label htmlFor="tem_certificado_transp" className="text-sm cursor-pointer">Possui Certificado</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>Salvar</Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      <Dialog open={showVinculoDialog} onOpenChange={setShowVinculoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Motorista</DialogTitle>
          </DialogHeader>
          {vinculoTranspId && (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {getAvailableMotoristas(vinculoTranspId).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Todos os motoristas já estão vinculados</p>
              ) : (
                getAvailableMotoristas(vinculoTranspId).map((m) => (
                  <div key={m.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{m.nome}</p>
                      <p className="text-xs text-muted-foreground">{m.cpf}</p>
                    </div>
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => addVinculo.mutate({ transportador_id: vinculoTranspId, motorista_id: m.id })}>
                      <Link2 className="mr-1 h-3 w-3" /> Vincular
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCavaloDialog} onOpenChange={setShowCavaloDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCavalo ? "Editar Cavalo" : "Novo Cavalo"}</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={{
              transportador_id: editingCavalo?.transportador_id || "",
              arquivo_url: editingCavalo?.arquivo_url || "",
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
                  {errors.transportador_id && touched.transportador_id && <p className="mt-1 text-sm text-destructive">{errors.transportador_id}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Anexo do documento</Label>
                  <FileUpload
                    currentUrl={values.arquivo_url || undefined}
                    onUpload={(url) => setFieldValue("arquivo_url", url)}
                    onRemove={() => setFieldValue("arquivo_url", "")}
                    folder="cavalos"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    label="Anexar documento do cavalo"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>Salvar</Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      <Dialog open={showReboqueDialog} onOpenChange={setShowReboqueDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReboque ? "Editar Reboque" : "Novo Reboque"}</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={{
              transportador_id: editingReboque?.transportador_id || "",
              arquivo_url: editingReboque?.arquivo_url || "",
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
                  {errors.transportador_id && touched.transportador_id && <p className="mt-1 text-sm text-destructive">{errors.transportador_id}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Anexo do documento</Label>
                  <FileUpload
                    currentUrl={values.arquivo_url || undefined}
                    onUpload={(url) => setFieldValue("arquivo_url", url)}
                    onRemove={() => setFieldValue("arquivo_url", "")}
                    folder="reboques"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    label="Anexar documento do reboque"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>Salvar</Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      <Dialog open={!!docsTransp} onOpenChange={(open) => {
        if (!open) {
          setDocsTransp(null);
          setDocsTab("anexos");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{docsTab === "contratos" ? "Contratos" : "Documentos"} - {docsTransp?.razao_social}</DialogTitle>
          </DialogHeader>
          <Tabs value={docsTab} onValueChange={setDocsTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="anexos" className="flex-1">Anexos</TabsTrigger>
              <TabsTrigger value="contratos" className="flex-1">Contratos</TabsTrigger>
            </TabsList>
            <TabsContent value="anexos" className="mt-4">
              {docsTransp && (
                <TransportadorAnexos transportadorId={docsTransp.id} transportadorNome={docsTransp.razao_social} />
              )}
            </TabsContent>
            <TabsContent value="contratos" className="mt-4">
              {docsTransp && (
                <ContratoAnexos transportador_id={docsTransp.id} nome={docsTransp.razao_social} />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
