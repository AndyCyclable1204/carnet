-- Gestion de patrimoine frontalier Suisse — mise à jour de la base.
-- À coller dans Supabase > SQL Editor > New query, puis « Run ». Rejouable sans risque.
-- Ajoute le cache des classements (ETF, dividendes). Aucune donnée personnelle.

create table if not exists public.classements (
  cle text primary key,
  donnees jsonb not null,
  maj_le timestamptz not null default now()
);

alter table public.classements enable row level security;
-- Aucune policy : seule la fonction « cotations » (service_role) lit et écrit.

-- Facultatif : les tables de l'ancienne version avec comptes ne servent plus.
-- Retirez les deux tirets devant chaque ligne pour les supprimer définitivement.
-- drop table if exists public.positions, public.comptes, public.releves, public.prets, public.biens, public.profils cascade;
