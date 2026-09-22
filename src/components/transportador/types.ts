import * as Yup from "yup";

export type Transportador = {
  id: string;
  created_by?: string | null;
  razao_social: string;
  cpf_cnpj: string;
  inscricao_estadual: string | null;
  contato: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  email: string | null;
  estado_civil: string | null;
  rg: string | null;
  status: string;
  situacao_operacional: string | null;
  antt_numero: string | null;
  alvara_numero: string | null;
  certificado_numero: string | null;
  created_at: string;
  motorista_id: string | null;
};

export type Cavalo = {
  id: string;
  created_by?: string | null;
  transportador_id: string;
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  marca_modelo: string | null;
  ano: string | null;
  status: string;
  arquivo_url: string | null;
  /** Data de emissão do ANTT anexado (sem vencimento). */
  antt_data_emissao: string | null;
  /** Quantidade de cavalos cobertos pelo ANTT anexado. */
  antt_quantidade: number | null;
  transportadores?: { razao_social: string } | null;
};

export type Reboque = {
  id: string;
  created_by?: string | null;
  transportador_id: string;
  placa: string | null;
  renavam: string | null;
  tipo: string | null;
  ano: string | null;
  status: string;
  arquivo_url: string | null;
  /** Data de emissão do ANTT anexado (sem vencimento). */
  antt_data_emissao: string | null;
  /** Quantidade de reboques cobertos pelo ANTT anexado. */
  antt_quantidade: number | null;
  transportadores?: { razao_social: string } | null;
};

export const REGIME_TRIBUTARIO_OPTIONS = [
  "Simples nacional",
  "Lucro presumido",
  "Lucro real",
  "MEI caminhoneiro",
] as const;

export const transportadorSchema = Yup.object().shape({
  razao_social: Yup.string().trim().required("Razão Social é obrigatória"),
  cpf_cnpj: Yup.string().trim().required("CPF/CNPJ é obrigatório"),
  inscricao_estadual: Yup.string().trim().oneOf([...REGIME_TRIBUTARIO_OPTIONS]).nullable(),
  contato: Yup.string().trim().nullable(),
  endereco: Yup.string().trim().nullable(),
  data_nascimento: Yup.string().nullable(),
  email: Yup.string().trim().email("Email inválido").nullable(),
  estado_civil: Yup.string().trim().nullable(),
  rg: Yup.string().trim().nullable(),
  status: Yup.string().oneOf(["ativo", "inativo"]).required(),
});

const anttQuantidadeSchema = Yup.number()
  .transform((value, original) => (original === "" || original === null ? null : value))
  .typeError("Informe um número")
  .integer("Informe um número inteiro")
  .min(1, "A quantidade deve ser maior que zero")
  .nullable();

export const cavaloSchema = Yup.object().shape({
  transportador_id: Yup.string().required("Transportador é obrigatório"),
  arquivo_url: Yup.string().trim().nullable(),
  antt_data_emissao: Yup.string().nullable(),
  antt_quantidade: anttQuantidadeSchema,
});

export const reboqueSchema = Yup.object().shape({
  transportador_id: Yup.string().required("Transportador é obrigatório"),
  arquivo_url: Yup.string().trim().nullable(),
  antt_data_emissao: Yup.string().nullable(),
  antt_quantidade: anttQuantidadeSchema,
});
