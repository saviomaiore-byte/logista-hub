import { FormikHelpers } from "formik";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MotoristaForm } from "./MotoristaForm";
import type { MotoristaFormValues, Transportadora } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  moppCheckboxId: string;
  contentClassName?: string;
  initialValues: MotoristaFormValues;
  transportadoras: Transportadora[];
  selectedTransportadoras: string[];
  onSelectedTransportadorasChange: (ids: string[]) => void;
  onSubmit: (values: MotoristaFormValues, helpers: FormikHelpers<MotoristaFormValues>) => void | Promise<void>;
};

export function MotoristaFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  moppCheckboxId,
  contentClassName = "max-w-2xl",
  initialValues,
  transportadoras,
  selectedTransportadoras,
  onSelectedTransportadorasChange,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && (
          <MotoristaForm
            initialValues={initialValues}
            submitLabel={submitLabel}
            moppCheckboxId={moppCheckboxId}
            transportadoras={transportadoras}
            selectedTransportadoras={selectedTransportadoras}
            onSelectedTransportadorasChange={onSelectedTransportadorasChange}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
