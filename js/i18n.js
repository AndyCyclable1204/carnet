// Traduction de l'interface — français (langue source), anglais, allemand, italien.
// Principe : les vues produisent le texte en français ; chaque texte affiché est traduit à la volée
// à partir d'un dictionnaire (js/i18n/<langue>.js). Les nombres sont remplacés par {0}, {1}… pour
// qu'une même phrase se traduise quelles que soient les valeurs. Un texte inconnu reste en français.

export const LANGUES = { fr: 'FR', en: 'EN', de: 'DE', it: 'IT' };
export const NOMS_LANGUES = { fr: 'Français', en: 'English', de: 'Deutsch', it: 'Italiano' };
const CLE = 'gpfs:langue';

function detecter() {
  try {
    const l = localStorage.getItem(CLE);
    if (LANGUES[l]) return l;
  } catch {}
  for (const n of navigator.languages || [navigator.language || 'fr']) {
    const c = String(n).slice(0, 2).toLowerCase();
    if (LANGUES[c]) return c;
  }
  return 'en';
}

export const LANGUE = detecter();
// Formats : anglais 1,234.56 ; allemand et italien au format suisse 1’234.56 ; français 1 234,56.
export const LOCALE = { fr: 'fr-FR', en: 'en-US', de: 'de-CH', it: 'it-CH' }[LANGUE];

export function changerLangue(l) {
  if (!LANGUES[l] || l === LANGUE) return;
  try { localStorage.setItem(CLE, l); } catch {}
  location.reload();
}

/* ------------------------------------------------------------ dictionnaire */

let dico = null;
// Textes sans traduction, consultables dans la console : __textesNonTraduits()
const manquants = new Set();
let deja = new Set(); // textes déjà traduits (valeurs du dictionnaire)
window.__textesNonTraduits = () => [...manquants];
const motifs = []; // [regex, cible, types de groupes]
const TOK = /[-+−]?\d(?:[\d\u202f\u00a0 .,'’]*\d)?(?:\u00a0?(?:%|€|CHF|\$US|\$|US\$|USD|EUR))?/g;
const TOK_SRC = TOK.source;
const LETTRE = /[A-Za-zÀ-ÿ]/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function preparerMotifs() {
  for (const [cle, cible] of Object.entries(dico)) {
    if (!cle.includes('{*}')) continue;
    const types = [];
    const src = cle.split(/(\{\*\}|\{\d+\})/).map((p) => {
      if (p === '{*}') { types.push('*'); return '(.+?)'; }
      const m = p.match(/^\{(\d+)\}$/);
      if (m) { types.push(+m[1]); return `(${TOK_SRC})`; }
      return esc(p);
    }).join('');
    motifs.push([new RegExp(`^${src}$`), cible, types]);
  }
}

function traduireCoeur(c) {
  const exact = dico[c] ?? dico[c.replace(/\s+/g, ' ').trim()];
  if (exact != null) return exact;
  const toks = [];
  const tpl = c.replace(TOK, (m) => `{${toks.push(m) - 1}}`).replace(/\s+/g, ' ').trim();
  const t = dico[tpl];
  if (t != null) return t.replace(/\{(\d+)\}/g, (_, i) => toks[i] ?? '');
  const plat = c.replace(/[ \t\n\r\f\v]+/g, ' ').trim(); // garde les espaces insécables des montants
  for (const [re, cible, types] of motifs) {
    const m = plat.match(re);
    if (!m) continue;
    const libres = [];
    const nombres = {};
    types.forEach((ty, i) => { if (ty === '*') libres.push(m[i + 1]); else nombres[ty] = m[i + 1]; });
    let k = 0;
    return cible
      .replace(/\{\*\}/g, () => { const x = libres[k++] ?? ''; return traduireCoeur(x) ?? x; })
      .replace(/\{(\d+)\}/g, (_, i) => nombres[i] ?? '');
  }
  return null;
}

// Traduit un texte (espaces de début et de fin et flèche de tri conservés). Renvoie le texte tel quel s'il est inconnu.
export function traduire(texte) {
  if (!dico || texte == null) return texte;
  const s = String(texte);
  if (!LETTRE.test(s) || deja.has(s.trim())) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*[↓↑])?(\s*)$/);
  const r = traduireCoeur(m[2]);
  if (r == null && manquants.size < 300) manquants.add(m[2]);
  return r == null ? s : m[1] + r + (m[3] || '') + m[4];
}

/* ------------------------------------------------------------ page */

const ATTRS = ['placeholder', 'title', 'aria-label'];
const poses = new WeakMap();

function ordinal(noeud) {
  const prec = noeud.parentNode.previousSibling?.textContent || '';
  const d = +(prec.match(/(\d+)\s*$/)?.[1] || 0);
  if (LANGUE === 'en') return d % 100 >= 11 && d % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[d % 10] || 'th');
  if (LANGUE === 'de') return '.';
  return '°';
}

function traduireNoeud(n) {
  if (n.nodeType === 3) {
    const v = n.nodeValue;
    if (poses.get(n) === v) return;
    const p = n.parentNode;
    if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return;
    const t = p.nodeName === 'SUP' && /^\s*(e|re|er)\s*$/.test(v) ? ordinal(n) : traduire(v);
    if (t !== v) n.nodeValue = t;
    poses.set(n, n.nodeValue);
  } else if (n.nodeType === 1) {
    if (/^(SCRIPT|STYLE|svg)$/i.test(n.nodeName)) return;
    for (const a of ATTRS) if (n.hasAttribute(a)) traduireAttr(n, a);
    for (const c of n.childNodes) traduireNoeud(c);
  }
}

function traduireAttr(el, a) {
  const v = el.getAttribute(a);
  const t = traduire(v);
  if (t !== v) el.setAttribute(a, t);
}

export async function initLangue() {
  document.documentElement.lang = LANGUE;
  if (LANGUE === 'fr') return;
  try {
    dico = (await import(`./i18n/${LANGUE}.js`)).default;
  } catch (e) {
    console.warn('Traduction indisponible', e);
    return;
  }
  preparerMotifs();
  deja = new Set(Object.values(dico));
  // Boîtes de dialogue natives
  const confirmer = window.confirm.bind(window);
  const alerter = window.alert.bind(window);
  window.confirm = (m) => confirmer(traduire(String(m)));
  window.alert = (m) => alerter(traduire(String(m)));
  traduireNoeud(document.documentElement);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') traduireNoeud(m.target);
      else if (m.type === 'attributes') traduireAttr(m.target, m.attributeName);
      else m.addedNodes.forEach(traduireNoeud);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// Graphiques : libellés, légendes, titres d'axe et infobulles sont dessinés sur le canvas, hors du DOM.
export function traduireGraphique(config) {
  if (LANGUE === 'fr' || !config) return config;
  const cb = config.options?.plugins?.tooltip?.callbacks;
  if (cb) {
    for (const [nom, f] of Object.entries(cb)) {
      if (typeof f !== 'function') continue;
      cb[nom] = function (...args) {
        const r = f.apply(this, args);
        const tr = (x) => (typeof x === 'string' ? traduire(x).replace(/ : /g, ': ') : x);
        return Array.isArray(r) ? r.map(tr) : tr(r);
      };
    }
  }
  return config;
}

export const pluginTraduction = {
  id: 'traduction',
  beforeUpdate(ch) {
    if (LANGUE === 'fr' || !dico) return;
    const d = ch.data;
    if (Array.isArray(d.labels)) d.labels = d.labels.map((x) => (typeof x === 'string' ? traduire(x) : x));
    d.datasets.forEach((x) => { if (typeof x.label === 'string') x.label = traduire(x.label); });
    const sc = ch.config?.options?.scales || {};
    Object.values(sc).forEach((s) => { if (s?.title && typeof s.title.text === 'string') s.title.text = traduire(s.title.text); });
  },
};
