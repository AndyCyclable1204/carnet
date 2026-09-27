const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icones = {
  accueil: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  patrimoine: svg('<path d="M3 20h18"/><path d="M5 20V10l7-5 7 5v10"/><path d="M10 20v-5h4v5"/>'),
  simulateurs: svg('<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-5 3 3 5-7"/>'),
  classements: svg('<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>'),
  sauvegarde: svg('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
  maison: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
  credit: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>'),
  enveloppe: svg('<path d="M4 7h16v12H4z"/><path d="M4 7l8 6 8-6"/>'),
  bouclier: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>'),
  histoire: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>'),
  cible: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
  immeuble: svg('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>'),
  piece: svg('<circle cx="12" cy="12" r="9"/><path d="M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2A2.5 2.5 0 0 1 9.5 15"/><path d="M12 6v1.5M12 16.5V18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  rafraichir: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
  import: svg('<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M4 7V4h16v3"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>'),
  alerte: svg('<path d="M12 3l9 16H3l9-16z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'),
  fleche: svg('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  cadenas: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  vide: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>'),
};

// Emblème : lac Léman et silhouette du Salève / Mont-Blanc.
export const logo = `
<svg viewBox="0 0 40 40" aria-hidden="true">
  <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e5b8c"/><stop offset="1" stop-color="#0b1f33"/></linearGradient></defs>
  <rect width="40" height="40" rx="11" fill="url(#lg)"/>
  <path d="M5 26l7-8 4 4 6-9 5 6 3-3 5 10z" fill="#fff" opacity=".95"/>
  <path d="M22 13l2.5 3-2.5-.6-2 .8z" fill="#cfe3f5"/>
  <path d="M5 29.5c4-1.6 8-1.6 12 0s8 1.6 12 0 4-1.2 6-.6" stroke="#7fb6e6" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <rect x="28" y="6" width="7" height="7" rx="1.6" fill="#d8313b"/>
  <path d="M31.5 7.6v3.8M29.6 9.5h3.8" stroke="#fff" stroke-width="1.3"/>
</svg>`;

// Illustration du héros : chaînes de montagnes et lac.
export const montagnes = `
<svg class="montagnes" viewBox="0 0 1200 190" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d6a9f" stop-opacity=".55"/><stop offset="1" stop-color="#2d6a9f" stop-opacity=".15"/></linearGradient>
    <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16406a"/><stop offset="1" stop-color="#0f2f4f"/></linearGradient>
    <linearGradient id="lac" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5b9bd5" stop-opacity=".0"/><stop offset=".5" stop-color="#7fb6e6" stop-opacity=".55"/><stop offset="1" stop-color="#5b9bd5" stop-opacity=".0"/></linearGradient>
  </defs>
  <path d="M0 120 L90 70 L150 95 L230 40 L300 88 L360 62 L430 100 L520 30 L560 52 L610 18 L660 50 L720 36 L790 84 L860 58 L940 96 L1020 64 L1100 92 L1200 70 L1200 190 L0 190Z" fill="url(#m1)"/>
  <path d="M590 36 L610 18 L632 34 L618 31 L606 38Z" fill="#e8f2fb" opacity=".9"/>
  <path d="M0 150 L120 110 L200 128 L310 92 L420 124 L520 104 L640 132 L760 100 L880 126 L1000 108 L1100 130 L1200 116 L1200 190 L0 190Z" fill="url(#m2)"/>
  <rect x="0" y="160" width="1200" height="3" fill="url(#lac)"/>
  <rect x="200" y="170" width="800" height="2" fill="url(#lac)" opacity=".6"/>
</svg>`;
