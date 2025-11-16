import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create admin client with service role for RLS-bypassing actions, but enforce our own admin check first
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const adminClient = createClient(supabaseUrl, serviceRoleKey);

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get user from token
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('auth.getUser error', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userId = userData.user.id;

    // Check admin role
    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .limit(1);

    if (rolesError) {
      console.error('rolesError', rolesError);
      return new Response(JSON.stringify({ error: 'Failed to verify admin role' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as 'create' | 'update';
    const payload = body?.payload ?? {};

    if (action === 'create') {
      // Basic validation
      if (!payload.name || typeof payload.price !== 'number' || typeof payload.stock !== 'number') {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const insertData = {
        name: payload.name as string,
        description: (payload.description ?? null) as string | null,
        price: payload.price as number,
        stock: payload.stock as number,
        category_id: (payload.category_id ?? null) as string | null,
        image_url: (payload.image_url ?? null) as string | null,
        is_active: payload.is_active === false ? false : true,
      };

      const { data, error } = await adminClient.from('products').insert([insertData]).select('*').single();
      if (error) {
        console.error('insert error', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (action === 'update') {
      const id = body?.id as string | undefined;
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id for update' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const updateData: Record<string, unknown> = {
        name: payload.name,
        description: payload.description ?? null,
        price: typeof payload.price === 'number' ? payload.price : undefined,
        stock: typeof payload.stock === 'number' ? payload.stock : undefined,
        category_id: payload.category_id ?? null,
        image_url: payload.image_url ?? null,
        is_active: typeof payload.is_active === 'boolean' ? payload.is_active : undefined,
      };

      const { data, error } = await adminClient
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('update error', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    console.error('Unhandled error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

Deno.serve(handler);
