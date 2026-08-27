import { useState, useEffect } from "react";
import type { FormikHelpers } from "formik";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportDbError } from "@/lib/dbError";
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
  type Transportadora,
} from "@/components/motorista/types";

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
    const { data, error } = await supabase.from("transportadores").select("id, razao_social, cpf_cnpj").order("razao_social");
    if (reportDbError("carregar transportadoras", error, toast.error)) return;
    setTransportadoras(data || []);
  };

  const fetchMotoristaTransportadoraLinks = async () => {
    const { data, error } = await supabase.from("transportador_motoristas").select("motorista_id, transportador_id");
    if (reportDbError("carregar vínculos de transportadoras", error, toast.error)) return;
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
    const { data: current, error: currentError } = await supabase
      .from("transportador_motoristas")
      .select("id, transportador_id")
      .eq("motorista_id", motoristaId);

    if (reportDbError("carregar vínculos do motorista", currentError, toast.error)) return;

    const currentIds = (current || []).map((c) => c.transportador_id);

    const toRemove = (current || []).filter((c) => !newTransportadoraIds.includes(c.transportador_id));
    for (const r of toRemove) {
      const { error: removeError } = await supabase.from("transportador_motoristas").delete().eq("id", r.id);
      if (reportDbError("remover vínculo de transportadora", removeError, toast.error)) return;
    }

    const toAdd = newTransportadoraIds.filter((id) => !currentIds.includes(id));
    if (toAdd.length > 0) {
      const { error: addError } = await supabase.from("transportador_motoristas").insert(
        toAdd.map((transportador_id) => ({ transportador_id, motorista_id: motoristaId }))
      );
      if (reportDbError("vincular transportadora", addError, toast.error)) return;
    }
  };

  const handleSubmit = async (
    values: MotoristaFormValues,
    { resetForm }: FormikHelpers<MotoristaFormValues>
  ) => {
    const { data: inserted, error } = await supabase
      .from("motoristas")
      .insert(formValuesToRow(values))
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("CPF já cadastrado");
      } else {
        toast.error("Erro ao salvar motorista");
      }
      return;
    }

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

  const handleUpdate = async (values: MotoristaFormValues) => {
    if (!editMotorista) return;
    const { error } = await supabase
      .from("motoristas")
      .update(formValuesToRow(values))
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
