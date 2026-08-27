import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import {
  cavaloSchema,
  reboqueSchema,
  type Cavalo,
  type Reboque,
  type Transportador,
} from "@/components/transportador/types";
import { TransportadoresHeader } from "@/components/transportador/TransportadoresHeader";
import { TransportadoresSearch } from "@/components/transportador/TransportadoresSearch";
import { TransportadoresList } from "@/components/transportador/TransportadoresList";
import { CavalosList } from "@/components/transportador/CavalosList";
import { ReboquesList } from "@/components/transportador/ReboquesList";
import { TransportadorFormDialog } from "@/components/transportador/TransportadorFormDialog";
import { VeiculoFormDialog } from "@/components/transportador/VeiculoFormDialog";
import { VincularMotoristaDialog } from "@/components/transportador/VincularMotoristaDialog";
import { TransportadorDocsDialog } from "@/components/transportador/TransportadorDocsDialog";

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
        situacao_operacional: values.situacao_operacional || null,
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
        <TransportadoresHeader total={transportadores.length} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="transportadores">Transportadores</TabsTrigger>
            <TabsTrigger value="cavalos">Cavalos</TabsTrigger>
            <TabsTrigger value="reboques">Reboques</TabsTrigger>
          </TabsList>

          <TransportadoresSearch value={search} onChange={setSearch} />

          <TabsContent value="transportadores" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingTransp(null); setShowTranspDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Transportador
              </Button>
            </div>

            <TransportadoresList
              items={filteredTransp}
              isMobile={isMobile}
              getMotoristasByTransp={getMotoristasByTransp}
              onEdit={(t) => { setEditingTransp(t); setShowTranspDialog(true); }}
              onDelete={(id) => deleteTransp.mutate(id)}
              onVincular={(id) => { setVinculoTranspId(id); setShowVinculoDialog(true); }}
              onRemoveVinculo={(id) => removeVinculo.mutate(id)}
              onVerDocs={(t) => { setDocsTransp(t); setDocsTab("anexos"); }}
              onVerContratos={(t) => { setDocsTransp(t); setDocsTab("contratos"); }}
            />
          </TabsContent>

          <TabsContent value="cavalos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingCavalo(null); setShowCavaloDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Cavalo
              </Button>
            </div>

            <CavalosList
              items={filteredCavalos}
              isMobile={isMobile}
              onEdit={(c) => { setEditingCavalo(c); setShowCavaloDialog(true); }}
              onDelete={(id) => deleteCavalo.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="reboques" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingReboque(null); setShowReboqueDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Reboque
              </Button>
            </div>

            <ReboquesList
              items={filteredReboques}
              isMobile={isMobile}
              onEdit={(r) => { setEditingReboque(r); setShowReboqueDialog(true); }}
              onDelete={(id) => deleteReboque.mutate(id)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <TransportadorFormDialog
        open={showTranspDialog}
        onOpenChange={setShowTranspDialog}
        editing={editingTransp}
        onSubmit={(values) => saveTransp.mutate(values)}
      />

      <VincularMotoristaDialog
        open={showVinculoDialog}
        onOpenChange={setShowVinculoDialog}
        transportadorId={vinculoTranspId}
        motoristasDisponiveis={vinculoTranspId ? getAvailableMotoristas(vinculoTranspId) : []}
        onVincular={(transportador_id, motorista_id) => addVinculo.mutate({ transportador_id, motorista_id })}
      />

      <VeiculoFormDialog
        open={showCavaloDialog}
        onOpenChange={setShowCavaloDialog}
        editing={editingCavalo}
        title={editingCavalo ? "Editar Cavalo" : "Novo Cavalo"}
        transportadores={transportadores}
        validationSchema={cavaloSchema}
        folder="cavalos"
        uploadLabel="Anexar documento do cavalo"
        onSubmit={(values) => saveCavalo.mutate(values)}
      />

      <VeiculoFormDialog
        open={showReboqueDialog}
        onOpenChange={setShowReboqueDialog}
        editing={editingReboque}
        title={editingReboque ? "Editar Reboque" : "Novo Reboque"}
        transportadores={transportadores}
        validationSchema={reboqueSchema}
        folder="reboques"
        uploadLabel="Anexar documento do reboque"
        onSubmit={(values) => saveReboque.mutate(values)}
      />

      <TransportadorDocsDialog
        transportador={docsTransp}
        tab={docsTab}
        onTabChange={setDocsTab}
        onClose={() => { setDocsTransp(null); setDocsTab("anexos"); }}
      />
    </MainLayout>
  );
}
