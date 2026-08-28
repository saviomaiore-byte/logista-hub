import { useState } from "react";
import type { FormikHelpers } from "formik";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { toast } from "sonner";
import {
  useMotoristas,
  useMotoristaVinculos,
  useCriarMotorista,
  useAtualizarMotorista,
  useExcluirMotorista,
} from "@/hooks/useMotoristas";
import { useTransportadoresOpcoes } from "@/hooks/useContratos";
import { MotoristasHeader } from "@/components/motorista/MotoristasHeader";
import { MotoristasFilters } from "@/components/motorista/MotoristasFilters";
import { MotoristasList } from "@/components/motorista/MotoristasList";
import { MotoristaDocsDialog } from "@/components/motorista/MotoristaDocsDialog";
import { MotoristaFormDialog } from "@/components/motorista/MotoristaFormDialog";
import {
  initialValues,
  formValuesToRow,
  motoristaToFormValues,
  type Motorista,
  type MotoristaFormValues,
} from "@/components/motorista/types";

export default function Motoristas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [transportadoraFilter, setTransportadoraFilter] = useState("todas");
  const [open, setOpen] = useState(false);
  const [docsMotorista, setDocsMotorista] = useState<Motorista | null>(null);
  const [editMotorista, setEditMotorista] = useState<Motorista | null>(null);
  const [selectedTransportadoras, setSelectedTransportadoras] = useState<string[]>([]);
  const isMobile = useIsMobile();

  const { data: motoristas = [], isLoading: loadingMotoristas } = useMotoristas();
  // Reutiliza a consulta já centralizada de transportadores (mesma tabela,
  // mesmos campos e mesma ordenação) em vez de duplicar a query.
  const { data: transportadoras = [], isLoading: loadingTransportadoras } =
    useTransportadoresOpcoes();
  const { data: motoristaTransportadoras = {}, isLoading: loadingVinculos } =
    useMotoristaVinculos();

  const loading = loadingMotoristas || loadingTransportadoras || loadingVinculos;

  const criarMotorista = useCriarMotorista();
  const atualizarMotorista = useAtualizarMotorista();
  const excluirMotorista = useExcluirMotorista();

  const handleSubmit = async (
    values: MotoristaFormValues,
    { resetForm }: FormikHelpers<MotoristaFormValues>
  ) => {
    try {
      await criarMotorista.mutateAsync({
        row: formValuesToRow(values),
        transportadoras: selectedTransportadoras,
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") {
        toast.error("CPF já cadastrado");
      } else {
        toast.error("Erro ao salvar motorista");
      }
      return;
    }

    toast.success("Motorista cadastrado!");
    setOpen(false);
    setSelectedTransportadoras([]);
    resetForm();
  };

  const handleUpdate = async (values: MotoristaFormValues) => {
    if (!editMotorista) return;
    try {
      await atualizarMotorista.mutateAsync({
        id: editMotorista.id,
        row: formValuesToRow(values),
        transportadoras: selectedTransportadoras,
      });
    } catch {
      toast.error("Erro ao atualizar motorista");
      return;
    }

    toast.success("Motorista atualizado!");
    setEditMotorista(null);
    setSelectedTransportadoras([]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este motorista?")) return;
    try {
      await excluirMotorista.mutateAsync(id);
    } catch {
      toast.error("Erro ao excluir motorista");
      return;
    }
    toast.success("Motorista excluído!");
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
        <MotoristasHeader total={motoristas.length} onNovo={() => setOpen(true)} />

        <MotoristasFilters
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((prev) => !prev)}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          transportadoraFilter={transportadoraFilter}
          onTransportadoraFilterChange={setTransportadoraFilter}
          transportadoras={transportadoras}
          onClearFilters={() => {
            setSearchTerm("");
            setStatusFilter("todos");
            setTransportadoraFilter("todas");
          }}
        />

        <MotoristasList
          loading={loading}
          isMobile={isMobile}
          items={filteredMotoristas}
          searchTerm={searchTerm}
          transportadoras={transportadoras}
          vinculos={motoristaTransportadoras}
          onEdit={(motorista) => {
            setEditMotorista(motorista);
            setSelectedTransportadoras(motoristaTransportadoras[motorista.id] || []);
          }}
          onDocs={setDocsMotorista}
          onDelete={handleDelete}
        />

        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <p>Mostrando {filteredMotoristas.length} de {motoristas.length} motoristas</p>
        </div>

        <MotoristaDocsDialog motorista={docsMotorista} onClose={() => setDocsMotorista(null)} />

        <MotoristaFormDialog
          open={open}
          onOpenChange={setOpen}
          title="Cadastrar Motorista"
          submitLabel="Cadastrar"
          moppCheckboxId="mopp_vitalicio"
          contentClassName="max-w-2xl max-h-[90vh] overflow-y-auto"
          initialValues={initialValues}
          transportadoras={transportadoras}
          selectedTransportadoras={selectedTransportadoras}
          onSelectedTransportadorasChange={setSelectedTransportadoras}
          onSubmit={handleSubmit}
        />

        <MotoristaFormDialog
          open={!!editMotorista}
          onOpenChange={(v) => !v && setEditMotorista(null)}
          title="Editar Motorista"
          submitLabel="Salvar Alterações"
          moppCheckboxId="mopp_vitalicio_edit"
          initialValues={editMotorista ? motoristaToFormValues(editMotorista) : initialValues}
          transportadoras={transportadoras}
          selectedTransportadoras={selectedTransportadoras}
          onSelectedTransportadorasChange={setSelectedTransportadoras}
          onSubmit={handleUpdate}
        />
      </div>
    </MainLayout>
  );
}
