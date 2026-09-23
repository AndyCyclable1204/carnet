// Edge Function « cotations »
// Récupère le dernier cours connu d'une liste de symboles et le met en cache
// 12 h en base, pour ne pas se faire limiter par la source quand plusieurs
// utilisateurs chargent leur tableau de bord le même jour.
//
// Déploiement : supabase functions deploy cotations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DUREE_CACHE_MS = 12 * 60 * 60 * 1000;
const MAX_SYMBOLES = 40;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function coursDistant(symbole: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbole)}?interval=1d&range=5d`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Carnet/1.0)' } });
  if (!r.ok) return null;
  const j = await r.json();
  const meta = j?.chart?.result?.[0]?.meta;
  const prix = meta?.regularMarketPrice ?? meta?.previousClose;
  if (typeof prix !== 'number' || !isFinite(prix)) return null;
  return { prix, devise: meta?.currency ?? null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { symboles } = await req.json();
    if (!Array.isArray(symboles) || !symboles.length) {
      return new Response(JSON.stringify({ erreur: 'Aucun symbole fourni.' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const liste = [...new Set(symboles.map((s: unknown) => String(s).trim().toUpperCase()))]
      .filter((s) => /^[A-Z0-9.\-=^]{1,20}$/.test(s))
      .slice(0, MAX_SYMBOLES);

    const { data: cache } = await admin.from('cotations').select('*').in('symbole', liste);
    const parSymbole = new Map((cache ?? []).map((c) => [c.symbole, c]));
    const maintenant = Date.now();
    const resultats: unknown[] = [];
    const aEcrire: unknown[] = [];

    for (const symbole of liste) {
      const connu = parSymbole.get(symbole);
      if (connu && maintenant - new Date(connu.maj_le).getTime() < DUREE_CACHE_MS) {
        resultats.push({ symbole, prix: Number(connu.prix), devise: connu.devise, source: 'cache' });
        continue;
      }
      const frais = await coursDistant(symbole);
      if (frais) {
        resultats.push({ symbole, ...frais, source: 'marché' });
        aEcrire.push({ symbole, prix: frais.prix, devise: frais.devise, maj_le: new Date().toISOString() });
      } else if (connu) {
        // Source indisponible : on renvoie la dernière valeur connue plutôt que rien.
        resultats.push({ symbole, prix: Number(connu.prix), devise: connu.devise, source: 'cache périmé' });
      } else {
        resultats.push({ symbole, prix: null, erreur: 'symbole introuvable' });
      }
    }

    if (aEcrire.length) await admin.from('cotations').upsert(aEcrire);

    return new Response(JSON.stringify({ cotations: resultats }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ erreur: String(e) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
