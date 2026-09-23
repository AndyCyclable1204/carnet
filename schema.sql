-- Carnet — schéma complet.
-- À coller dans Supabase > SQL Editor > New query, puis exécuter une fois.
-- Le script est idempotent : on peut le rejouer sans casser l'existant.

-- ============================================================ profils

create table if not exists public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  cree_le timestamptz not null default now()
);

-- Crée automatiquement la fiche profil à l'inscription.
create or replace function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profils (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.gerer_nouvel_utilisateur();

-- ============================================================ patrimoine

create table if not exists public.biens (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null,
  type text,
  valeur numeric(14,2) not null default 0,
  prix_acquisition numeric(14,2),
  date_acquisition date,
  loyer_mensuel numeric(12,2),
  cree_le timestamptz not null default now()
);

create table if not exists public.prets (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bien_id uuid references public.biens (id) on delete set null,
  nom text not null,
  capital_initial numeric(14,2),
  taux_annuel numeric(6,5) not null default 0,       -- 0.0125 = 1,25 %
  duree_mois integer not null default 240,
  date_debut date,
  capital_restant numeric(14,2) not null default 0,  -- au dernier relevé connu
  date_capital_restant date not null default current_date,
  cree_le timestamptz not null default now(),
  constraint prets_duree_positive check (duree_mois > 0),
  constraint prets_taux_plausible check (taux_annuel >= 0 and taux_annuel < 1)
);

create table if not exists public.comptes (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom text not null,
  type text,
  etablissement text,
  solde_especes numeric(14,2) not null default 0,
  versements_cumules numeric(14,2),
  cree_le timestamptz not null default now()
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  compte_id uuid not null references public.comptes (id) on delete cascade,
  libelle text not null,
  symbole text,
  quantite numeric(18,6) not null default 0,
  prix_revient numeric(14,4),
  dernier_prix numeric(14,4),
  dernier_prix_le timestamptz,
  cree_le timestamptz not null default now()
);

create table if not exists public.releves (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date_releve date not null default current_date,
  immobilier numeric(14,2) not null default 0,
  financier numeric(14,2) not null default 0,
  dette numeric(14,2) not null default 0,
  net numeric(14,2) not null default 0,
  note text,
  unique (profil_id, date_releve)
);

create index if not exists idx_biens_profil on public.biens (profil_id);
create index if not exists idx_prets_profil on public.prets (profil_id);
create index if not exists idx_comptes_profil on public.comptes (profil_id);
create index if not exists idx_positions_profil on public.positions (profil_id, compte_id);
create index if not exists idx_releves_profil on public.releves (profil_id, date_releve);

-- ============================================================ cotations
-- Cache partagé des cours. Écrit uniquement par l'Edge Function (service_role),
-- lisible par les utilisateurs connectés. Ne contient aucune donnée personnelle.

create table if not exists public.cotations (
  symbole text primary key,
  prix numeric(18,6) not null,
  devise text,
  maj_le timestamptz not null default now()
);

-- ============================================================ sécurité
-- Chaque ligne n'est visible et modifiable que par son propriétaire.
-- Le contrôle est fait par la base, pas par le navigateur.

alter table public.profils   enable row level security;
alter table public.biens     enable row level security;
alter table public.prets     enable row level security;
alter table public.comptes   enable row level security;
alter table public.positions enable row level security;
alter table public.releves   enable row level security;
alter table public.cotations enable row level security;

drop policy if exists profils_proprietaire on public.profils;
create policy profils_proprietaire on public.profils
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['biens','prets','comptes','positions','releves'] loop
    execute format('drop policy if exists %I_proprietaire on public.%I', t, t);
    execute format(
      'create policy %I_proprietaire on public.%I for all to authenticated
         using (profil_id = auth.uid()) with check (profil_id = auth.uid())', t, t);
  end loop;
end $$;

drop policy if exists cotations_lecture on public.cotations;
create policy cotations_lecture on public.cotations
  for select to authenticated using (true);
-- Aucune policy d'écriture : seules les Edge Functions (service_role) écrivent.

-- ============================================================ vérification
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- Toutes les lignes doivent afficher rowsecurity = true.
