import { LANGUE, LOCALE } from './i18n.js';

const cache = {};
const nf = (opts) => {
  const k = JSON.stringify(opts);
  return cache[k] || (cache[k] = new Intl.NumberFormat(LOCALE, opts));
};

// Montant dans une devise donnée, arrondi à l'unité.
// Français : format monétaire natif (1 234 €). Autres langues : nombre local suivi du symbole (1,234 € / 1’234 €).
const SYMBOLES = { EUR: '€', CHF: 'CHF', USD: '$' };
export const money = (v, devise = 'EUR', dec = 0) =>
  LANGUE === 'fr'
    ? nf({ style: 'currency', currency: devise, maximumFractionDigits: dec, minimumFractionDigits: dec }).format(+v || 0)
    : nf({ maximumFractionDigits: dec, minimumFractionDigits: dec }).format(+v || 0) + '\u00a0' + (SYMBOLES[devise] || devise);

// Montant compact pour les axes : 12 k, 1,2 M.
export const compact = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return nf({ maximumFractionDigits: 1 }).format(v / 1e6) + ' M';
  if (a >= 1e3) return nf({ maximumFractionDigits: 0 }).format(v / 1e3) + ' k';
  return nf({ maximumFractionDigits: 0 }).format(v);
};

export const nombre = (v, dec = 0) => nf({ maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(+v || 0);
export const pct = (v, dec = 2) => nf({ style: 'percent', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(+v || 0);
export const pctSigne = (v, dec = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + pct(Math.abs(v), dec);
// Dates au format jj/mm/aaaa dans toutes les langues (lisible partout, et stable pour la traduction).
const d2 = (n) => String(n).padStart(2, '0');
export const dateFr = (d) => { if (!d) return '—'; const x = new Date(d); return `${d2(x.getDate())}/${d2(x.getMonth() + 1)}/${x.getFullYear()}`; };
export const dateHeure = (d) => { if (!d) return '—'; const x = new Date(d); return `${d2(x.getDate())}/${d2(x.getMonth() + 1)} ${d2(x.getHours())}:${d2(x.getMinutes())}`; };
export const moisAnnee = (d) => { const x = new Date(d); return `${d2(x.getMonth() + 1)}/${x.getFullYear()}`; };

// Devises gérées. Conversion par l'euro : taux = CHF pour 1 EUR, tauxUSD = USD pour 1 EUR.
export const DEVISES = ['EUR', 'CHF', 'USD'];
let tauxUSD = 1.17;
export const definirTauxUSD = (x) => { if (x > 0.5 && x < 2.5) tauxUSD = +x; };
export const lireTauxUSD = () => tauxUSD;
export const symbole = (d) => ({ EUR: '€', CHF: 'CHF', USD: '$' }[d] || d);

export function convertir(montant, de, vers, taux) {
  de = de || 'EUR'; vers = vers || 'EUR';
  if (!montant || de === vers) return +montant || 0;
  const enEUR = de === 'CHF' ? montant / taux : de === 'USD' ? montant / tauxUSD : +montant;
  return vers === 'CHF' ? enEUR * taux : vers === 'USD' ? enEUR * tauxUSD : enEUR;
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const COULEURS = {
  nuit: '#0b1f33',
  lac: '#1e5b8c',
  lacClair: '#5b9bd5',
  alpin: '#d8313b',
  sapin: '#15803d',
  sable: '#c79a3e',
  brume: '#64748b',
  lavande: '#7c6fd6',
  trait: '#e2e8f0',
};
