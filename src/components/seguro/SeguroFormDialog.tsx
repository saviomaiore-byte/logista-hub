import { Formik, Form } from "formik";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { seguroSchema } from "@/lib/validationSchemas";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";
import { Seguro, SeguroFormValues, tiposSeguros } from "./types";

interface SeguroFormDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  editingSeguro: Seguro | null;
  formInitialValues: SeguroFormValues;
  motoristas?: { id: string; nome: string; cpf: string }[];
  onSubmit: (values: SeguroFormValues, helpers: any) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function SeguroFormDialog({
  open,
  onOpenChange,
  editingSeguro,
  formInitialValues,
  motoristas,
  onSubmit,
  onCancel,
  isPending,
}: SeguroFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Seguro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingSeguro ? "Editar Seguro" : "Novo Seguro"}</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={formInitialValues}
          validationSchema={seguroSchema}
          onSubmit={onSubmit}
          enableReinitialize
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormSelectWrapper name="motorista_id" label="Segurado (opcional)">
                  <Select value={values.motorista_id} onValueChange={(v) => setFieldValue("motorista_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um segurado" /></SelectTrigger>
                    <SelectContent>
                      {motoristas?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.nome} - {m.cpf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormSelectWrapper>
                <FormSelectWrapper name="tipo" label="Tipo de Seguro" required>
                  <Select value={values.tipo} onValueChange={(v) => setFieldValue("tipo", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {tiposSeguros.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormSelectWrapper>
                <FormField name="seguradora" label="Seguradora" required />
                <FormField name="numero_apolice" label="Número da Apólice" />
                <FormField name="valor_premio" label="Valor do Prêmio (R$)" type="number" step="0.01" />
                <FormSelectWrapper name="status" label="Status">
                  <Select value={values.status} onValueChange={(v) => setFieldValue("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormSelectWrapper>
                <FormField name="vigencia_inicio" label="Vigência Início" type="date" />
                <FormField name="vigencia_fim" label="Vigência Fim" type="date" />
              </div>
              <FormField name="observacoes" label="Observações" as="textarea" />
              <div className="space-y-2">
                <label className="text-sm font-medium">Anexar Apólice (PDF)</label>
                <FileUpload
                  currentUrl={values.arquivo_url || undefined}
                  onUpload={(url) => setFieldValue("arquivo_url", url)}
                  onRemove={() => setFieldValue("arquivo_url", "")}
                  folder="seguros"
                  accept=".pdf,.jpg,.jpeg,.png"
                  label="Anexar Apólice"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || isPending}>
                  {editingSeguro ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
