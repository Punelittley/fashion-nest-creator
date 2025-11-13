-- Add first_name, last_name, middle_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS middle_name text;

-- Update the handle_new_user function to save the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    middle_name,
    birth_date,
    full_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'middle_name',
    (NEW.raw_user_meta_data->>'birth_date')::date,
    CONCAT_WS(' ', 
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'first_name', 
      NEW.raw_user_meta_data->>'middle_name'
    )
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;