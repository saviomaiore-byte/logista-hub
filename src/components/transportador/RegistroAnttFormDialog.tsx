import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { Formik, Form, Field } from "formik";
import { registroAnttSchema, type RegistroAntt, type Transportador } from "./types";

export type RegistroAnttFormValues = {
  transportador_id: string;
  arquivo_url: string;
  antt_data_emissao: string;
  qtd_cavalos: string;
  qtd_reboques: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RegistroAntt | null;
  transportadores: Transportador[];
  onSubmit: (values: RegistroAnttFormValues) => void;
};

const numToInput = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

export function RegistroAnttFormDialog({ open, onOpenChange, editing, transportadores, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Extrato ANTT" : "Novo Extrato ANTT"}</DialogTitle>
        </DialogHeader>
        <Formik<RegistroAnttFormValues>
          initialValues={{
            transportador_id: editing?.transportador_id || "",
            arquivo_url: editing?.arquivo_url || "",
            antt_data_emissao: editing?.antt_data_emissao || "",
            qtd_cavalos: numToInput(editing?.qtd_cavalos),
            qtd_reboques: numToInput(editing?.qtd_reboques),
          }}
          validationSchema={registroAnttSchema}
          onSubmit={(values) => onSubmit(values)}
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
                {errors.transportador_id && touched.transportador_id && (
                  <p className="mt-1 text-sm text-destructive">{errors.transportador_id}</p>
                )}
              </div>

              <div>
                <Label htmlFor="antt_data_emissao">Data de emissão</Label>
                <Field as={Input} id="antt_data_emissao" name="antt_data_emissao" type="date" className="mt-1" />
                {errors.antt_data_emissao && touched.antt_data_emissao && (
                  <p className="mt-1 text-sm text-destructive">{errors.antt_data_emissao}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="qtd_cavalos">Quantidade de cavalos</Label>
                  <Field as={Input} id="qtd_cavalos" name="qtd_cavalos" type="number" min={1} step={1} placeholder="Ex.: 3" className="mt-1" />
                  {errors.qtd_cavalos && touched.qtd_cavalos && (
                    <p className="mt-1 text-sm text-destructive">{errors.qtd_cavalos}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="qtd_reboques">Quantidade de reboques</Label>
                  <Field as={Input} id="qtd_reboques" name="qtd_reboques" type="number" min={1} step={1} placeholder="Ex.: 2" className="mt-1" />
                  {errors.qtd_reboques && touched.qtd_reboques && (
                    <p className="mt-1 text-sm text-destructive">{errors.qtd_reboques}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anexo do ANTT</Label>
                <FileUpload
                  currentUrl={values.arquivo_url || undefined}
                  onUpload={(url) => setFieldValue("arquivo_url", url)}
                  onRemove={() => setFieldValue("arquivo_url", "")}
                  folder="registros-antt"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  label="Anexar ANTT"
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
  );
}
