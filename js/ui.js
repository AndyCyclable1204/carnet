import { traduireGraphique, pluginTraduction } from './i18n.js';
import { esc, compact, COULEURS } from './format.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const mouvementReduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------ graphiques */

const graphiques = new Set();

export function themeGraphiques() {
  const C = window.Chart;
  C.register(pluginTraduction);
  C.defaults.font.family = "'Jakarta', system-ui, sans-serif";
  C.defaults.font.size = 12;
  C.defaults.color = '#64748b';
  if (mouvementReduit()) C.defaults.animation = false;
  else Object.assign(C.defaults.animation, { duration: 850, easing: 'easeOutQuart' });
  C.defaults.plugins.legend.labels.usePointStyle = true;
  C.defaults.plugins.legend.labels.pointStyle = 'circle';
  C.defaults.plugins.legend.labels.boxWidth = 8;
  C.defaults.plugins.legend.labels.boxHeight = 8;
  C.defaults.plugins.legend.labels.padding = 16;
  Object.assign(C.defaults.plugins.tooltip, {
    backgroundColor: COULEURS.nuit,
    padding: 12,
    cornerRadius: 10,
    titleFont: { weight: '600' },
    boxPadding: 4,
    usePointStyle: true,
  });
}

export function graphique(canvas, config) {
  const g = new window.Chart(canvas.getContext('2d'), traduireGraphique(config));
  graphiques.add(g);
  // Filet de sécurité : si le graphique naît pendant une transition de page ou dans un
  // conteneur pas encore dimensionné, il est redessiné une fois l'affichage stabilisé.
  setTimeout(() => reparer(g), 450);
  setTimeout(() => reparer(g), 1200);
  return g;
}

function reparer(g) {
  if (!graphiques.has(g)) return;
  if (!g.canvas?.isConnected) { g.destroy(); graphiques.delete(g); return; }
  const parent = g.canvas.parentElement;
  if (!parent.clientWidth) return; // onglet masqué : rien à dessiner pour l'instant
  const mauvaiseTaille = !g.width || !g.height || Math.abs(g.width - parent.clientWidth) > 2 || Math.abs(g.height - parent.clientHeight) > 2;
  if (mauvaiseTaille) g.resize();
  if (mauvaiseTaille || !g.chartArea || g.chartArea.width <= 0 || estVide(g.canvas)) g.update('none');
}

// Vrai si rien n'a été dessiné sur le canvas (échantillonnage d'un pixel sur 97).
function estVide(canvas) {
  try {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < d.length; i += 388) if (d[i]) return false;
    return true;
  } catch { return false; }
}

// Redessine tous les graphiques visibles (après une transition, un retour d'onglet…).
export function rafraichirGraphiques() {
  graphiques.forEach(reparer);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) rafraichirGraphiques(); });

export function detruireGraphiques() {
  graphiques.forEach((g) => g.destroy());
  graphiques.clear();
}

// Met à jour un graphique existant en conservant l'animation.
export function majGraphique(g, data) {
  g.data.labels = data.labels;
  data.datasets.forEach((d, i) => {
    if (g.data.datasets[i]) Object.assign(g.data.datasets[i], { data: d.data, label: d.label });
    else g.data.datasets.push(d);
  });
  g.data.datasets.length = data.datasets.length;
  g.update();
}

export const echelleMontant = (extra = {}) => ({
  grid: { color: COULEURS.trait, drawTicks: false },
  border: { display: false },
  ticks: { callback: (v) => compact(v), padding: 8 },
  ...extra,
});

export const echelleX = (titre, extra = {}) => ({
  grid: { display: false },
  border: { display: false },
  title: titre ? { display: true, text: titre } : undefined,
  ticks: { maxTicksLimit: 10, padding: 6 },
  ...extra,
});

export function degrade(canvas, couleur, haut = 0.35) {
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 300);
  const a = (x) => couleur + Math.round(x * 255).toString(16).padStart(2, '0');
  g.addColorStop(0, a(haut));
  g.addColorStop(1, a(0.02));
  return g;
}

/* ------------------------------------------------------------ nombres animés */

// Réduit la police d'un chiffre qui déborderait de sa carte (ex. montants en millions).
export function ajusterTaille(el) {
  if (!el) return;
  el.style.fontSize = '';
  const largeur = el.clientWidth;
  if (!largeur || el.scrollWidth <= largeur) return;
  const taille = parseFloat(getComputedStyle(el).fontSize);
  el.style.fontSize = `${Math.max(14, Math.floor(taille * (largeur / el.scrollWidth) * 0.97))}px`;
}

let attenteRedim;
window.addEventListener('resize', () => {
  clearTimeout(attenteRedim);
  attenteRedim = setTimeout(() => document.querySelectorAll('[data-ajuste]').forEach(ajusterTaille), 150);
});

export function animerNombre(el, valeur, format) {
  if (!el) return;
  const depart = +el.dataset.valeur || 0;
  el.dataset.valeur = valeur;
  // Taille calculée sur la valeur finale, avant l'animation, pour éviter que le chiffre saute.
  el.dataset.ajuste = '';
  el.textContent = format(valeur);
  ajusterTaille(el);
  if (mouvementReduit() || Math.abs(valeur - depart) < 1) {
    el.textContent = format(valeur);
    return;
  }
  const t0 = performance.now();
  const duree = 700;
  cancelAnimationFrame(+el.dataset.raf || 0);
  const pas = (t) => {
    const p = Math.min(1, (t - t0) / duree);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = format(depart + (valeur - depart) * e);
    if (p < 1) el.dataset.raf = requestAnimationFrame(pas);
  };
  el.dataset.raf = requestAnimationFrame(pas);
}

/* ------------------------------------------------------------ apparition en cascade */

export function cascade(racine) {
  if (mouvementReduit()) return;
  $$('[data-cascade] > *', racine).forEach((el, i) => {
    el.style.setProperty('--i', i);
    el.classList.add('entre');
  });
}

/* ------------------------------------------------------------ onglets */

// onglets : [{ id, libelle }] ; renvoie le HTML. L'indicateur glisse sous l'onglet actif.
export const htmlOnglets = (onglets, actif, attr = 'data-onglet') => `
  <div class="onglets" role="tablist">
    ${onglets.map((o) => `<button role="tab" ${attr}="${o.id}" aria-selected="${o.id === actif}">${o.libelle}</button>`).join('')}
    <span class="onglets-indicateur"></span>
  </div>`;

export function placerIndicateur(barre) {
  const actif = barre?.querySelector('[aria-selected="true"]');
  const ind = barre?.querySelector('.onglets-indicateur');
  if (!actif || !ind) return;
  ind.style.width = actif.offsetWidth + 'px';
  ind.style.transform = `translateX(${actif.offsetLeft}px)`;
  actif.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' });
}

export function changerPanneau(conteneur, rendu) {
  conteneur.classList.remove('panneau-entre');
  void conteneur.offsetWidth;
  rendu();
  conteneur.classList.add('panneau-entre');
}

/* ------------------------------------------------------------ curseurs */

export const htmlCurseur = ({ id, libelle, min, max, pas = 1, valeur, aide = '' }) => `
  <div class="curseur">
    <div class="curseur-ligne"><label for="${id}">${libelle}</label><output id="${id}-v"></output></div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${pas}" value="${valeur}">
    ${aide ? `<small>${aide}</small>` : ''}
  </div>`;

export function remplissage(input) {
  const p = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--p', p + '%');
}

/* ------------------------------------------------------------ notifications */

export function toast(message, type = 'info') {
  let zone = $('#toasts');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'toasts';
    zone.setAttribute('aria-live', 'polite');
    document.body.appendChild(zone);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  zone.appendChild(t);
  setTimeout(() => t.classList.add('sort'), 3600);
  setTimeout(() => t.remove(), 4000);
}

/* ------------------------------------------------------------ formulaire modal */

// champs : [{ cle, libelle, type: text|number|pct|select|date|devise|case, options, requis, aide, pas, visible(valeurs) }]
export function formulaire({ titre, champs, valeurs = {}, supprimable = false, intro = '' }) {
  return new Promise((resoudre) => {
    const fond = document.createElement('div');
    fond.className = 'modal-fond';
    fond.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-titre">
        <div class="modal-tete"><h3 id="m-titre">${esc(titre)}</h3><button class="icone-btn" data-fermer aria-label="Fermer">✕</button></div>
        ${intro ? `<p class="modal-intro">${intro}</p>` : ''}
        <form class="modal-corps" novalidate>${champs.map((c) => htmlChamp(c, valeurs[c.cle])).join('')}</form>
        <p class="modal-erreur" hidden></p>
        <div class="modal-pied">
          ${supprimable ? '<button class="btn danger" data-supprimer type="button">Supprimer</button>' : '<span></span>'}
          <div class="pile"><button class="btn discret" data-fermer type="button">Annuler</button><button class="btn" data-ok type="button">Enregistrer</button></div>
        </div>
      </div>`;
    document.body.appendChild(fond);
    requestAnimationFrame(() => fond.classList.add('ouvert'));
    const form = $('form', fond);

    const visibilite = () => {
      const v = lireValeurs(form, champs);
      champs.forEach((c) => {
        if (!c.visible) return;
        const bloc = form.querySelector(`[data-bloc="${c.cle}"]`);
        if (bloc) bloc.hidden = !c.visible(v);
      });
    };
    form.addEventListener('input', visibilite);
    visibilite();
    setTimeout(() => form.querySelector('input:not([type=checkbox]),select')?.focus(), 60);

    const fermer = (res) => {
      fond.classList.remove('ouvert');
      setTimeout(() => fond.remove(), 220);
      document.removeEventListener('keydown', clavier);
      resoudre(res);
    };
    const clavier = (e) => {
      if (e.key === 'Escape') fermer(null);
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') valider();
    };
    document.addEventListener('keydown', clavier);

    const valider = () => {
      const v = lireValeurs(form, champs);
      const manquant = champs.find((c) => c.requis && (!c.visible || c.visible(v)) && (v[c.cle] === null || v[c.cle] === ''));
      if (manquant) {
        const err = $('.modal-erreur', fond);
        err.textContent = `« ${manquant.libelle} » est obligatoire.`;
        err.hidden = false;
        return;
      }
      fermer({ action: 'enregistrer', valeurs: v });
    };

    fond.addEventListener('click', (e) => {
      if (e.target === fond || e.target.closest('[data-fermer]')) fermer(null);
      if (e.target.closest('[data-ok]')) valider();
      if (e.target.closest('[data-supprimer]') && confirm('Supprimer définitivement cet élément ?')) fermer({ action: 'supprimer' });
    });
  });
}

function htmlChamp(c, valeur) {
  let v = valeur ?? c.defaut ?? '';
  if (c.type === 'pct' && v !== '' && v !== null) v = +(v * 100).toFixed(4);
  const aide = c.aide ? `<small>${c.aide}</small>` : '';
  const bloc = (contenu) => `<div class="champ" data-bloc="${c.cle}">${contenu}${aide}</div>`;
  if (c.type === 'case') {
    return bloc(`<label class="interrupteur"><input type="checkbox" name="${c.cle}" ${v ? 'checked' : ''}><span></span>${c.libelle}</label>`);
  }
  if (c.type === 'select' || c.type === 'devise') {
    const opts = c.type === 'devise' ? [['EUR', 'Euro (EUR)'], ['CHF', 'Franc suisse (CHF)'], ...(c.usd ? [['USD', 'Dollar US (USD)']] : [])] : c.options.map((o) => (Array.isArray(o) ? o : [o, o]));
    return bloc(`<label>${c.libelle}<select name="${c.cle}">${opts.map(([val, lib]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lib)}</option>`).join('')}</select></label>`);
  }
  const type = c.type === 'pct' || c.type === 'number' ? 'number' : c.type;
  const suffixe = c.type === 'pct' ? '%' : c.suffixe || '';
  return bloc(`<label>${c.libelle}<span class="saisie ${suffixe ? 'avec-suffixe' : ''}"><input type="${type}" name="${c.cle}" value="${esc(v)}" ${c.pas ? `step="${c.pas}"` : type === 'number' ? 'step="any"' : ''} inputmode="${type === 'number' ? 'decimal' : 'text'}">${suffixe ? `<i>${suffixe}</i>` : ''}</span></label>`);
}

function lireValeurs(form, champs) {
  const v = {};
  champs.forEach((c) => {
    const el = form.elements[c.cle];
    if (!el) return;
    if (c.type === 'case') v[c.cle] = el.checked;
    else if (c.type === 'number' || c.type === 'pct') {
      const n = el.value === '' ? null : +String(el.value).replace(',', '.');
      v[c.cle] = n === null || Number.isNaN(n) ? null : c.type === 'pct' ? n / 100 : n;
    } else v[c.cle] = el.value;
  });
  return v;
}
