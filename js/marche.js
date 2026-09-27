// Données de marché : cours, taux EUR/CHF, classements.
// Seuls des symboles boursiers sont envoyés, jamais de montants ni d'identité.

import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const base = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const URL_FONCTION = `${base}/functions/v1/cotations`;

export const configure = () => !/VOTRE/.test(SUPABASE_URL) && !/VOTRE/.test(SUPABASE_KEY);

// Cache mémoire + session pour ne pas relancer la même requête à chaque vue.
const memo = new Map();
const DUREE = 5 * 60 * 1000;

async function appel(corps) {
  if (!configure()) throw new Error('Données de marché non configurées (config.js).');
  const cle = JSON.stringify(corps);
  const connu = memo.get(cle) || JSON.parse(sessionStorage.getItem('marche:' + cle) || 'null');
  if (connu && Date.now() - connu.t < DUREE) return connu.d;

  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 45000);
  try {
    const r = await fetch(URL_FONCTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: cle,
      signal: ctrl.signal,
    });
    if (r.status === 401) throw new Error('Accès refusé : désactivez « Verify JWT » sur la fonction cotations.');
    if (r.status === 429) throw new Error('Trop de requêtes : réessayez dans une minute.');
    if (r.status === 403) throw new Error('Ce site n\'est pas autorisé à utiliser le service de cotation (liste ORIGINES de la fonction).');
    if (!r.ok) throw new Error(`Service de cotation indisponible (${r.status}).`);
    const d = await r.json();
    if (d.erreur) throw new Error(d.erreur);
    const entree = { t: Date.now(), d };
    memo.set(cle, entree);
    try { sessionStorage.setItem('marche:' + cle, JSON.stringify(entree)); } catch {}
    return d;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Le service de cotation met trop de temps à répondre.');
    if (e instanceof TypeError) throw new Error('Service de cotation injoignable (projet Supabase en pause ?).');
    throw e;
  } finally {
    clearTimeout(minuteur);
  }
}

export const cours = (symboles) => appel({ action: 'cours', symboles });
export const change = () => appel({ action: 'change' });
export const classement = (type) => appel({ action: 'classement', type });

export function viderCache() {
  memo.clear();
  Object.keys(sessionStorage).filter((k) => k.startsWith('marche:')).forEach((k) => sessionStorage.removeItem(k));
}
