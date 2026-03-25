export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Mínimo de 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Pelo menos um número");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Pelo menos um caractere especial (!@#$%...)");
  }

  return { isValid: errors.length === 0, errors };
}
