-- ═══ Lagerverwaltung — Datenbank neu aufbauen (Projekt tpabnjsplwfvlwrecboz) ═══
-- Nachgebaut aus js/supabase.js (sbLoadAll + sbSave*), activity_log.js, push.js, realtime.js.
-- Im Supabase SQL Editor komplett ausführen. Mehrfach ausführbar (if not exists / on conflict).
-- Danach IMMER migrations/20261116_pin_schutz.sql ausführen (sperrt users.pin, Login per RPC).
-- Ohne diesen Schritt kann jeder mit dem Publishable Key alle PINs lesen — und die App erwartet die RPCs.
-- Keine Fremdschlüssel: die App räumt selbst auf, alte Daten enthalten Verweise auf gelöschte Artikel.

-- ── Stammdaten ──
create table if not exists standorte (
  id text primary key, name text not null, adresse text default '',
  aktiv boolean default true, created_at timestamptz default now());

create table if not exists kategorien (
  id text primary key, name text not null, name_vi text default '',
  farbe text default '#6B7280', created_at timestamptz default now());

create table if not exists users (
  id text primary key, name text not null, email text default '',
  role text not null default 'staff', pin text not null unique,
  standorte text[] default '{all}', bereiche text[] default '{all}', perms text[] default '{}',
  deleted_at timestamptz, created_at timestamptz default now());

create table if not exists lieferanten (
  id text primary key, name text not null, kontakt text default '', telefon text default '',
  email text default '', adresse text default '', notiz text default '',
  liefertage text[] default '{}', rhythmus text default 'weekly', vorlaufzeit numeric default 0,
  deleted_at timestamptz, created_at timestamptz default now());

create table if not exists lagerplaetze (
  id text primary key, name text not null, name_vi text default '', standort_id text,
  zone text default '', temperatur text default 'normal', kapazitaet text default '',
  beschreibung text default '', created_at timestamptz default now());

-- ── Artikel ──
create table if not exists artikel (
  id text primary key, name text not null, name_vi text default '', sku text default '',
  barcodes text[] default '{}', bilder text[] default '{}',
  beschreibung text default '', beschreibung_vi text default '',
  einheit text default 'Stk.', pack_unit text default '', pack_size numeric default 0,
  status text default 'active', created_by text, rejected_reason text,
  deleted_at timestamptz, created_at timestamptz default now());

create table if not exists artikel_bestand (
  artikel_id text not null, standort_id text not null,
  ist_bestand numeric default 0, soll_bestand numeric default 0, mindestmenge numeric default 0,
  lagerort text default '', lagerort_split jsonb default '[]',
  primary key (artikel_id, standort_id));

create table if not exists artikel_kategorien (
  artikel_id text not null, kategorie_id text not null,
  primary key (artikel_id, kategorie_id));

create table if not exists artikel_lieferanten (
  id bigint generated always as identity primary key,
  artikel_id text not null, lieferant_id text not null,
  preis numeric default 0, art_nr text default '');
create index if not exists artikel_lieferanten_art on artikel_lieferanten (artikel_id);

create table if not exists preis_historie (
  id text primary key, artikel_id text, lieferant_id text,
  alter_preis numeric default 0, neuer_preis numeric default 0,
  datum timestamptz, benutzer text);

-- ── Buchungen / Bestellungen / Transfers ──
create table if not exists bewegungen (
  id text primary key, typ text not null, artikel_id text, standort_id text,
  ziel_standort_id text, menge numeric default 0, datum timestamptz default now(),
  benutzer text, referenz text default '', notiz text default '', lieferant_id text,
  lagerort text default '', created_at timestamptz default now());
create index if not exists bewegungen_artikel on bewegungen (artikel_id);

create table if not exists bestellungen (
  id text primary key, artikel_id text, lieferant_id text, standort_id text,
  menge numeric default 0, status text default 'bestellt', datum date, erstellt_von text,
  empfangen numeric, fehlmenge numeric, notiz text default '', created_at timestamptz default now());

create table if not exists bestellliste (
  id text primary key, artikel_id text, standort_id text,
  menge numeric default 1, lieferant_id text, created_at timestamptz default now());

create table if not exists bestell_vorlagen (
  id text primary key, name text not null, lieferant_id text, created_at timestamptz default now());

create table if not exists vorlage_items (
  id text primary key, vorlage_id text not null, artikel_id text, menge numeric default 1);
create index if not exists vorlage_items_v on vorlage_items (vorlage_id);

create table if not exists transfers (
  id text primary key, von_id text, nach_id text, datum timestamptz default now(),
  benutzer text, status text default 'unterwegs', empfangen_details jsonb,
  empfangen_von text, empfangen_am timestamptz, created_at timestamptz default now());

create table if not exists transfer_items (
  id text primary key, transfer_id text not null, artikel_id text,
  menge numeric default 0, empfangen numeric, diff numeric);
create index if not exists transfer_items_t on transfer_items (transfer_id);
-- ── Restaurant-Bereiche / Auffüllung ──
create table if not exists bereiche (
  id text primary key, name text not null, name_vi text default '', standort_id text,
  farbe text default '#3B82F6', icon text default '🍽', created_at timestamptz default now());

create table if not exists bereich_artikel (
  bereich_id text not null, artikel_id text not null, soll numeric default 1,
  quelle_id text, quelle_ort text default '',
  primary key (bereich_id, artikel_id));

create table if not exists anforderungen (
  id text primary key, bereich_id text, standort_id text, erstellt_von text,
  datum timestamptz default now(), status text default 'offen',
  erledigt_von text, erledigt_am timestamptz, created_at timestamptz default now());

create table if not exists anforderung_items (
  id text primary key, anforderung_id text not null, artikel_id text, menge numeric default 0,
  quelle_id text, quelle_ort text default '');
create index if not exists anforderung_items_a on anforderung_items (anforderung_id);

create table if not exists auffuellungen (
  id text primary key, bereich_id text, artikel_id text, menge numeric default 0,
  datum timestamptz default now(), benutzer text, anforderung_id text,
  created_at timestamptz default now());

-- ── Inventur ──
create table if not exists inventur_protokolle (
  id text primary key, standort_id text, datum timestamptz default now(), benutzer text);

create table if not exists inventur_items (
  id text primary key, protokoll_id text not null, artikel_id text,
  gezaehlt numeric default 0, system_bestand numeric default 0, diff numeric default 0,
  lagerort text default '');
create index if not exists inventur_items_p on inventur_items (protokoll_id);

-- ── Einstellungen / Log / Push ──
create table if not exists einstellungen (
  id integer primary key, firmenname text default '', data jsonb default '{}');
insert into einstellungen (id, firmenname, data) values (1, '', '{}') on conflict (id) do nothing;

create table if not exists activity_log (
  id bigint generated always as identity primary key,
  user_id text, user_name text, action text, description text,
  details jsonb default '{}', standort_id text default '', created_at timestamptz default now());
create index if not exists activity_log_created on activity_log (created_at desc);

create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  user_id text, endpoint text not null unique, keys text,
  user_role text, user_standorte text[] default '{all}', updated_at timestamptz default now());

-- ── Zugriff: App nutzt nur den Publishable Key (Rolle anon), kein Supabase-Login ──
-- Wie im alten Projekt: anon darf alles. RLS an + offene Policy (Supabase warnt sonst "RLS disabled").
-- ACHTUNG: Diese Grants öffnen auch users.pin und login_attempts wieder.
-- Nach jedem Ausführen dieser Datei unbedingt migrations/20261116_pin_schutz.sql ausführen!
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'standorte','kategorien','users','lieferanten','lagerplaetze','artikel','artikel_bestand',
    'artikel_kategorien','artikel_lieferanten','preis_historie','bewegungen','bestellungen',
    'bestellliste','bestell_vorlagen','vorlage_items','transfers','transfer_items','bereiche',
    'bereich_artikel','anforderungen','anforderung_items','auffuellungen','inventur_protokolle',
    'inventur_items','einstellungen','activity_log','push_subscriptions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists app_all on %I', t);
    execute format('create policy app_all on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ── Realtime (Liste aus js/realtime.js) ──
do $$
declare t text;
begin
  foreach t in array array[
    'artikel','artikel_bestand','bereiche','bereich_artikel','bewegungen','bestellungen',
    'bestellliste','transfers','transfer_items','standorte','anforderungen','anforderung_items',
    'auffuellungen','kategorien','lieferanten','users','einstellungen','lagerplaetze',
    'inventur_protokolle','inventur_items']
  loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- ── Storage: Produktfotos (öffentlich lesbar, App lädt mit upsert hoch) ──
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists product_images_select on storage.objects;
drop policy if exists product_images_insert on storage.objects;
drop policy if exists product_images_update on storage.objects;
create policy product_images_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy product_images_insert on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'product-images');
create policy product_images_update on storage.objects for update to anon, authenticated
  using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

-- ── Kontrolle: sollte 27 Tabellen zeigen ──
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name;
