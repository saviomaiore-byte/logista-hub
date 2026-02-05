import { ReactNode } from "react";
import { useField } from "formik";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
}: FormFieldProps) {
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;

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
