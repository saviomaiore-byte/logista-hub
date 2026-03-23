
-- Drop existing public-role policies on seguros
DROP POLICY IF EXISTS "Authenticated users can delete seguros" ON public.seguros;
DROP POLICY IF EXISTS "Authenticated users can insert seguros" ON public.seguros;
DROP POLICY IF EXISTS "Authenticated users can update seguros" ON public.seguros;
DROP POLICY IF EXISTS "Authenticated users can view seguros" ON public.seguros;

-- Recreate with authenticated role
CREATE POLICY "Authenticated users can view seguros" ON public.seguros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert seguros" ON public.seguros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update seguros" ON public.seguros FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete seguros" ON public.seguros FOR DELETE TO authenticated USING (true);
