import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createLoginHandler} from './handler.mjs';
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
// A separate non-privileged Auth client per request; no sessions shared across users.
Deno.serve(req=>createLoginHandler(admin,createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,options))(req));
