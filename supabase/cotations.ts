// Fonction Supabase « cotations » — Gestion de patrimoine frontalier Suisse
// À coller dans Supabase > Edge Functions > cotations, puis « Deploy ».
// IMPORTANT : désactiver « Verify JWT » (le site n'a plus de comptes utilisateurs).
//
// Actions (POST JSON) :
//   { action: "cours", symboles: ["CW8.PA", ...] }   -> { cotations: [{ symbole, prix, devise }] }
//   { action: "change" }                             -> { taux, maj }   (CHF pour 1 EUR)
//   { action: "classement", type: "etf" | "dividendes" } -> { maj, lignes: [...] }
//
// Aucune donnée personnelle n'est reçue ni stockée : uniquement des symboles boursiers.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const CACHE_COURS_MIN = 15;
const CACHE_CLASSEMENT_MIN = 30;
const SYMBOLE_VALIDE = /^[A-Z0-9.\-=^]{1,20}$/;

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

/* ------------------------------------------------------------ univers suivis */

const ETF: Record<string, { nom: string; zone: string; pea: boolean; place: string }> = {
  'CW8.PA': { nom: 'Amundi MSCI World Swap', zone: 'Monde', pea: true, place: 'FR' },
  'EWLD.PA': { nom: 'Amundi PEA MSCI World', zone: 'Monde', pea: true, place: 'FR' },
  'DCAM.PA': { nom: 'Amundi PEA Monde (MSCI World)', zone: 'Monde', pea: true, place: 'FR' },
  'WPEA.PA': { nom: 'iShares MSCI World Swap PEA', zone: 'Monde', pea: true, place: 'FR' },
  'PE500.PA': { nom: 'Amundi PEA S&P 500', zone: 'États-Unis', pea: true, place: 'FR' },
  'ESE.PA': { nom: 'BNP Paribas Easy S&P 500', zone: 'États-Unis', pea: true, place: 'FR' },
  'PANX.PA': { nom: 'Amundi PEA Nasdaq-100', zone: 'États-Unis tech', pea: true, place: 'FR' },
  'RS2K.PA': { nom: 'Amundi Russell 2000', zone: 'États-Unis small caps', pea: true, place: 'FR' },
  'PAEEM.PA': { nom: 'Amundi PEA MSCI Emerging ESG', zone: 'Émergents', pea: true, place: 'FR' },
  'PAASI.PA': { nom: 'Amundi PEA MSCI Emerging Asia', zone: 'Asie émergente', pea: true, place: 'FR' },
  'PTPXE.PA': { nom: 'Amundi PEA Japan Topix', zone: 'Japon', pea: true, place: 'FR' },
  'PCEU.PA': { nom: 'Amundi PEA MSCI Europe', zone: 'Europe', pea: true, place: 'FR' },
  'MEUD.PA': { nom: 'Amundi Stoxx Europe 600', zone: 'Europe', pea: true, place: 'FR' },
  'ETZ.PA': { nom: 'BNP Paribas Easy Stoxx Europe 600', zone: 'Europe', pea: true, place: 'FR' },
  'CAC.PA': { nom: 'Amundi CAC 40', zone: 'France', pea: true, place: 'FR' },
  'IWDA.AS': { nom: 'iShares Core MSCI World', zone: 'Monde', pea: false, place: 'NL' },
  'VWCE.DE': { nom: 'Vanguard FTSE All-World Acc', zone: 'Monde', pea: false, place: 'DE' },
  'CSPX.AS': { nom: 'iShares Core S&P 500', zone: 'États-Unis', pea: false, place: 'NL' },
  'VUSA.AS': { nom: 'Vanguard S&P 500', zone: 'États-Unis', pea: false, place: 'NL' },
  'EQQQ.DE': { nom: 'Invesco EQQQ Nasdaq-100', zone: 'États-Unis tech', pea: false, place: 'DE' },
  'IS3N.DE': { nom: 'iShares Core MSCI EM IMI', zone: 'Émergents', pea: false, place: 'DE' },
  'SXRV.DE': { nom: 'iShares Nasdaq 100', zone: 'États-Unis tech', pea: false, place: 'DE' },
  'CHSPI.SW': { nom: 'iShares Core SPI (CH)', zone: 'Suisse', pea: false, place: 'CH' },
  'CSSMI.SW': { nom: 'iShares SMI (CH)', zone: 'Suisse', pea: false, place: 'CH' },
};

const ACTIONS: Record<string, { nom: string; pays: string; secteur: string; pea: boolean }> = {
  'TTE.PA': { nom: 'TotalEnergies', pays: 'FR', secteur: 'Énergie', pea: true },
  'ENGI.PA': { nom: 'Engie', pays: 'FR', secteur: 'Services aux collectivités', pea: true },
  'ORA.PA': { nom: 'Orange', pays: 'FR', secteur: 'Télécoms', pea: true },
  'CS.PA': { nom: 'AXA', pays: 'FR', secteur: 'Assurance', pea: true },
  'BNP.PA': { nom: 'BNP Paribas', pays: 'FR', secteur: 'Banque', pea: true },
  'ACA.PA': { nom: 'Crédit Agricole', pays: 'FR', secteur: 'Banque', pea: true },
  'GLE.PA': { nom: 'Société Générale', pays: 'FR', secteur: 'Banque', pea: true },
  'SAN.PA': { nom: 'Sanofi', pays: 'FR', secteur: 'Santé', pea: true },
  'DG.PA': { nom: 'Vinci', pays: 'FR', secteur: 'Construction', pea: true },
  'EN.PA': { nom: 'Bouygues', pays: 'FR', secteur: 'Construction', pea: true },
  'FGR.PA': { nom: 'Eiffage', pays: 'FR', secteur: 'Construction', pea: true },
  'CA.PA': { nom: 'Carrefour', pays: 'FR', secteur: 'Distribution', pea: true },
  'ML.PA': { nom: 'Michelin', pays: 'FR', secteur: 'Automobile', pea: true },
  'STLAP.PA': { nom: 'Stellantis', pays: 'FR', secteur: 'Automobile', pea: true },
  'RNO.PA': { nom: 'Renault', pays: 'FR', secteur: 'Automobile', pea: true },
  'URW.PA': { nom: 'Unibail-Rodamco-Westfield', pays: 'FR', secteur: 'Foncière', pea: true },
  'LI.PA': { nom: 'Klépierre', pays: 'FR', secteur: 'Foncière', pea: true },
  'COV.PA': { nom: 'Covivio', pays: 'FR', secteur: 'Foncière', pea: true },
  'GFC.PA': { nom: 'Gecina', pays: 'FR', secteur: 'Foncière', pea: true },
  'MERY.PA': { nom: 'Mercialys', pays: 'FR', secteur: 'Foncière', pea: true },
  'COFA.PA': { nom: 'Coface', pays: 'FR', secteur: 'Assurance', pea: true },
  'SCR.PA': { nom: 'SCOR', pays: 'FR', secteur: 'Réassurance', pea: true },
  'AMUN.PA': { nom: 'Amundi', pays: 'FR', secteur: 'Gestion d’actifs', pea: true },
  'RUI.PA': { nom: 'Rubis', pays: 'FR', secteur: 'Énergie', pea: true },
  'VIE.PA': { nom: 'Veolia', pays: 'FR', secteur: 'Services aux collectivités', pea: true },
  'PUB.PA': { nom: 'Publicis', pays: 'FR', secteur: 'Médias', pea: true },
  'KER.PA': { nom: 'Kering', pays: 'FR', secteur: 'Luxe', pea: true },
  'MC.PA': { nom: 'LVMH', pays: 'FR', secteur: 'Luxe', pea: true },
  'AI.PA': { nom: 'Air Liquide', pays: 'FR', secteur: 'Chimie', pea: true },
  'TEP.PA': { nom: 'Teleperformance', pays: 'FR', secteur: 'Services', pea: true },
  'ALV.DE': { nom: 'Allianz', pays: 'DE', secteur: 'Assurance', pea: true },
  'MUV2.DE': { nom: 'Munich Re', pays: 'DE', secteur: 'Réassurance', pea: true },
  'BAS.DE': { nom: 'BASF', pays: 'DE', secteur: 'Chimie', pea: true },
  'DTE.DE': { nom: 'Deutsche Telekom', pays: 'DE', secteur: 'Télécoms', pea: true },
  'MBG.DE': { nom: 'Mercedes-Benz', pays: 'DE', secteur: 'Automobile', pea: true },
  'INGA.AS': { nom: 'ING', pays: 'NL', secteur: 'Banque', pea: true },
  'NN.AS': { nom: 'NN Group', pays: 'NL', secteur: 'Assurance', pea: true },
  'ENEL.MI': { nom: 'Enel', pays: 'IT', secteur: 'Services aux collectivités', pea: true },
  'ENI.MI': { nom: 'Eni', pays: 'IT', secteur: 'Énergie', pea: true },
  'ISP.MI': { nom: 'Intesa Sanpaolo', pays: 'IT', secteur: 'Banque', pea: true },
  'IBE.MC': { nom: 'Iberdrola', pays: 'ES', secteur: 'Services aux collectivités', pea: true },
  'SAN.MC': { nom: 'Banco Santander', pays: 'ES', secteur: 'Banque', pea: true },
  'NESN.SW': { nom: 'Nestlé', pays: 'CH', secteur: 'Alimentation', pea: false },
  'NOVN.SW': { nom: 'Novartis', pays: 'CH', secteur: 'Santé', pea: false },
  'ROG.SW': { nom: 'Roche', pays: 'CH', secteur: 'Santé', pea: false },
  'ZURN.SW': { nom: 'Zurich Insurance', pays: 'CH', secteur: 'Assurance', pea: false },
  'SREN.SW': { nom: 'Swiss Re', pays: 'CH', secteur: 'Réassurance', pea: false },
  'SLHN.SW': { nom: 'Swiss Life', pays: 'CH', secteur: 'Assurance', pea: false },
  'SCMN.SW': { nom: 'Swisscom', pays: 'CH', secteur: 'Télécoms', pea: false },
  'UBSG.SW': { nom: 'UBS', pays: 'CH', secteur: 'Banque', pea: false },
  'ABBN.SW': { nom: 'ABB', pays: 'CH', secteur: 'Industrie', pea: false },
  'HOLN.SW': { nom: 'Holcim', pays: 'CH', secteur: 'Matériaux', pea: false },
  'PGHN.SW': { nom: 'Partners Group', pays: 'CH', secteur: 'Gestion d’actifs', pea: false },
  'SGSN.SW': { nom: 'SGS', pays: 'CH', secteur: 'Services', pea: false },
  'GIVN.SW': { nom: 'Givaudan', pays: 'CH', secteur: 'Chimie', pea: false },
};

/* ------------------------------------------------------------ Yahoo Finance */

async function chart(symbole: string, range = '1y', evenements = false) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbole)}?range=${range}&interval=1d${evenements ? '&events=div' : ''}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; patrimoine-frontalier/1.0)' } });
  if (!r.ok) throw new Error(`Yahoo ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res?.meta?.regularMarketPrice) throw new Error('Symbole inconnu');
  return res;
}

// Exécute des tâches par lots pour ménager la source.
async function parLots<T, R>(elements: T[], taille: number, f: (x: T) => Promise<R>) {
  const out: (R | null)[] = [];
  for (let i = 0; i < elements.length; i += taille) {
    const lot = await Promise.all(elements.slice(i, i + taille).map((x) => f(x).catch(() => null)));
    out.push(...lot);
  }
  return out.filter((x): x is R => x !== null);
}

function performances(res: any) {
  const ts: number[] = res.timestamp || [];
  const closes: (number | null)[] = res.indicators?.quote?.[0]?.close || [];
  const pts = ts.map((t, i) => ({ t: t * 1000, c: closes[i] })).filter((p) => p.c != null) as { t: number; c: number }[];
  const prix = res.meta.regularMarketPrice;
  if (!pts.length) return { prix };
  const annee = new Date().getFullYear();
  const debutAnnee = pts.find((p) => new Date(p.t).getFullYear() === annee);
  const ilYaUnMois = pts.find((p) => p.t >= Date.now() - 31 * 86400000);
  return {
    prix,
    perf1a: prix / pts[0].c - 1,
    perfYtd: debutAnnee ? prix / debutAnnee.c - 1 : null,
    perf1m: ilYaUnMois ? prix / ilYaUnMois.c - 1 : null,
  };
}

/* ------------------------------------------------------------ actions */

async function actionCours(symboles: string[]) {
  const liste = [...new Set((symboles || []).map((s) => String(s).trim().toUpperCase()))].filter((s) => SYMBOLE_VALIDE.test(s)).slice(0, 40);
  if (!liste.length) return { cotations: [] };

  const limite = Date.now() - CACHE_COURS_MIN * 60000;
  const { data: caches } = await admin.from('cotations').select('symbole, prix, devise, maj_le').in('symbole', liste);
  const frais = new Map((caches || []).filter((c) => new Date(c.maj_le).getTime() > limite).map((c) => [c.symbole, c]));
  const aCharger = liste.filter((s) => !frais.has(s));

  const nouveaux = await parLots(aCharger, 8, async (s) => {
    const res = await chart(s, '1d');
    return { symbole: s, prix: res.meta.regularMarketPrice, devise: res.meta.currency || null, maj_le: new Date().toISOString() };
  });
  if (nouveaux.length) await admin.from('cotations').upsert(nouveaux);
  nouveaux.forEach((n) => frais.set(n.symbole, n));

  return { cotations: liste.map((s) => ({ symbole: s, prix: frais.get(s)?.prix ?? null, devise: frais.get(s)?.devise ?? null })) };
}

async function actionChange() {
  const { cotations } = await actionCours(['EURCHF=X']);
  const { data } = await admin.from('cotations').select('maj_le').eq('symbole', 'EURCHF=X').maybeSingle();
  return { taux: cotations[0]?.prix ?? null, maj: data?.maj_le ?? new Date().toISOString() };
}

async function lireCacheClassement(cle: string) {
  try {
    const { data, error } = await admin.from('classements').select('donnees, maj_le').eq('cle', cle).maybeSingle();
    if (error || !data) return null;
    if (Date.now() - new Date(data.maj_le).getTime() > CACHE_CLASSEMENT_MIN * 60000) return null;
    return data.donnees;
  } catch {
    return null; // table absente : on fonctionne sans cache
  }
}

async function ecrireCacheClassement(cle: string, donnees: unknown) {
  try {
    await admin.from('classements').upsert({ cle, donnees, maj_le: new Date().toISOString() });
  } catch {}
}

async function actionClassement(type: string) {
  if (type !== 'etf' && type !== 'dividendes') throw new Error('Classement inconnu');
  const enCache = await lireCacheClassement(type);
  if (enCache) return enCache;

  let lignes: unknown[];
  if (type === 'etf') {
    lignes = await parLots(Object.keys(ETF), 8, async (s) => {
      const res = await chart(s, '1y');
      return { symbole: s, ...ETF[s], devise: res.meta.currency, ...performances(res) };
    });
  } else {
    const unAn = Date.now() - 365 * 86400000;
    lignes = await parLots(Object.keys(ACTIONS), 8, async (s) => {
      const res = await chart(s, '1y', true);
      const div = Object.values(res.events?.dividends || {}) as { amount: number; date: number }[];
      const recents = div.filter((d) => d.date * 1000 >= unAn);
      const total = recents.reduce((a, d) => a + (d.amount || 0), 0);
      const prix = res.meta.regularMarketPrice;
      // Cotations en pence (GBp) ou en centimes : on ignore, l'univers est en EUR et CHF.
      return { symbole: s, ...ACTIONS[s], devise: res.meta.currency, prix, dividende: total, versements: recents.length, rendement: total > 0 ? total / prix : 0 };
    });
  }
  if (!lignes.length) throw new Error('Source de cotation indisponible pour le moment, réessayez plus tard.');
  const resultat = { maj: new Date().toISOString(), lignes };
  await ecrireCacheClassement(type, resultat);
  return resultat;
}

/* ------------------------------------------------------------ point d'entrée */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const repondre = (corps: unknown, statut = 200) =>
    new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    const corps = await req.json().catch(() => ({}));
    const action = corps.action || (corps.symboles ? 'cours' : '');
    if (action === 'cours') return repondre(await actionCours(corps.symboles));
    if (action === 'change') return repondre(await actionChange());
    if (action === 'classement') return repondre(await actionClassement(corps.type));
    return repondre({ erreur: 'Action inconnue' }, 400);
  } catch (e) {
    return repondre({ erreur: (e as Error).message || 'Erreur interne' }, 200);
  }
});
