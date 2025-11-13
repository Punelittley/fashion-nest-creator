-- Add missing foreign key constraints (только те, которых нет)

-- user_roles table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- products table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- cart_items table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_id_fkey'
  ) THEN
    ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- orders table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_fkey'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- order_items table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_order_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- favorite_products table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorite_products_user_id_fkey'
  ) THEN
    ALTER TABLE public.favorite_products
    ADD CONSTRAINT favorite_products_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorite_products_product_id_fkey'
  ) THEN
    ALTER TABLE public.favorite_products
    ADD CONSTRAINT favorite_products_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- favorite_orders table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorite_orders_user_id_fkey'
  ) THEN
    ALTER TABLE public.favorite_orders
    ADD CONSTRAINT favorite_orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorite_orders_order_id_fkey'
  ) THEN
    ALTER TABLE public.favorite_orders
    ADD CONSTRAINT favorite_orders_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- support_chats table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_chats_user_id_fkey'
  ) THEN
    ALTER TABLE public.support_chats
    ADD CONSTRAINT support_chats_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- support_messages table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'support_messages_chat_id_fkey'
  ) THEN
    ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_chat_id_fkey 
    FOREIGN KEY (chat_id) REFERENCES public.support_chats(id) ON DELETE CASCADE;
  END IF;
END $$;