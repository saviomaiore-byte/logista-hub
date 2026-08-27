import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { Formik, Form } from "formik";
import type * as Yup from "yup";
import type { Transportador } from "./types";

type VeiculoEditing = { transportador_id: string; arquivo_url: string | null } | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: VeiculoEditing;
  title: string;
  transportadores: Transportador[];
  validationSchema: Yup.AnyObjectSchema;
  folder: string;
  uploadLabel: string;
  onSubmit: (values: { transportador_id: string; arquivo_url?: string | null }) => void;
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
              <div className="space-y-2">
                <Label>Anexo do documento</Label>
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
