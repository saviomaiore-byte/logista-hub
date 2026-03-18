import * as Yup from 'yup';

// Funções de validação personalizadas
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
const telefoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$|^\d{10,11}$/;

// Validações comuns
export const requiredString = (fieldName: string) =>
  Yup.string()
    .trim()
    .required(`${fieldName} é obrigatório`)
    .max(255, `${fieldName} deve ter no máximo 255 caracteres`);

export const optionalString = (maxLength = 255) =>
  Yup.string()
    .trim()
    .max(maxLength, `Deve ter no máximo ${maxLength} caracteres`)
    .nullable();

export const emailValidation = Yup.string()
  .trim()
  .email('Email inválido')
  .max(255, 'Email deve ter no máximo 255 caracteres')
  .nullable();

export const cpfValidation = Yup.string()
  .trim()
  .required('CPF é obrigatório')
  .matches(cpfRegex, 'CPF inválido (use 000.000.000-00)');

export const cnpjValidation = Yup.string()
  .trim()
  .matches(cnpjRegex, 'CNPJ inválido (use 00.000.000/0000-00)')
  .nullable();

export const telefoneValidation = Yup.string()
  .trim()
  .matches(telefoneRegex, 'Telefone inválido (use (00) 00000-0000)')
  .nullable();

export const valorValidation = Yup.number()
  .positive('Valor deve ser positivo')
  .nullable();

export const dateValidation = Yup.string()
  .required('Data é obrigatória');

export const optionalDateValidation = Yup.string().nullable();

// Schema para Motoristas
export const motoristaSchema = Yup.object().shape({
  nome: requiredString('Nome'),
  cpf: cpfValidation,
  telefone: telefoneValidation,
  email: emailValidation,
  cidade: optionalString(100),
  estado: Yup.string().trim().max(2, 'Use a sigla do estado (ex: SP)').nullable(),
  endereco: optionalString(500),
  data_nascimento: optionalDateValidation,
  estado_civil: optionalString(50),
  rg: optionalString(30),
  status: Yup.string().oneOf(['ativo', 'inativo', 'pendente']).required(),
  cnh_numero: optionalString(20),
  cnh_vencimento: optionalDateValidation,
  mopp_vencimento: optionalDateValidation,
  mopp_vitalicio: Yup.boolean(),
});

// Schema para Seguros
export const seguroSchema = Yup.object().shape({
  motorista_id: optionalString(),
  tipo: requiredString('Tipo de seguro'),
  seguradora: requiredString('Seguradora'),
  numero_apolice: optionalString(50),
  valor_premio: valorValidation,
  vigencia_inicio: optionalDateValidation,
  vigencia_fim: optionalDateValidation,
  status: Yup.string().oneOf(['ativo', 'vencido', 'cancelado']).required(),
  observacoes: optionalString(1000),
  arquivo_url: optionalString(500),
});

// Schema para Contratos
export const contratoSchema = Yup.object().shape({
  tipo: requiredString('Tipo'),
  modelo: requiredString('Modelo'),
  empresa: requiredString('Empresa'),
  cnpj: cnpjValidation,
  observacoes: optionalString(1000),
  arquivo_url: optionalString(500),
});

// Schema para Boletos
export const boletoSchema = Yup.object().shape({
  empresa: requiredString('Empresa'),
  cnpj: cnpjValidation,
  valor: Yup.number()
    .required('Valor é obrigatório')
    .positive('Valor deve ser positivo'),
  vencimento: dateValidation,
  referencia: optionalString(50),
});

// Schema para Certificados
export const certificadoSchema = Yup.object().shape({
  empresa: requiredString('Transportadora'),
  tipo: requiredString('Tipo de certificado'),
  vencimento: dateValidation,
  data_renovacao_agendada: optionalDateValidation,
  observacoes: optionalString(1000),
});

// Schema para Documentos da Empresa
export const documentoEmpresaSchema = Yup.object().shape({
  empresa: requiredString('Empresa'),
  tipo: requiredString('Tipo'),
  descricao: optionalString(500),
  vencimento: optionalDateValidation,
});

// Schema para Pronampe
export const pronampeSchema = Yup.object().shape({
  empresa: requiredString('Empresa'),
  cnpj: cnpjValidation,
  valor: valorValidation,
  observacoes: optionalString(1000),
});
