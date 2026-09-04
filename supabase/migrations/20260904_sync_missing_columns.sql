-- Sync missing columns for #2 (approval workflow) and #7 (dropped fields)
-- Run in Supabase SQL Editor (project wetpcdsiaodnoeaekitu).
-- Safe/idempotent: uses IF NOT EXISTS.

-- #2 Artikel-Freigabe-Workflow (approve/reject)
alter table artikel add column if not exists status text default 'active';
alter table artikel add column if not exists created_by text;
alter table artikel add column if not exists rejected_reason text;

-- #7 Bestellung Wareneingang (Teil-/Fehlmenge)
alter table bestellungen add column if not exists empfangen numeric;
alter table bestellungen add column if not exists fehlmenge numeric;

-- #7 Bereich-Artikel Quelle (woher aufgefüllt wird)
alter table bereich_artikel add column if not exists quelle_id text;
