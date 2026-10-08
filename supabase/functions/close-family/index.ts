import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createCloseHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
Deno.serve(createCloseHandler(admin,token=>createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{...options,global:{headers:{Authorization:'Bearer '+token}}})));
