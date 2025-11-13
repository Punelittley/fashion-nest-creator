-- Create favorite_orders table
CREATE TABLE IF NOT EXISTS public.favorite_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, order_id)
);

-- Enable RLS
ALTER TABLE public.favorite_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorite orders" 
ON public.favorite_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add orders to favorites" 
ON public.favorite_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove orders from favorites" 
ON public.favorite_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_favorite_orders_user_id ON public.favorite_orders(user_id);
CREATE INDEX idx_favorite_orders_order_id ON public.favorite_orders(order_id);