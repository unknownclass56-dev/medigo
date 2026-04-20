ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'));

  RETURN NEW;
END; $$;
