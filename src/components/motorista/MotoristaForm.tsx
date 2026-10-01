import { Formik, Form, FormikHelpers } from "formik";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormSelectWrapper } from "@/components/form/FormField";
import { motoristaSchema } from "@/lib/validationSchemas";
import { TransportadorasSelector } from "./TransportadorasSelector";
import type { MotoristaFormValues, Transportadora } from "./types";

type Props = {
  initialValues: MotoristaFormValues;
  submitLabel: string;
  moppCheckboxId: string;
  transportadoras: Transportadora[];
  selectedTransportadoras: string[];
  onSelectedTransportadorasChange: (ids: string[]) => void;
  onSubmit: (values: MotoristaFormValues, helpers: FormikHelpers<MotoristaFormValues>) => void | Promise<void>;
};

export function MotoristaForm({
  initialValues,
  submitLabel,
  moppCheckboxId,
  transportadoras,
  selectedTransportadoras,
  onSelectedTransportadorasChange,
  onSubmit,
}: Props) {
  return (
    <Formik initialValues={initialValues} validationSchema={motoristaSchema} onSubmit={onSubmit}>
      {({ isSubmitting, setFieldValue, values }) => (
        <Form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField name="nome" label="Nome Completo" required />
            <FormField name="cpf" label="CPF" placeholder="000.000.000-00" mask="cpf" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelectWrapper name="tipo_pessoa" label="Tipo de Pessoa">
              <Select
                value={values.tipo_pessoa}
                onValueChange={(value) => {
                  setFieldValue("tipo_pessoa", value);
                  if (value !== "juridica") setFieldValue("cnpj", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Pessoa Física</SelectItem>
                  <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </FormSelectWrapper>
            {values.tipo_pessoa === "juridica" && (
              <FormField name="cnpj" label="CNPJ" placeholder="00.000.000/0000-00" mask="cnpj" required />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField name="telefone" label="Telefone" placeholder="(00) 00000-0000" mask="telefone" />
            <FormField name="email" label="Email" type="email" />
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
            <FormField name="estado" label="Estado" placeholder="SP" maxLength={2} />
            <FormSelectWrapper name="status" label="Status">
              <Select value={values.status} onValueChange={(value) => setFieldValue("status", value)}>
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

          <TransportadorasSelector
            transportadoras={transportadoras}
            selected={selectedTransportadoras}
            onChange={onSelectedTransportadorasChange}
          />

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
                id={moppCheckboxId}
                checked={values.mopp_vitalicio}
                onCheckedChange={(checked) => setFieldValue("mopp_vitalicio", !!checked)}
              />
              <Label htmlFor={moppCheckboxId} className="text-sm cursor-pointer">MOPP Vitalício</Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : submitLabel}
          </Button>
        </Form>
      )}
    </Formik>
  );
}
