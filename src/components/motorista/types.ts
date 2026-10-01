export interface Transportadora {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
}

export interface Motorista {
  id: string;
  created_by?: string | null;
  nome: string;
  cpf: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  estado_civil: string | null;
  rg: string | null;
  status: string;
  tipo_pessoa?: string | null;
  cnpj?: string | null;
  projeto_start: boolean;

  cnh_numero: string | null;
  cnh_vencimento: string | null;
  mopp_numero: string | null;
  mopp_vencimento: string | null;
  mopp_vitalicio: boolean;
  antt_numero: string | null;
  antt_vencimento: string | null;
  alvara_numero: string | null;
  alvara_vencimento: string | null;
  certificado_numero: string | null;
  certificado_vencimento: string | null;
}

export const initialValues = {
  nome: "",
  cpf: "",
  telefone: "",
  email: "",
  cidade: "",
  estado: "",
  endereco: "",
  data_nascimento: "",
  estado_civil: "",
  rg: "",
  status: "ativo",
  tipo_pessoa: "fisica",
  cnpj: "",
  projeto_start: false,

  cnh_numero: "",
  cnh_vencimento: "",
  mopp_numero: "",
  mopp_vencimento: "",
  mopp_vitalicio: false,
  antt_numero: "",
  antt_vencimento: "",
  alvara_numero: "",
  alvara_vencimento: "",
  certificado_numero: "",
  certificado_vencimento: "",
};

export type MotoristaFormValues = typeof initialValues;

export function motoristaToFormValues(m: Motorista): MotoristaFormValues {
  return {
    nome: m.nome,
    cpf: m.cpf,
    telefone: m.telefone || "",
    email: m.email || "",
    cidade: m.cidade || "",
    estado: m.estado || "",
    endereco: m.endereco || "",
    data_nascimento: m.data_nascimento || "",
    estado_civil: m.estado_civil || "",
    rg: m.rg || "",
    status: m.status || "ativo",
    tipo_pessoa: m.tipo_pessoa || "fisica",
    cnpj: m.cnpj || "",
    projeto_start: m.projeto_start ?? false,

    cnh_numero: m.cnh_numero || "",
    cnh_vencimento: m.cnh_vencimento || "",
    mopp_numero: m.mopp_numero || "",
    mopp_vencimento: m.mopp_vencimento || "",
    mopp_vitalicio: m.mopp_vitalicio || false,
    antt_numero: m.antt_numero || "",
    antt_vencimento: m.antt_vencimento || "",
    alvara_numero: m.alvara_numero || "",
    alvara_vencimento: m.alvara_vencimento || "",
    certificado_numero: m.certificado_numero || "",
    certificado_vencimento: m.certificado_vencimento || "",
  };
}

export function formValuesToRow(values: MotoristaFormValues) {
  return {
    nome: values.nome,
    cpf: values.cpf,
    telefone: values.telefone || null,
    email: values.email || null,
    cidade: values.cidade || null,
    estado: values.estado || null,
    endereco: values.endereco || null,
    data_nascimento: values.data_nascimento || null,
    estado_civil: values.estado_civil || null,
    rg: values.rg || null,
    status: values.status,
    tipo_pessoa: values.tipo_pessoa,
    cnpj: values.tipo_pessoa === "juridica" ? values.cnpj || null : null,
    projeto_start: values.projeto_start,
    cnh_numero: values.cnh_numero || null,
    cnh_vencimento: values.cnh_vencimento || null,
    mopp_numero: values.mopp_numero || null,
    mopp_vencimento: values.mopp_vitalicio ? null : values.mopp_vencimento || null,
    mopp_vitalicio: values.mopp_vitalicio,
    antt_numero: values.antt_numero || null,
    antt_vencimento: values.antt_vencimento || null,
    alvara_numero: values.alvara_numero || null,
    alvara_vencimento: values.alvara_vencimento || null,
    certificado_numero: values.certificado_numero || null,
    certificado_vencimento: values.certificado_vencimento || null,
  };
}
