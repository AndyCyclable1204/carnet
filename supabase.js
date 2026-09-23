import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function utilisateurCourant() {
  const { data } = await sb.auth.getUser();
  return data?.user ?? null;
}

export async function exigeConnexion() {
  const u = await utilisateurCourant();
  if (!u) {
    location.replace('auth.html?retour=' + encodeURIComponent(location.pathname));
    return null;
  }
  return u;
}

export async function deconnexion() {
  await sb.auth.signOut();
  location.href = 'index.html';
}

// Appelle une Edge Function avec le jeton de l'utilisateur connecté.
export async function fonction(nom, corps) {
  const { data, error } = await sb.functions.invoke(nom, { body: corps });
  if (error) throw error;
  return data;
}

// Traduit les messages d'erreur Supabase les plus fréquents.
export function messageErreur(e) {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Adresse e-mail ou mot de passe incorrect.';
  if (m.includes('already registered')) return 'Un compte existe déjà avec cette adresse.';
  if (m.includes('password should be')) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (m.includes('email not confirmed')) return "Confirmez d'abord votre adresse via le lien reçu par e-mail.";
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (m.includes('failed to fetch')) return 'Connexion au serveur impossible. Vérifiez votre réseau.';
  return e?.message || 'Une erreur est survenue.';
}
