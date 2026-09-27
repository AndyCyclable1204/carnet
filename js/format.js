const cache = {};
const nf = (opts) => {
  const k = JSON.stringify(opts);
  return cache[k] || (cache[k] = new Intl.NumberFormat('fr-FR', opts));
};

// Montant dans une devise donnée, arrondi à l'unité.
export const money = (v, devise = 'EUR', dec = 0) =>
  nf({ style: 'currency', currency: devise, maximumFractionDigits: dec, minimumFractionDigits: dec }).format(+v || 0);

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
export const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
export const dateHeure = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

// Conversion. taux = nombre de CHF pour 1 EUR.
export function convertir(montant, de, vers, taux) {
  if (!montant || de === vers) return +montant || 0;
  if (de === 'EUR' && vers === 'CHF') return montant * taux;
  if (de === 'CHF' && vers === 'EUR') return montant / taux;
  return +montant || 0;
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
