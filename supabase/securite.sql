-- Gestion de patrimoine frontalier Suisse — sécurisation de la base.
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Rejouable sans risque.

-- ============================================================ 1. Nettoyage de l'ancienne version « Carnet »
-- Les comptes utilisateurs ont disparu : ces tables et le déclencheur d'inscription ne servent plus.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.gerer_nouvel_utilisateur();
drop table if exists public.positions, public.comptes, public.releves, public.prets, public.biens, public.profils cascade;

-- Le cache des cours reste utilisé par la fonction « cotations », mais n'a plus à être lisible de l'extérieur.
drop policy if exists cotations_lecture on public.cotations;
alter table if exists public.cotations enable row level security;

-- Cache des classements (déjà créé par migration.sql ; sans effet s'il existe).
create table if not exists public.classements (
  cle text primary key,
  donnees jsonb not null,
  maj_le timestamptz not null default now()
);
alter table public.classements enable row level security;

-- ============================================================ 2. Limite de débit de la fonction « cotations »
-- Compteurs par minute. La clé visiteur est une empreinte de l'adresse IP (jamais l'IP en clair),
-- effacée au bout de 24 h.
create table if not exists public.limites (
  cle text primary key,
  compteur integer not null default 0,
  debut timestamptz not null default now()
);
alter table public.limites enable row level security; -- aucune policy : accès réservé à la fonction

create or replace function public.incrementer_limite(p_cle text, p_max integer, p_fenetre_s integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.limites as l (cle, compteur, debut)
  values (p_cle, 1, now())
  on conflict (cle) do update set
    compteur = case when l.debut < now() - make_interval(secs => p_fenetre_s) then 1 else l.compteur + 1 end,
    debut    = case when l.debut < now() - make_interval(secs => p_fenetre_s) then now() else l.debut end
  returning compteur into n;

  -- Ménage occasionnel des compteurs de plus de 24 h.
  if random() < 0.01 then
    delete from public.limites where debut < now() - interval '24 hours';
  end if;

  return n <= p_max;
end;
$$;

revoke all on function public.incrementer_limite(text, integer, integer) from public, anon, authenticated;
grant execute on function public.incrementer_limite(text, integer, integer) to service_role;

-- ============================================================ vérification
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- Attendu : classements, cotations, limites — toutes avec rowsecurity = true.
