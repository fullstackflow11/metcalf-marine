-- ============================================================
-- Metcalf Marine Exhaust — quote capture table
-- Run this once in Supabase → SQL Editor (your MMX project).
-- Same conventions as the APB build: text enum status, timestamps.
-- ============================================================

create table if not exists mmx_quotes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- what the visitor submitted
  name        text not null,
  email       text not null,
  vessel      text,
  engines     text,
  need        text,          -- dropdown value: fabrication / repower / riser / repair / insulation / parts
  details     text,

  -- lightweight source + pipeline fields (ready for the future dashboard)
  source_page text default 'index',      -- 'index' or 'soot-control'
  status      text not null default 'new',  -- new / contacted / quoted / won / lost
  notes       text                        -- internal notes, filled later by team/dashboard
);

-- fast lookups for a future dashboard
create index if not exists mmx_quotes_created_idx on mmx_quotes (created_at desc);
create index if not exists mmx_quotes_status_idx  on mmx_quotes (status);

-- Row Level Security: lock the table down. The Edge Function uses the
-- service_role key (bypasses RLS), so no public policy is needed for inserts.
-- This prevents anyone with the anon key from reading leads directly.
alter table mmx_quotes enable row level security;

-- (No public policies added on purpose — only the Edge Function's
--  service_role may write/read. Add a read policy later when the
--  PIN-gated dashboard needs it, scoped to authenticated staff.)
