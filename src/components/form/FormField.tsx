import { ReactNode, ChangeEvent } from "react";
import { useField } from "formik";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { applyMask, MaskType } from "@/lib/masks";

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  step?: string;
  disabled?: boolean;
  className?: string;
  as?: "input" | "textarea";
  rows?: number;
  mask?: MaskType;
}

export function FormField({
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  maxLength,
  step,
  disabled = false,
  className,
  as = "input",
  rows = 3,
  mask,
}: FormFieldProps) {
  const [field, meta, helpers] = useField(name);
  const hasError = meta.touched && meta.error;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (mask) {
      const masked = applyMask(e.target.value, mask);
      helpers.setValue(masked);
    } else {
      field.onChange(e);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className={cn(hasError && "text-destructive")}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {as === "textarea" ? (
        <Textarea
          id={name}
          {...field}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          rows={rows}
          className={cn(hasError && "border-destructive focus-visible:ring-destructive")}
        />
      ) : (
        <Input
          id={name}
          type={type}
          {...field}
          onChange={mask ? handleChange : field.onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          step={step}
          disabled={disabled}
          className={cn(hasError && "border-destructive focus-visible:ring-destructive")}
        />
      )}
      {hasError && (
        <p className="text-sm text-destructive">{meta.error}</p>
      )}
    </div>
  );
}

interface FormSelectFieldProps {
  name: string;
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormSelectWrapper({
  name,
  label,
  required = false,
  className,
  children,
}: FormSelectFieldProps) {
  const [, meta] = useField(name);
  const hasError = meta.touched && meta.error;

  return (
    <div className={cn("space-y-2", className)}>
      <Label className={cn(hasError && "text-destructive")}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hasError && (
        <p className="text-sm text-destructive">{meta.error}</p>
      )}
    </div>
  );
}
