-- Disposable migration harness: only dependencies used by managed_children.
create role anon;
create role authenticated;
create role service_role;
create schema auth;
create schema private;
create schema extensions;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function extensions.gen_random_uuid() returns uuid language sql as $$ select gen_random_uuid() $$;
-- pgcrypto is simulated only for invitation generation, outside the migration.
create function extensions.gen_random_bytes(n integer) returns bytea language sql as $$ select decode(substr(replace(gen_random_uuid()::text,'-',''),1,n*2),'hex') $$;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade,name text);
create table public.families (id uuid primary key default gen_random_uuid(),name text,invite_code text unique,owner_id uuid references auth.users(id) on delete restrict,plan text default 'free');
create table public.family_members (family_id uuid references public.families(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,role text not null check(role in ('admin','adult','child')),joined_at timestamptz default now(),primary key(family_id,user_id));
create table public.family_snapshots (family_id uuid primary key references public.families(id) on delete cascade,payload jsonb default '{}');
