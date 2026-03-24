

# Plano P1 — Restrição de DELETE a Admins + Tabela de Auditoria

## O que será feito

### 1. Restrição de DELETE a administradores
As políticas de DELETE em todas as tabelas de negócio serão alteradas para permitir exclusão apenas por usuários com role `admin`, usando a função `has_role()` já existente.

**Tabelas afetadas (12):**
motoristas, transportadores, contratos, seguros, certificados, documentos_empresa, boletos, pronampe, pins_confins, cavalos, reboques, motorista_arquivos, transportador_arquivos, transportador_motoristas, conferencia_seguros, conferencia_seguros_itens, conferencia_seguros_extraidos

### 2. Tabela de auditoria (`audit_log`)
Criação de uma tabela para registrar todas as operações de INSERT, UPDATE e DELETE nas tabelas de negócio, com:
- `id`, `table_name`, `record_id`, `action` (INSERT/UPDATE/DELETE)
- `old_data` (JSONB — dados antes da alteração)
- `new_data` (JSONB — dados após a alteração)
- `user_id` (quem fez a alteração, via `auth.uid()`)
- `created_at`

Um trigger genérico `audit_trigger_func()` será criado como SECURITY DEFINER e anexado a todas as tabelas de negócio.

## Detalhes Técnicos

### Migration SQL

```sql
-- 1. DROP + RECREATE DELETE policies (admin-only)
-- Para cada tabela:
DROP POLICY IF EXISTS "Authenticated users can delete <tabela>" ON public.<tabela>;
CREATE POLICY "Only admins can delete <tabela>" ON public.<tabela>
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Somente admins podem ver os logs
CREATE POLICY "Admins can view audit_log" ON public.audit_log
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Qualquer autenticado pode inserir (via trigger)
CREATE POLICY "System can insert audit_log" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

-- 4. Attach trigger to all business tables
-- CREATE TRIGGER audit_<tabela> AFTER INSERT OR UPDATE OR DELETE
-- ON public.<tabela> FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### Código Front-end
Nenhuma alteração de código necessária — as restrições são aplicadas no banco. Usuários não-admin que tentarem deletar receberão erro RLS, que já é tratado com `toast.error`.

