-- ═══════════════════════════════════════════════════════════════
-- PIN-Schutz — 2026-11-16
--
-- Bisher konnte jeder mit dem anon-Key ALLE PINs lesen (select auf users).
-- Danach: die Spalte users.pin ist für anon/authenticated gesperrt.
-- PINs werden nur noch über security-definer-Funktionen geprüft bzw. gesetzt,
-- die den PIN nie zurückgeben.
--
-- Im Supabase SQL Editor ausführen (einmal, komplett).
-- ═══════════════════════════════════════════════════════════════

-- 1) Spalte pin sperren: Tabellen-Recht entziehen, alle Spalten außer pin neu vergeben
revoke select, insert, update, delete on public.users from anon, authenticated;

grant select (
  id, name, email, role, standorte, bereiche, perms, deleted_at, created_at
) on public.users to anon, authenticated;

grant insert (
  id, name, email, role, standorte, bereiche, perms, deleted_at, created_at
) on public.users to anon, authenticated;

grant update (
  id, name, email, role, standorte, bereiche, perms, deleted_at, created_at
) on public.users to anon, authenticated;

grant delete on public.users to anon, authenticated;

-- 2) Fehlversuche begrenzen (max. 8 pro 15 Minuten, app-weit)
create table if not exists public.login_attempts (
  id bigserial primary key,
  ok boolean not null,
  at timestamptz not null default now()
);
revoke all on public.login_attempts from anon, authenticated;

create or replace function public.login_pin(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fails int;
  v_user public.users%rowtype;
begin
  select count(*) into v_fails
  from public.login_attempts
  where ok = false and at > now() - interval '15 minutes';

  if v_fails >= 8 then
    return jsonb_build_object('error', 'LOCKED');
  end if;

  select * into v_user
  from public.users
  where pin = p_pin and deleted_at is null
  limit 1;

  if not found then
    insert into public.login_attempts (ok) values (false);
    return jsonb_build_object('error', 'WRONG');
  end if;

  insert into public.login_attempts (ok) values (true);
  delete from public.login_attempts where at < now() - interval '1 day';

  return jsonb_build_object(
    'id', v_user.id,
    'name', v_user.name,
    'email', coalesce(v_user.email, ''),
    'role', v_user.role,
    'standorte', coalesce(v_user.standorte, array['all']),
    'bereiche', coalesce(v_user.bereiche, array['all']),
    'perms', case when v_user.perms is null or cardinality(v_user.perms) = 0 then null else to_jsonb(v_user.perms) end
  );
end;
$$;

-- 3) PIN-Prüfung für den Daten-Reset (gibt nur wahr/falsch zurück)
--    Teilt sich die Fehlversuch-Sperre mit login_pin, sonst könnte man PINs hierüber durchprobieren.
create or replace function public.check_pin(p_user_id text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.login_attempts
      where ok = false and at > now() - interval '15 minutes') >= 8 then
    return false;
  end if;

  if exists (
    select 1 from public.users
    where id = p_user_id and pin = p_pin and deleted_at is null
  ) then
    return true;
  end if;

  insert into public.login_attempts (ok) values (false);
  return false;
end;
$$;

-- 4) Benutzer anlegen/ändern: PIN wird serverseitig geprüft und geschrieben
create or replace function public.save_user(
  p_id text, p_name text, p_email text, p_role text,
  p_pin text, p_standorte text[], p_bereiche text[], p_perms text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_pin text;
  v_exists boolean;
begin
  select pin, true into v_old_pin, v_exists from public.users where id = p_id;
  v_exists := coalesce(v_exists, false);

  -- Leerer PIN beim Bearbeiten = bisherigen PIN behalten
  p_pin := nullif(btrim(coalesce(p_pin, '')), '');
  if p_pin is null and v_exists then
    p_pin := v_old_pin;
  elsif p_pin is null or p_pin !~ '^[0-9]{4,6}$' then
    return jsonb_build_object('error', 'PIN_INVALID');
  end if;

  if p_pin is distinct from v_old_pin then
    -- PIN eines gelöschten Benutzers freigeben, damit er neu vergeben werden kann
    update public.users
    set pin = pin || '-' || substr(md5(random()::text), 1, 4)
    where pin = p_pin and id <> p_id and deleted_at is not null;

    if exists (
      select 1 from public.users
      where pin = p_pin and id <> p_id and deleted_at is null
    ) then
      return jsonb_build_object('error', 'PIN_TAKEN');
    end if;
  end if;

  insert into public.users (id, name, email, role, pin, standorte, bereiche, perms)
  values (p_id, p_name, coalesce(p_email, ''), coalesce(p_role, 'staff'), p_pin,
          coalesce(p_standorte, array['all']), coalesce(p_bereiche, array['all']),
          coalesce(p_perms, array[]::text[]))
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    pin = excluded.pin,
    standorte = excluded.standorte,
    bereiche = excluded.bereiche,
    perms = excluded.perms,
    deleted_at = null;

  return jsonb_build_object('ok', true, 'pin_changed', v_old_pin is distinct from p_pin);
end;
$$;

revoke all on function public.login_pin(text) from public;
revoke all on function public.check_pin(text, text) from public;
revoke all on function public.save_user(text, text, text, text, text, text[], text[], text[]) from public;
grant execute on function public.login_pin(text) to anon, authenticated;
grant execute on function public.check_pin(text, text) to anon, authenticated;
grant execute on function public.save_user(text, text, text, text, text, text[], text[], text[]) to anon, authenticated;
