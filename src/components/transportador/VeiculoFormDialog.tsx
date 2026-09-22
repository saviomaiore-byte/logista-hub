import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { Formik, Form, Field } from "formik";
import type * as Yup from "yup";
import type { Transportador } from "./types";

type VeiculoEditing = {
  transportador_id: string;
  arquivo_url: string | null;
  antt_data_emissao?: string | null;
  antt_quantidade?: number | null;
} | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: VeiculoEditing;
  title: string;
  transportadores: Transportador[];
  validationSchema: Yup.AnyObjectSchema;
  folder: string;
  uploadLabel: string;
  /** Rótulo do campo de quantidade (ex.: "Quantidade de cavalos"). */
  quantidadeLabel: string;
  onSubmit: (values: {
    transportador_id: string;
    arquivo_url?: string | null;
    antt_data_emissao?: string | null;
    antt_quantidade?: number | string | null;
  }) => void;
};

export function VeiculoFormDialog({
  open,
  onOpenChange,
  editing,
  title,
  transportadores,
  validationSchema,
  folder,
  uploadLabel,
  quantidadeLabel,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={{
            transportador_id: editing?.transportador_id || "",
            arquivo_url: editing?.arquivo_url || "",
            antt_data_emissao: editing?.antt_data_emissao || "",
            antt_quantidade:
              editing?.antt_quantidade === null || editing?.antt_quantidade === undefined
                ? ""
                : String(editing.antt_quantidade),
          }}
          validationSchema={validationSchema}
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
                {errors.transportador_id && touched.transportador_id && <p className="mt-1 text-sm text-destructive">{errors.transportador_id}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="antt_data_emissao">Data de emissão do ANTT</Label>
                  <Field as={Input} id="antt_data_emissao" name="antt_data_emissao" type="date" className="mt-1" />
                  {errors.antt_data_emissao && touched.antt_data_emissao && (
                    <p className="mt-1 text-sm text-destructive">{errors.antt_data_emissao as string}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="antt_quantidade">{quantidadeLabel}</Label>
                  <Field
                    as={Input}
                    id="antt_quantidade"
                    name="antt_quantidade"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Ex.: 3"
                    className="mt-1"
                  />
                  {errors.antt_quantidade && touched.antt_quantidade && (
                    <p className="mt-1 text-sm text-destructive">{errors.antt_quantidade as string}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anexo do ANTT</Label>
                <FileUpload
                  currentUrl={values.arquivo_url || undefined}
                  onUpload={(url) => setFieldValue("arquivo_url", url)}
                  onRemove={() => setFieldValue("arquivo_url", "")}
                  folder={folder}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  label={uploadLabel}
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
