-- ═══════════════════════════════════════════════════════════════
-- Trang /store — Lieferung + Einkauf — 2026-11-18
--
-- Im Supabase SQL Editor ausführen (einmal, komplett).
-- VOR dem Deploy des Codes — sonst schlagen die neuen Abfragen fehl.
-- ═══════════════════════════════════════════════════════════════

-- ── 1) Liefertage, die der Admin auf /store setzt ──
create table if not exists public.liefertermine (
  datum date primary key,
  notiz text default '',
  created_at timestamptz default now()
);

-- ── 2) Einkauf-Katalog (feste Liste, im Code gepflegt) ──
create table if not exists public.einkauf_artikel (
  id text primary key,
  name text not null,
  einheit text default '',
  hinweis text default '',
  wo text default '',
  sort int default 0,
  aktiv boolean default true
);

-- ── 3) Einkauf-Positionen: pro Standort und Liefertag, ohne Lagerwirkung ──
create table if not exists public.einkauf_positionen (
  id text primary key,
  standort_id text not null,
  liefer_datum date not null,
  einkauf_artikel_id text,
  freitext text default '',
  menge text default '',
  status text default 'offen',          -- offen | gekauft
  benutzer text default '',
  created_at timestamptz default now()
);
create index if not exists einkauf_positionen_datum on public.einkauf_positionen (liefer_datum);

-- ── 4) Transfers: Liefertag (null = Umbuchung direkt aus der Lager-App) ──
alter table public.transfers add column if not exists liefer_datum date;

-- ── 5) Transfer-Zeilen: Freitext (kein Artikel, keine Lagerwirkung) + Haken ──
alter table public.transfer_items add column if not exists freitext text default '';
alter table public.transfer_items add column if not exists einheit text default '';
alter table public.transfer_items add column if not exists abgehakt boolean default false;

-- ── Rechte + RLS, gleiches Muster wie schema.sql (policy app_all) ──
grant select, insert, update, delete on public.liefertermine to anon, authenticated;
grant select, insert, update, delete on public.einkauf_artikel to anon, authenticated;
grant select, insert, update, delete on public.einkauf_positionen to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['liefertermine','einkauf_artikel','einkauf_positionen']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists app_all on %I', t);
    execute format('create policy app_all on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ── Realtime: Liefertage und Einkauf live nachladen ──
do $$
declare t text;
begin
  foreach t in array array['liefertermine','einkauf_artikel','einkauf_positionen']
  loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ── Kontrolle ──
select 'liefertermine' as tabelle, count(*) from public.liefertermine
union all select 'einkauf_artikel', count(*) from public.einkauf_artikel
union all select 'einkauf_positionen', count(*) from public.einkauf_positionen;
