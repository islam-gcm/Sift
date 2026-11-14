-- Run this once in the Supabase SQL editor. The app uses the user's JWT for all reads and writes.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text,
  vendor text not null default '',
  invoice_number text not null default '',
  invoice_date date,
  amount numeric(14, 2) not null default 0,
  currency text not null default 'USD',
  type text not null default '',
  department text not null default '',
  entity text not null default '',
  category text not null default '',
  status text not null default 'needs_review' check (status in ('needs_review', 'approved')),
  confidence numeric(4, 3) not null default 0,
  source text not null default 'manual',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_created_idx on public.invoices (user_id, created_at desc);
alter table public.invoices enable row level security;

create policy "Users can read their invoices" on public.invoices for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their invoices" on public.invoices for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their invoices" on public.invoices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their invoices" on public.invoices for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  taxonomy jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "Users can read their settings" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their settings" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their settings" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Users can upload their invoice files" on storage.objects for insert to authenticated
with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can read their invoice files" on storage.objects for select to authenticated
using (bucket_id = 'invoices' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can delete their invoice files" on storage.objects for delete to authenticated
using (bucket_id = 'invoices' and (storage.foldername(name))[1] = (select auth.uid())::text);
