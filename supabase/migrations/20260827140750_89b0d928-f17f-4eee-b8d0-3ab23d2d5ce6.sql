CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NULL OR lower(NEW.email) NOT LIKE '%@maiore.com.br' THEN
    RAISE EXCEPTION 'Apenas emails @maiore.com.br sao permitidos';
  END IF;

  IF NEW.email_confirmed_at IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      INSERT INTO public.profiles (user_id, nome, email)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;