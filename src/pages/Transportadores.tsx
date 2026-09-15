import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { useMotoristas } from "@/hooks/useMotoristas";
import {
  useTransportadores,
  useTransportadorVinculos,
  useCavalos,
  useReboques,
  useSalvarTransportador,
  useExcluirTransportador,
  useVincularMotorista,
  useDesvincularMotorista,
  useMarcarMotoristaProprio,
  useSalvarCavalo,
  useExcluirCavalo,
  useSalvarReboque,
  useExcluirReboque,
} from "@/hooks/useTransportadores";
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("transportadores");
  const [search, setSearch] = useState("");
  const [regimeFilter, setRegimeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
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

  const { data: transportadores = [] } = useTransportadores();
  // Reutiliza a listagem central de motoristas (mesma queryKey ["motoristas"]).
  const { data: motoristas = [] } = useMotoristas();
  const { data: vinculos = [] } = useTransportadorVinculos();
  const { data: cavalos = [] } = useCavalos();
  const { data: reboques = [] } = useReboques();

  const errorToast = (e: any) =>
    toast({ title: "Erro", description: e?.message, variant: "destructive" });

  const saveTransp = useSalvarTransportador();
  const deleteTransp = useExcluirTransportador();
  const addVinculo = useVincularMotorista();
  const removeVinculo = useDesvincularMotorista();
  const marcarProprio = useMarcarMotoristaProprio();
  const saveCavalo = useSalvarCavalo();
  const deleteCavalo = useExcluirCavalo();
  const saveReboque = useSalvarReboque();
  const deleteReboque = useExcluirReboque();

  const handleSaveTransp = (values: any) => {
    const editando = !!editingTransp;
    saveTransp.mutate(
      { id: editingTransp?.id, values },
      {
        onSuccess: () => {
          setShowTranspDialog(false);
          setEditingTransp(null);
          toast({ title: editando ? "Transportador atualizado" : "Transportador cadastrado" });
        },
        onError: errorToast,
      },
    );
  };

  const handleDeleteTransp = (id: string) => {
    deleteTransp.mutate(id, { onSuccess: () => toast({ title: "Transportador excluído" }) });
  };

  const handleAddVinculo = (transportador_id: string, motorista_id: string) => {
    addVinculo.mutate(
      { transportador_id, motorista_id },
      {
        onSuccess: () => {
          setShowVinculoDialog(false);
          toast({ title: "Motorista vinculado" });
        },
        onError: errorToast,
      },
    );
  };

  const handleRemoveVinculo = (id: string) => {
    const vinculo = (vinculos as any[]).find((v) => v.id === id);
    if (
      vinculo?.motorista_proprio &&
      !confirm(
        "Este motorista está marcado como Motorista Próprio desta transportadora. Ao remover o vínculo, a marcação será perdida e o motorista voltará a exigir Contrato e Termo de Adesão. Deseja remover mesmo assim?",
      )
    ) {
      return;
    }
    removeVinculo.mutate(id, { onSuccess: () => toast({ title: "Motorista desvinculado" }) });
  };

  const handleToggleMotoristaProprio = (id: string, motorista_proprio: boolean) => {
    marcarProprio.mutate(
      { id, motorista_proprio },
      {
        onSuccess: () =>
          toast({
            title: motorista_proprio
              ? "Marcado como motorista próprio"
              : "Marcação de motorista próprio removida",
          }),
        onError: errorToast,
      },
    );
  };

  const handleSaveCavalo = (values: any) => {
    const editando = !!editingCavalo;
    saveCavalo.mutate(
      { id: editingCavalo?.id, values },
      {
        onSuccess: () => {
          setShowCavaloDialog(false);
          setEditingCavalo(null);
          toast({ title: editando ? "Cavalo atualizado" : "Cavalo cadastrado" });
        },
        onError: errorToast,
      },
    );
  };

  const handleDeleteCavalo = (id: string) => {
    deleteCavalo.mutate(id, { onSuccess: () => toast({ title: "Cavalo excluído" }) });
  };

  const handleSaveReboque = (values: any) => {
    const editando = !!editingReboque;
    saveReboque.mutate(
      { id: editingReboque?.id, values },
      {
        onSuccess: () => {
          setShowReboqueDialog(false);
          setEditingReboque(null);
          toast({ title: editando ? "Reboque atualizado" : "Reboque cadastrado" });
        },
        onError: errorToast,
      },
    );
  };

  const handleDeleteReboque = (id: string) => {
    deleteReboque.mutate(id, { onSuccess: () => toast({ title: "Reboque excluído" }) });
  };

  const filteredTransp = transportadores.filter((t) => {
    const matchesSearch =
      t.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      t.cpf_cnpj.includes(search);
    const matchesRegime = regimeFilter === "todos" || t.inscricao_estadual === regimeFilter;
    const matchesStatus = statusFilter === "todos" || t.status === statusFilter;
    return matchesSearch && matchesRegime && matchesStatus;
  });

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
    return motoristas
      .filter((m) => !vinculados.includes(m.id))
      .map((m) => ({ id: m.id, nome: m.nome, cpf: m.cpf }));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <TransportadoresHeader
          total={transportadores.length}
          onNew={() => { setEditingTransp(null); setShowTranspDialog(true); }}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-xl bg-muted/70 p-1">
            <TabsTrigger className="rounded-lg text-xs" value="transportadores">Transportadores</TabsTrigger>
            <TabsTrigger className="rounded-lg text-xs" value="cavalos">Cavalos</TabsTrigger>
            <TabsTrigger className="rounded-lg text-xs" value="reboques">Reboques</TabsTrigger>
          </TabsList>

          <TransportadoresSearch
            value={search}
            onChange={setSearch}
            regime={regimeFilter}
            onRegimeChange={setRegimeFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
          />

          <TabsContent value="transportadores" className="mt-0">
            <TransportadoresList
              items={filteredTransp}
              isMobile={isMobile}
              getMotoristasByTransp={getMotoristasByTransp}
              onOpen={(t) => navigate(`/transportadores/${t.id}`)}
              onEdit={(t) => { setEditingTransp(t); setShowTranspDialog(true); }}
              onDelete={handleDeleteTransp}
              onVincular={(id) => { setVinculoTranspId(id); setShowVinculoDialog(true); }}
              onRemoveVinculo={handleRemoveVinculo}
              onToggleMotoristaProprio={handleToggleMotoristaProprio}
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
              onDelete={handleDeleteCavalo}
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
              onDelete={handleDeleteReboque}
            />
          </TabsContent>
        </Tabs>
      </div>

      <TransportadorFormDialog
        open={showTranspDialog}
        onOpenChange={setShowTranspDialog}
        editing={editingTransp}
        onSubmit={handleSaveTransp}
      />

      <VincularMotoristaDialog
        open={showVinculoDialog}
        onOpenChange={setShowVinculoDialog}
        transportadorId={vinculoTranspId}
        motoristasDisponiveis={vinculoTranspId ? getAvailableMotoristas(vinculoTranspId) : []}
        onVincular={handleAddVinculo}
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
        onSubmit={handleSaveCavalo}
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
        onSubmit={handleSaveReboque}
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
