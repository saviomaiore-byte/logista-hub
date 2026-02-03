-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tabela de motoristas
CREATE TABLE public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  estado TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente')),
  cnh_numero TEXT,
  cnh_vencimento DATE,
  mopp_numero TEXT,
  mopp_vencimento DATE,
  antt_numero TEXT,
  antt_vencimento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view motoristas" ON public.motoristas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert motoristas" ON public.motoristas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update motoristas" ON public.motoristas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete motoristas" ON public.motoristas FOR DELETE TO authenticated USING (true);

-- Tabela de contratos
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'distrato', 'adesao')),
  empresa TEXT NOT NULL,
  cnpj TEXT,
  data_envio DATE DEFAULT CURRENT_DATE,
  data_assinatura DATE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'assinado', 'recusado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contratos" ON public.contratos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contratos" ON public.contratos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contratos" ON public.contratos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contratos" ON public.contratos FOR DELETE TO authenticated USING (true);

-- Tabela de boletos
CREATE TABLE public.boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  cnpj TEXT,
  valor DECIMAL(12,2) NOT NULL,
  vencimento DATE NOT NULL,
  referencia TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'pago', 'vencido')),
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view boletos" ON public.boletos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert boletos" ON public.boletos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update boletos" ON public.boletos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete boletos" ON public.boletos FOR DELETE TO authenticated USING (true);

-- Tabela de documentos de empresa
CREATE TABLE public.documentos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato_social', 'cnd_federal', 'cnd_estadual', 'cnd_municipal', 'fgts', 'outros')),
  descricao TEXT,
  vencimento DATE,
  status TEXT DEFAULT 'valido' CHECK (status IN ('valido', 'proximo_vencer', 'vencido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.documentos_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documentos_empresa" ON public.documentos_empresa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert documentos_empresa" ON public.documentos_empresa FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update documentos_empresa" ON public.documentos_empresa FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete documentos_empresa" ON public.documentos_empresa FOR DELETE TO authenticated USING (true);

-- Tabela de compartilhamento Pronampe
CREATE TABLE public.pronampe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  cnpj TEXT,
  valor DECIMAL(12,2),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'compartilhado', 'aprovado', 'recusado')),
  data_compartilhamento DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pronampe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pronampe" ON public.pronampe FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pronampe" ON public.pronampe FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pronampe" ON public.pronampe FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pronampe" ON public.pronampe FOR DELETE TO authenticated USING (true);

-- Tabela de certificados
CREATE TABLE public.certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  tipo TEXT NOT NULL,
  vencimento DATE NOT NULL,
  data_renovacao_agendada DATE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'proximo_vencer', 'vencido', 'renovacao_agendada')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view certificados" ON public.certificados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert certificados" ON public.certificados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update certificados" ON public.certificados FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete certificados" ON public.certificados FOR DELETE TO authenticated USING (true);

-- Tabela de PINS CONFINS
CREATE TABLE public.pins_confins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  competencia TEXT NOT NULL,
  valor_pis DECIMAL(12,2) DEFAULT 0,
  valor_cofins DECIMAL(12,2) DEFAULT 0,
  data_lancamento DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'lancado' CHECK (status IN ('lancado', 'conferido', 'enviado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.pins_confins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pins_confins" ON public.pins_confins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pins_confins" ON public.pins_confins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pins_confins" ON public.pins_confins FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pins_confins" ON public.pins_confins FOR DELETE TO authenticated USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_motoristas_updated_at BEFORE UPDATE ON public.motoristas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boletos_updated_at BEFORE UPDATE ON public.boletos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documentos_empresa_updated_at BEFORE UPDATE ON public.documentos_empresa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pronampe_updated_at BEFORE UPDATE ON public.pronampe FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_certificados_updated_at BEFORE UPDATE ON public.certificados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pins_confins_updated_at BEFORE UPDATE ON public.pins_confins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();