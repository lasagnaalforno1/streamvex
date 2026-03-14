-- ============================================================
-- StreamVex — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension (already enabled on Supabase by default)
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------
-- Table: clips
-- -------------------------------------------------------
create table if not exists public.clips (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null default 'Untitled',
  status            text not null default 'uploading'
                      check (status in ('uploading', 'processing', 'ready', 'error')),
  input_path        text,         -- e.g. {user_id}/{clip_id}/input.mp4
  output_path       text,         -- e.g. {user_id}/{clip_id}/output.mp4
  file_size         bigint,       -- bytes
  duration          numeric,      -- seconds
  original_filename   text,         -- original upload filename
  mime_type           text,         -- e.g. video/mp4
  error_message       text,         -- populated when status = 'error'
  trim_start_seconds  float,        -- editor trim: start time in seconds
  trim_end_seconds    float,        -- editor trim: end time in seconds
  edit_config         jsonb,        -- full editor config (layout, crops, trim)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- -------------------------------------------------------
-- Migration: run these once if the table already existed
-- before these columns were added (paste into SQL Editor)
-- -------------------------------------------------------
alter table public.clips add column if not exists original_filename    text;
alter table public.clips add column if not exists mime_type            text;
alter table public.clips add column if not exists error_message        text;
alter table public.clips add column if not exists trim_start_seconds   float;
alter table public.clips add column if not exists trim_end_seconds     float;
alter table public.clips add column if not exists edit_config          jsonb;

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_clips_updated
  before update on public.clips
  for each row
  execute procedure public.handle_updated_at();

-- -------------------------------------------------------
-- Row Level Security (RLS)
-- -------------------------------------------------------
alter table public.clips enable row level security;

-- Users can only see their own clips
create policy "Users can view own clips"
  on public.clips for select
  using (auth.uid() = user_id);

-- Users can insert their own clips
create policy "Users can insert own clips"
  on public.clips for insert
  with check (auth.uid() = user_id);

-- Users can update their own clips
create policy "Users can update own clips"
  on public.clips for update
  using (auth.uid() = user_id);

-- Users can delete their own clips
create policy "Users can delete own clips"
  on public.clips for delete
  using (auth.uid() = user_id);

-- -------------------------------------------------------
-- Storage bucket: clips
-- -------------------------------------------------------
-- Run these in Supabase Dashboard > Storage, or via the API:
--
-- 1. Create a private bucket named "clips"
-- 2. Enable RLS on the bucket
--
-- Storage RLS Policies (paste into SQL editor):

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clips',
  'clips',
  false,
  52428800,                                                          -- 50 MB in bytes
  array['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Allow users to upload to their own folder
create policy "Users can upload own clips"
  on storage.objects for insert
  with check (
    bucket_id = 'clips'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Allow users to read their own clips
create policy "Users can read own clips"
  on storage.objects for select
  using (
    bucket_id = 'clips'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Allow users to delete their own clips
create policy "Users can delete own clips"
  on storage.objects for delete
  using (
    bucket_id = 'clips'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
