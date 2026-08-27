import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Formik, Form, Field } from "formik";
import { masks } from "@/lib/masks";
import { REGIME_TRIBUTARIO_OPTIONS, transportadorSchema, type Transportador } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Transportador | null;
  onSubmit: (values: any) => void;
};

export function TransportadorFormDialog({ open, onOpenChange, editing, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Transportador" : "Novo Transportador"}</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={{
            razao_social: editing?.razao_social || "",
            cpf_cnpj: editing?.cpf_cnpj || "",
            inscricao_estadual: editing?.inscricao_estadual || "",
            contato: editing?.contato || "",
            endereco: editing?.endereco || "",
            data_nascimento: editing?.data_nascimento || "",
            email: editing?.email || "",
            estado_civil: editing?.estado_civil || "",
            rg: editing?.rg || "",
            status: editing?.status || "ativo",
            situacao_operacional: editing?.situacao_operacional || "em_praca_apto",
            antt_numero: (editing as any)?.antt_numero || "",
            alvara_numero: (editing as any)?.alvara_numero || "",
            certificado_numero: (editing as any)?.certificado_numero || "",
          }}
          validationSchema={transportadorSchema}
          onSubmit={(values) => onSubmit(values)}
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
              <div>
                <Label>Situação Operacional</Label>
                <Select value={values.situacao_operacional || ""} onValueChange={(v) => setFieldValue("situacao_operacional", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_praca_apto">Em Praça Apto</SelectItem>
                    <SelectItem value="em_viagem_apto">Em Viagem Apto</SelectItem>
                    <SelectItem value="inapto">Inapto</SelectItem>
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
  );
}
