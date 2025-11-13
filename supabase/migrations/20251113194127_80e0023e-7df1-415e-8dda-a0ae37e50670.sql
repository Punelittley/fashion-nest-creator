-- Create favorite_products table
CREATE TABLE IF NOT EXISTS public.favorite_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.favorite_products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorites" 
ON public.favorite_products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add products to favorites" 
ON public.favorite_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove products from favorites" 
ON public.favorite_products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_favorite_products_user_id ON public.favorite_products(user_id);
CREATE INDEX idx_favorite_products_product_id ON public.favorite_products(product_id);