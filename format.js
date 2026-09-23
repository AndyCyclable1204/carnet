const nfEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const nfEur2 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfNb = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nfPct = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const eur = (v) => nfEur.format(Math.round(+v || 0));
export const eur2 = (v) => nfEur2.format(+v || 0);
export const nb = (v) => nfNb.format(+v || 0);
export const pct = (v) => nfPct.format(+v || 0);
export const pct1 = (v) => new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(+v || 0);
export const date = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
export const $ = (id) => document.getElementById(id);

export const couleurs = {
  immobilier: '#a98235',
  amorti: '#3d6070',
  financier: '#0e6b4c',
  dette: '#8f3a2c',
  especes: '#7fa08f',
  trait: '#d2d9d3',
  encre: '#101b17',
};
