-- Назначение роли admin пользователю adminskiy@gmail.com
INSERT INTO public.user_roles (id, user_id, role)
SELECT gen_random_uuid(), p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.email = 'adminskiy@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;