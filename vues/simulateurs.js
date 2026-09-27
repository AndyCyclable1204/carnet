import {
  projection, versementPourObjectif, dureePourObjectif, capaciteEmprunt, tableauAmortissement,
  rendementLocatif, simulationSCPI, simulationDividendes, valeurFuture, FISCAL,
} from '../js/finance.js';
import { money, pct, nombre, esc, COULEURS, convertir } from '../js/format.js';
import { SCPI } from '../js/scpi.js';
import { lire } from '../js/store.js';
import {
  $, $$, htmlOnglets, placerIndicateur, graphique, detruireGraphiques, animerNombre, cascade,
  echelleMontant, echelleX, remplissage, degrade,
} from '../js/ui.js';
import { icones } from '../js/icones.js';

const SIMS = [
  { id: 'projection', libelle: 'Projection', titre: 'Projection patrimoniale', texte: "Où mène votre effort d'épargne, crédit compris." },
  { id: 'objectif', libelle: 'Objectif', titre: 'Objectif de patrimoine', texte: 'Combien épargner par mois, ou combien de temps, pour atteindre un montant.' },
  { id: 'credit', libelle: 'Crédit', titre: "Capacité d'emprunt", texte: 'Budget accessible et coût du crédit, revenus en francs suisses compris.' },
  { id: 'locatif', libelle: 'Locatif', titre: 'Rendement locatif', texte: 'Brut, net de charges et net d’impôt, avec la fiscalité du frontalier.' },
  { id: 'scpi', libelle: 'SCPI', titre: 'Simulateur SCPI', texte: 'Revenus, frais d’entrée, délai de jouissance et valeur de retrait.' },
  { id: 'dividendes', libelle: 'Dividendes', titre: 'Rente de dividendes', texte: "L'effet boule de neige d'un portefeuille qui réinvestit ses dividendes." },
];

let actif = 'projection';

export function rendre(vue, sous) {
  actif = SIMS.some((s) => s.id === sous) ? sous : 'projection';
  vue.innerHTML = `
    <div style="margin-bottom:1.2rem"><span class="surtitre">Sans inscription</span><h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">Simulateurs</h1></div>
    ${htmlOnglets(SIMS, actif, 'data-sim')}
    <div id="sim"></div>`;
  const barre = $('.onglets', vue);
  barre.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sim]');
    if (b) location.hash = `#/simulateurs/${b.dataset.sim}`;
  });
  requestAnimationFrame(() => placerIndicateur(barre));
  afficher(false);
}

export function changerSous(sous) {
  const n = SIMS.some((s) => s.id === sous) ? sous : 'projection';
  if (n === actif) return;
  actif = n;
  const barre = $('.onglets');
  $$('[data-sim]', barre).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sim === actif)));
  placerIndicateur(barre);
  afficher(true);
}

function afficher(anime) {
  detruireGraphiques();
  const ancien = $('#sim');
  const el = document.createElement('div');
  el.id = 'sim';
  ancien.replaceWith(el);
  const s = SIMS.find((x) => x.id === actif);
  ({ projection: simProjection, objectif: simObjectif, credit: simCredit, locatif: simLocatif, scpi: simSCPI, dividendes: simDividendes })[actif](el, s);
  if (anime) el.classList.add('panneau-entre');
  cascade(el);
}

/* ------------------------------------------------------------ mécanique commune */

// controles : [{ id, libelle, type: range|number|select|case, min, max, pas, valeur, format, suffixe, options, aide }]
function monter(el, s, controles, resultatsHTML, calculer) {
  el.innerHTML = `
    <div class="grille g-sim" data-cascade>
      <div class="carte collant">
        <div class="carte-tete"><div><h3>${s.titre}</h3><small>${s.texte}</small></div></div>
        ${controles.map(htmlControle).join('')}
      </div>
      <div>${resultatsHTML}</div>
    </div>`;
  const lireV = () => Object.fromEntries(controles.map((c) => {
    const i = $('#' + c.id, el);
    if (c.type === 'case') return [c.id, i.checked];
    if (c.type === 'select') return [c.id, i.value];
    return [c.id, i.value === '' ? 0 : +i.value];
  }));
  const maj = () => {
    const v = lireV();
    controles.forEach((c) => {
      if (c.type !== 'range') return;
      const i = $('#' + c.id, el);
      remplissage(i);
      $(`#${c.id}-v`, el).textContent = c.format ? c.format(v[c.id]) : v[c.id];
    });
    controles.forEach((c) => {
      if (!c.visible) return;
      $(`[data-ctrl="${c.id}"]`, el).hidden = !c.visible(v);
    });
    calculer(v);
  };
  el.addEventListener('input', maj);
  el.addEventListener('change', maj);
  maj();
}

function htmlControle(c) {
  const wrap = (h) => `<div data-ctrl="${c.id}">${h}</div>`;
  if (c.type === 'range') {
    return wrap(`<div class="curseur"><div class="curseur-ligne"><label for="${c.id}">${c.libelle}</label><output id="${c.id}-v"></output></div>
      <input type="range" id="${c.id}" min="${c.min}" max="${c.max}" step="${c.pas || 1}" value="${c.valeur}">${c.aide ? `<small>${c.aide}</small>` : ''}</div>`);
  }
  if (c.type === 'case') {
    return wrap(`<div class="champ"><label class="interrupteur"><input type="checkbox" id="${c.id}" ${c.valeur ? 'checked' : ''}><span></span>${c.libelle}</label>${c.aide ? `<small>${c.aide}</small>` : ''}</div>`);
  }
  if (c.type === 'select') {
    return wrap(`<div class="champ"><label>${c.libelle}<select id="${c.id}">${c.options.map(([v, l]) => `<option value="${v}" ${v === c.valeur ? 'selected' : ''}>${l}</option>`).join('')}</select></label>${c.aide ? `<small>${c.aide}</small>` : ''}</div>`);
  }
  return wrap(`<div class="champ"><label>${c.libelle}<span class="saisie ${c.suffixe ? 'avec-suffixe' : ''}"><input type="number" id="${c.id}" value="${c.valeur}" step="${c.pas || 'any'}" inputmode="decimal">${c.suffixe ? `<i>${c.suffixe}</i>` : ''}</span></label>${c.aide ? `<small>${c.aide}</small>` : ''}</div>`);
}

const resultat = (libelle, id, sous = '', principal = false) =>
  principal
    ? `<div class="carte kpi kpi-principal"><div class="libelle">${libelle}</div><div class="grand-chiffre" id="${id}">—</div><div class="sous" id="${id}-s">${sous}</div></div>`
    : `<div class="carte kpi"><div class="libelle">${libelle}</div><div class="valeur" id="${id}">—</div><div class="sous" id="${id}-s">${sous}</div></div>`;

const tuiles = (...t) => `<div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))">${t.join('')}</div>`;
const cadre = (id, classe = 'haut', note = '') => `<div class="carte" style="margin-top:1rem"><div class="cadre-graphique ${classe}"><canvas id="${id}"></canvas></div>${note ? `<small style="display:block;margin-top:.6rem">${note}</small>` : ''}</div>`;

function graphe(el, id, config) {
  // Canvas recherché au premier tracé : le HTML est injecté par monter() après la création de ce traceur.
  let g = null;
  let canvas = null;
  return (data) => {
    if (!g || !canvas?.isConnected) {
      canvas = $('#' + id, el);
      if (!canvas) return;
      config.data = data(canvas);
      g = graphique(canvas, config);
      return;
    }
    const d = data(canvas);
    g.data.labels = d.labels;
    d.datasets.forEach((x, i) => Object.assign(g.data.datasets[i], { data: x.data, label: x.label ?? g.data.datasets[i].label }, x.borderColor ? { borderColor: x.borderColor } : {}, x.backgroundColor && typeof x.backgroundColor === 'string' || Array.isArray(x.backgroundColor) ? { backgroundColor: x.backgroundColor } : {}));
    g.update();
  };
}

const surface = (canvas, label, data, couleur, extra = {}) => ({
  label, data, borderColor: couleur, backgroundColor: degrade(canvas, couleur, 0.45), fill: true, borderWidth: 1.8, pointRadius: 0, pointHoverRadius: 4, tension: 0.3, ...extra,
});

const optsLigne = (f, empile = true, titreX = 'années') => ({
  responsive: true, maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${f(c.raw)}`, footer: empile ? (i) => 'Total : ' + f(i.reduce((s, x) => s + x.raw, 0)) : undefined } },
  },
  scales: { x: echelleX(titreX), y: echelleMontant({ stacked: empile }) },
});

const pctFmt = (v) => String(v).replace('.', ',') + ' %';
const ansFmt = (v) => v + (v > 1 ? ' ans' : ' an');

/* ------------------------------------------------------------ projection */

function simProjection(el, s) {
  const dev = lire().reglages.devise;
  const f = (v) => money(v, dev);
  const u = dev === 'CHF' ? 'CHF' : '€';
  monter(el, s, [
    { id: 'cap', type: 'range', libelle: 'Capital déjà investi', min: 0, max: 500000, pas: 1000, valeur: 40000, format: f },
    { id: 'ep', type: 'range', libelle: 'Épargne mensuelle', min: 0, max: 6000, pas: 50, valeur: 500, format: (v) => f(v) + '/mois' },
    { id: 'rd', type: 'range', libelle: 'Rendement annuel', min: 0, max: 12, pas: 0.5, valeur: 6, format: pctFmt },
    { id: 'an', type: 'range', libelle: 'Horizon', min: 1, max: 40, valeur: 15, format: ansFmt },
    { id: 'eq', type: 'number', libelle: 'Équité immobilière actuelle', valeur: 0, suffixe: u },
    { id: 'am', type: 'number', libelle: 'Capital de crédit amorti par mois', valeur: 0, suffixe: u, aide: 'La part capital de vos mensualités.' },
  ],
  tuiles(resultat('Patrimoine projeté', 'rTot', '', true), resultat('Versé de votre poche', 'rVer'), resultat('Généré par les marchés', 'rGen')) + cadre('g'),
  (() => {
    const dessiner = graphe(el, 'g', { type: 'line', options: optsLigne(f) });
    return (v) => {
      const r = projection({ capitalInitial: v.cap, epargneMensuelle: v.ep, rendement: v.rd / 100, annees: v.an, amortiMensuel: v.am, equiteImmo: v.eq });
      animerNombre($('#rTot', el), r.total, f);
      $('#rTot-s', el).textContent = `dans ${ansFmt(v.an)}`;
      animerNombre($('#rVer', el), v.cap + v.ep * 12 * v.an, f);
      animerNombre($('#rGen', el), r.rendementGenere, f);
      dessiner((c) => ({
        labels: r.series.map((x) => x.annee),
        datasets: [
          surface(c, 'Immobilier net', r.series.map((x) => x.immobilier), COULEURS.sable),
          surface(c, 'Crédit amorti', r.series.map((x) => x.amorti), COULEURS.lac),
          surface(c, 'Épargne capitalisée', r.series.map((x) => x.financier), COULEURS.sapin),
        ],
      }));
    };
  })());
}

/* ------------------------------------------------------------ objectif */

function simObjectif(el, s) {
  const dev = lire().reglages.devise;
  const f = (v) => money(v, dev);
  const u = dev === 'CHF' ? 'CHF' : '€';
  monter(el, s, [
    { id: 'mode', type: 'select', libelle: 'Je cherche', valeur: 'versement', options: [['versement', 'Le versement mensuel nécessaire'], ['duree', 'Le temps nécessaire']] },
    { id: 'obj', type: 'number', libelle: 'Objectif de patrimoine', valeur: 500000, suffixe: u },
    { id: 'cap', type: 'number', libelle: 'Capital de départ', valeur: 40000, suffixe: u },
    { id: 'an', type: 'range', libelle: 'Horizon', min: 1, max: 40, valeur: 20, format: ansFmt, visible: (v) => v.mode === 'versement' },
    { id: 'vm', type: 'range', libelle: 'Versement mensuel', min: 0, max: 6000, pas: 50, valeur: 800, format: (v) => f(v) + '/mois', visible: (v) => v.mode === 'duree' },
    { id: 'rd', type: 'range', libelle: 'Rendement annuel', min: 0, max: 12, pas: 0.5, valeur: 6, format: pctFmt },
  ],
  tuiles(resultat('Réponse', 'rRep', '', true), resultat('Total versé', 'rVer'), resultat('Part des marchés', 'rPart')) + cadre('g'),
  (() => {
    const dessiner = graphe(el, 'g', { type: 'line', options: optsLigne(f, false) });
    return (v) => {
      const rd = v.rd / 100;
      let vm = v.vm;
      let annees = v.an;
      if (v.mode === 'versement') {
        vm = versementPourObjectif({ objectif: v.obj, capital: v.cap, rendement: rd, annees: v.an });
        animerNombre($('#rRep', el), vm, (x) => f(x));
        $('#rRep-s', el).textContent = `par mois pendant ${ansFmt(v.an)} pour atteindre ${f(v.obj)}`;
      } else {
        const mois = dureePourObjectif({ objectif: v.obj, capital: v.cap, versement: vm, rendement: rd });
        annees = mois == null ? 40 : Math.max(1, Math.ceil(mois / 12));
        $('#rRep', el).textContent = mois == null ? 'Hors d’atteinte' : `${Math.floor(mois / 12)} ans ${mois % 12 ? `et ${mois % 12} mois` : ''}`;
        $('#rRep-s', el).textContent = mois == null ? 'Augmentez le versement ou le rendement.' : `avec ${f(vm)} par mois`;
      }
      const verse = v.cap + vm * 12 * annees;
      animerNombre($('#rVer', el), verse, f);
      $('#rPart', el).textContent = pct(Math.max(0, 1 - verse / Math.max(v.obj, 1)), 0);
      $('#rPart-s', el).textContent = "de l'objectif apporté par les rendements";
      const serie = Array.from({ length: annees + 1 }, (_, a) => valeurFuture({ capital: v.cap, versementMensuel: vm, rendement: rd, mois: a * 12 }));
      dessiner((c) => ({
        labels: serie.map((_, a) => a),
        datasets: [
          surface(c, 'Patrimoine', serie, COULEURS.lac),
          { label: 'Objectif', data: serie.map(() => v.obj), borderColor: COULEURS.alpin, borderDash: [6, 5], borderWidth: 1.8, pointRadius: 0, fill: false },
        ],
      }));
    };
  })());
}

/* ------------------------------------------------------------ crédit */

function simCredit(el, s) {
  const e = lire();
  const f = (v) => money(v, 'EUR');
  monter(el, s, [
    { id: 'devR', type: 'select', libelle: 'Revenus perçus en', valeur: 'CHF', options: [['CHF', 'Francs suisses (CHF)'], ['EUR', 'Euros (EUR)']] },
    { id: 'rev', type: 'number', libelle: 'Revenus nets du foyer, par mois', valeur: 8000 },
    { id: 'decote', type: 'number', libelle: 'Décote appliquée par la banque aux revenus CHF', valeur: 0, suffixe: '%', aide: 'Certaines banques retiennent les salaires suisses avec une marge de sécurité sur le change.', visible: (v) => v.devR === 'CHF' },
    { id: 'ch', type: 'number', libelle: 'Mensualités de crédits en cours', valeur: 0, suffixe: '€' },
    { id: 'tx', type: 'number', libelle: 'Taux du crédit', valeur: 3.3, suffixe: '%', pas: 0.05 },
    { id: 'du', type: 'range', libelle: 'Durée', min: 7, max: 25, valeur: 25, format: ansFmt },
    { id: 'ap', type: 'number', libelle: 'Apport', valeur: 40000, suffixe: '€' },
    { id: 'end', type: 'range', libelle: "Taux d'endettement retenu", min: 25, max: 40, valeur: 35, format: pctFmt, aide: 'Le HCSF fixe 35 % assurance comprise.' },
  ],
  tuiles(resultat("Budget d'achat", 'rBud', '', true), resultat('Capital empruntable', 'rCap'), resultat('Mensualité maximale', 'rMen'), resultat('Coût total des intérêts', 'rInt')) +
  cadre('g', '', 'Répartition capital / intérêts de chaque mensualité sur la durée du prêt.'),
  (() => {
    const dessiner = graphe(el, 'g', {
      type: 'bar',
      options: { ...optsLigne(f), scales: { x: { ...echelleX('années'), stacked: true }, y: echelleMontant({ stacked: true }) } },
    });
    return (v) => {
      const t = lire().reglages.tauxChange;
      const revEUR = v.devR === 'CHF' ? convertir(v.rev, 'CHF', 'EUR', t) * (1 - v.decote / 100) : v.rev;
      const r = capaciteEmprunt({ revenusMensuels: revEUR, chargesCredits: v.ch, tauxAnnuel: v.tx / 100, dureeMois: v.du * 12, tauxEndettement: v.end / 100, apport: v.ap });
      const tab = tableauAmortissement({ capital: r.capital, tauxAnnuel: v.tx / 100, dureeMois: v.du * 12 });
      animerNombre($('#rBud', el), r.budget, f);
      $('#rBud-s', el).textContent = `revenus retenus : ${f(revEUR)} / mois${v.devR === 'CHF' ? ` (taux ${nombre(t, 4)})` : ''}`;
      animerNombre($('#rCap', el), r.capital, f);
      animerNombre($('#rMen', el), r.mensualiteMax, f);
      animerNombre($('#rInt', el), tab.interetsTotaux, f);
      const parAn = [];
      for (let a = 0; a < v.du; a++) {
        const l = tab.lignes.slice(a * 12, a * 12 + 12);
        parAn.push({ c: l.reduce((s, x) => s + x.capital, 0), i: l.reduce((s, x) => s + x.interets, 0) });
      }
      dessiner(() => ({
        labels: parAn.map((_, a) => a + 1),
        datasets: [
          { label: 'Capital remboursé', data: parAn.map((x) => x.c), backgroundColor: COULEURS.lac, borderRadius: 4 },
          { label: 'Intérêts', data: parAn.map((x) => x.i), backgroundColor: COULEURS.alpin, borderRadius: 4 },
        ],
      }));
    };
  })());
}

/* ------------------------------------------------------------ locatif */

function simLocatif(el, s) {
  const e = lire();
  const f = (v) => money(v, 'EUR');
  monter(el, s, [
    { id: 'prix', type: 'number', libelle: 'Prix du bien', valeur: 220000, suffixe: '€' },
    { id: 'frais', type: 'number', libelle: 'Frais de notaire', valeur: 17000, suffixe: '€' },
    { id: 'trav', type: 'number', libelle: 'Travaux', valeur: 0, suffixe: '€' },
    { id: 'mob', type: 'number', libelle: 'Mobilier', valeur: 5000, suffixe: '€', visible: (v) => v.regime === 'lmnp' || v.regime === 'microbic', aide: 'Location meublée : équipement obligatoire (literie, cuisine équipée…).' },
    { id: 'loyer', type: 'number', libelle: 'Loyer hors charges, par mois', valeur: 950, suffixe: '€' },
    { id: 'charges', type: 'number', libelle: 'Charges non récupérables / an', valeur: 1200, suffixe: '€' },
    { id: 'tf', type: 'number', libelle: 'Taxe foncière', valeur: 1100, suffixe: '€' },
    { id: 'vac', type: 'range', libelle: 'Vacance locative', min: 0, max: 20, valeur: 4, format: pctFmt },
    { id: 'regime', type: 'select', libelle: 'Régime fiscal', valeur: 'micro', options: [['micro', 'Nu — micro-foncier (−30 %)'], ['reel', 'Nu — réel (charges)'], ['microbic', 'LMNP — micro-BIC (−50 %)'], ['lmnp', 'LMNP — réel (amortissement)']] },
    { id: 'terrain', type: 'range', libelle: 'Part du terrain (non amortissable)', min: 0, max: 40, valeur: 15, format: pctFmt, visible: (v) => v.regime === 'lmnp', aide: 'Souvent 10 à 20 % en appartement, davantage en maison.' },
    { id: 'tmi', type: 'select', libelle: "Tranche marginale d'imposition", valeur: '0.3', options: [['0', '0 %'], ['0.11', '11 %'], ['0.3', '30 %'], ['0.41', '41 %'], ['0.45', '45 %']] },
    { id: 'front', type: 'case', libelle: 'Frontalier exonéré de CSG/CRDS', valeur: e.reglages.frontalier },
  ],
  tuiles(resultat('Rendement net-net', 'rNN', '', true), resultat('Rendement brut', 'rB'), resultat('Net de charges', 'rN'), resultat('Cash-flow mensuel', 'rCF')) +
  `<div class="carte" style="margin-top:1rem"><div class="cadre-graphique bas"><canvas id="g"></canvas></div><div id="rNote" style="margin-top:.6rem"></div></div>`,
  (() => {
    const dessiner = graphe(el, 'g', {
      type: 'bar',
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => f(c.raw) } } }, scales: { x: echelleMontant(), y: { grid: { display: false }, border: { display: false } } } },
    });
    return (v) => {
      const r = rendementLocatif({ prix: v.prix, frais: v.frais, travaux: v.trav, mobilier: v.mob, loyerMensuel: v.loyer, chargesAnnuelles: v.charges, taxeFonciere: v.tf, vacance: v.vac / 100, tmi: +v.tmi, regime: v.regime, frontalier: v.front, partTerrain: v.terrain / 100 });
      if (!r) return;
      $('#rNN', el).textContent = pct(r.netNet);
      $('#rNN-s', el).textContent = `après ${f(r.impot)} d'impôt et de prélèvements par an`;
      $('#rB', el).textContent = pct(r.brut);
      $('#rN', el).textContent = pct(r.net);
      animerNombre($('#rCF', el), r.cashflowMensuel, f);
      $('#rCF-s', el).textContent = 'avant crédit';
      const meuble = v.regime === 'lmnp' || v.regime === 'microbic';
      const a = r.amort;
      const blocLMNP = a ? `<div class="encart info" style="margin-bottom:.6rem"><p>
          <b>${f(a.annuel)} d'amortissements par an</b> (bien ${f(a.detail.bati)}${v.trav ? `, travaux ${f(a.detail.travaux)}` : ''}${v.mob ? `, mobilier ${f(a.detail.mobilier)}` : ''}).
          ${a.serie[0].base > 0.5 ? `Ils ne couvrent pas tout le résultat : ${f(a.serie[0].base)} restent imposables dès la 1<sup>re</sup> année.` : `Impôt et prélèvements <b>nuls ${a.auDela ? 'pendant plus de 40 ans' : `pendant environ ${a.anneesSansImpot} ans`}</b> à loyer constant, l'excédent d'amortissement étant reporté.`}
          </p></div>` : '';
      $('#rNote', el).innerHTML = `${blocLMNP}<small>Prélèvements sociaux ${meuble ? 'en location meublée' : 'sur les revenus fonciers'} : ${pct(r.tauxPS, 1)}${v.front ? ' (prélèvement de solidarité seul)' : ''}.
        ${(v.regime === 'micro' || v.regime === 'microbic') && !r.microEligible ? `<b class="neg">Régime micro réservé aux loyers inférieurs à ${f(r.plafondMicro)} par an.</b>` : ''}
        ${v.regime === 'lmnp' ? "Depuis le 15 février 2025, les amortissements déduits sont réintégrés dans la plus-value imposable à la revente. Comptable conseillé (≈ 400 à 800 €/an, non inclus). " : ''}Intérêts d'emprunt non pris en compte.</small>`;
      dessiner(() => ({
        labels: ['Loyers encaissés', 'Charges et taxe', 'Impôt et prélèvements', 'Revenu net'],
        datasets: [{ data: [r.loyerAnnuel, r.charges, r.impot, r.loyerAnnuel - r.charges - r.impot], backgroundColor: [COULEURS.lac, COULEURS.sable, COULEURS.alpin, COULEURS.sapin], borderRadius: 6, barPercentage: 0.7 }],
      }));
    };
  })());
}

/* ------------------------------------------------------------ SCPI */

function simSCPI(el, s) {
  const e = lire();
  const f = (v) => money(v, 'EUR');
  // SCPI présélectionnée depuis le classement
  let choix = sessionStorage.getItem('scpi-choisie') || 'perso';
  sessionStorage.removeItem('scpi-choisie');
  const sc = SCPI.find((x) => x.nom === choix);
  if (!sc) choix = 'perso';
  const d = sc || { td: 0.06, frais: 0.1, fg: 0.12, etr: 0, impEtr: 0.15, dj: 4 };
  const r1 = (x) => Math.round(x * 1000) / 10;
  const r2 = (x) => Math.round(x * 10000) / 100;

  monter(el, s, [
    { id: 'choix', type: 'select', libelle: 'SCPI', valeur: choix, options: [['perso', 'Paramètres libres'], ...SCPI.map((x) => [x.nom, `${x.nom} — ${pct(x.td)}`])], aide: 'Choisir une SCPI du classement remplit ses caractéristiques (modifiables).' },
    { id: 'mt', type: 'number', libelle: 'Montant souscrit', valeur: 20000, suffixe: '€' },
    { id: 'td', type: 'range', libelle: 'Taux de distribution', min: 3, max: 16, pas: 0.05, valeur: r2(d.td), format: pctFmt, aide: 'Déjà net des frais de gestion, avant impôts.' },
    { id: 'fe', type: 'range', libelle: "Frais d'entrée (TTC)", min: 0, max: 14, pas: 0.1, valeur: r1(d.frais), format: pctFmt },
    { id: 'fg', type: 'range', libelle: 'Frais de gestion (TTC, en % des loyers)', min: 0, max: 25, pas: 0.1, valeur: r1(d.fg), format: pctFmt },
    { id: 'rv', type: 'range', libelle: 'Revalorisation annuelle du prix de part', min: -3, max: 3, pas: 0.25, valeur: 0.5, format: pctFmt },
    { id: 'dj', type: 'range', libelle: 'Délai de jouissance', min: 0, max: 6, valeur: d.dj, format: (v) => v + ' mois' },
    { id: 'an', type: 'range', libelle: 'Durée de détention', min: 3, max: 25, valeur: 10, format: ansFmt },
    { id: 'pe', type: 'range', libelle: 'Revenus de source étrangère', min: 0, max: 100, pas: 5, valeur: Math.round(d.etr * 100), format: pctFmt },
    { id: 'ie', type: 'range', libelle: "Impôt payé à l'étranger", min: 0, max: 35, pas: 0.5, valeur: r1(d.impEtr), format: pctFmt, visible: (v) => v.pe > 0, aide: 'Prélevé à la source par la SCPI, variable selon les pays (souvent 10 à 20 %).' },
    { id: 'cr', type: 'case', libelle: 'Financer à crédit', valeur: false },
    { id: 'ap', type: 'number', libelle: 'Apport personnel', valeur: 0, suffixe: '€', visible: (v) => v.cr },
    { id: 'tx', type: 'range', libelle: 'Taux du crédit', min: 1, max: 7, pas: 0.05, valeur: 3.6, format: pctFmt, visible: (v) => v.cr },
    { id: 'du', type: 'range', libelle: 'Durée du crédit', min: 5, max: 25, valeur: 15, format: ansFmt, visible: (v) => v.cr },
    { id: 'as', type: 'range', libelle: 'Assurance emprunteur (par an)', min: 0, max: 0.6, pas: 0.01, valeur: 0.25, format: pctFmt, visible: (v) => v.cr },
    { id: 'tmi', type: 'select', libelle: "Tranche marginale d'imposition", valeur: '0.3', options: [['0', '0 %'], ['0.11', '11 %'], ['0.3', '30 %'], ['0.41', '41 %'], ['0.45', '45 %']] },
    { id: 'front', type: 'case', libelle: 'Frontalier exonéré de CSG/CRDS', valeur: e.reglages.frontalier },
    { id: 'rei', type: 'case', libelle: 'Réinvestir les revenus', valeur: false, visible: (v) => !v.cr },
  ],
  tuiles(resultat('Revenu mensuel net', 'rMen', '', true), resultat('Cash-flow mensuel', 'rCF'), resultat('Patrimoine net final', 'rRet'), resultat('Rendement annualisé', 'rRdt')) +
  `<div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));margin-top:1rem">
     <div class="carte"><div class="carte-tete"><h3>Détail des frais</h3></div><div id="cFrais"></div></div>
     <div class="carte"><div class="carte-tete"><h3>Fiscalité France et hors France</h3><span class="badge" id="cTaux"></span></div><div id="cFisc"></div></div>
   </div>` +
  cadre('g', 'haut'),
  (() => {
    const dessiner = graphe(el, 'g', { type: 'line', options: { ...optsLigne(f, false) } });
    const ligne = (l, v, cls = '') => `<div class="entre-deux ligne-detail ${cls}"><span>${l}</span><b>${v}</b></div>`;
    return (v) => {
      const credit = v.cr ? { montant: Math.max(0, v.mt - v.ap), taux: v.tx / 100, annees: v.du, assurance: v.as / 100 } : null;
      const r = simulationSCPI({
        montant: v.mt, fraisEntree: v.fe / 100, td: v.td / 100, revalo: v.rv / 100, annees: v.an, delaiJouissanceMois: v.dj,
        tmi: +v.tmi, frontalier: v.front, reinvestir: v.rei && !v.cr, fraisGestion: v.fg / 100,
        partEtranger: v.pe / 100, impotEtranger: v.ie / 100, credit,
      });
      const fi = r.fiscalite;
      animerNombre($('#rMen', el), r.revenuMensuelNet, f);
      $('#rMen-s', el).textContent = `${f(r.revenuMensuelBrut)} distribués, ${pct(r.tauxImposition, 1)} d'impôts`;
      animerNombre($('#rCF', el), v.cr ? r.cashflowMensuel : r.revenuMensuelNet, f);
      $('#rCF-s', el).textContent = v.cr
        ? (r.cashflowMensuel < 0 ? `effort d'épargne, mensualité ${f(r.mensualite + r.assuranceMensuelle)}` : `après mensualité de ${f(r.mensualite + r.assuranceMensuelle)}`)
        : v.rei ? 'réinvestis en nouvelles parts' : 'sans crédit';
      animerNombre($('#rRet', el), r.patrimoineNetFinal, f);
      $('#rRet-s', el).textContent = v.cr ? `valeur de retrait ${f(r.valeurRetraitFinale)} − ${f(r.crdFinal)} restant dû` : `valeur de retrait après ${ansFmt(v.an)}`;
      $('#rRdt', el).textContent = r.rendementAnnualise == null ? '—' : pct(r.rendementAnnualise);
      $('#rRdt-s', el).textContent = v.cr ? (r.rendementAnnualise == null ? 'non calculable : aucun argent sorti de votre poche' : 'sur votre apport et vos efforts, crédit compris') : 'frais, fiscalité et revente compris';

      $('#cFrais', el).innerHTML =
        ligne(`Frais d'entrée (${pctFmt(v.fe)})`, `${f(r.fraisEntreeMontant)}`) +
        `<small class="bloc-aide">Payés une fois : 1 € souscrit ne vaut que ${nombre(1 - v.fe / 100, 3).replace('.', ',')} € en valeur de retrait. Il faut environ ${v.td > 0 ? Math.max(0, Math.ceil((v.fe / 100) / (v.td / 100 * (1 - r.tauxImposition)))) : '—'} ans de revenus nets pour les compenser.</small>` +
        ligne(`Frais de gestion (${pctFmt(v.fg)} des loyers)`, `≈ ${f(r.gestionAnnuelle)} / an`) +
        `<small class="bloc-aide">Prélevés par la société de gestion sur les loyers, avant distribution : ils sont déjà déduits du taux de distribution affiché.</small>` +
        (sc?.sortie ? ligne('Frais de sortie', esc(sc.sortie)) : '') +
        (v.cr ? ligne('Intérêts et assurance du crédit', `${f(r.cumulInterets)} sur ${ansFmt(v.an)}`) : '') +
        ligne(`Total frais et impôts sur ${ansFmt(v.an)}`, f(r.fraisEntreeMontant + r.cumulGestion + r.cumulImpots + (v.cr ? r.cumulInterets : 0)), 'total');

      $('#cTaux', el).textContent = `${pct(r.tauxImposition, 1)} au global`;
      const tauxFR = +v.tmi + fi.tauxPS;
      $('#cFisc', el).innerHTML = `
        <div class="table-cadre"><table class="table-fisc">
          <thead><tr><th></th><th class="nb">France</th><th class="nb">Hors France</th></tr></thead>
          <tbody>
            <tr><td>Revenus annuels</td><td class="nb">${f(fi.brutFR)}</td><td class="nb">${f(fi.brutETR)}</td></tr>
            <tr><td>Impôt étranger</td><td class="nb">—</td><td class="nb">${fi.brutETR ? `${f(fi.impotETR)} <small>${pctFmt(v.ie)}</small>` : '—'}</td></tr>
            <tr><td>Impôt sur le revenu</td><td class="nb">${f(fi.irFR)} <small>TMI ${pct(+v.tmi, 0)}</small></td><td class="nb">${fi.brutETR ? '0 €' : '—'}</td></tr>
            <tr><td>Prélèvements sociaux</td><td class="nb">${f(fi.psFR)} <small>${pct(fi.tauxPS, 1)}</small></td><td class="nb">${fi.brutETR ? '0 €' : '—'}</td></tr>
            <tr class="total"><td>Taux d'imposition</td><td class="nb">${fi.brutFR ? pct(v.cr ? (fi.irFR + fi.psFR) / fi.brutFR : tauxFR, 1) : '—'}</td><td class="nb">${fi.brutETR ? pctFmt(v.ie) : '—'}</td></tr>
          </tbody></table></div>
        <small class="bloc-aide">Revenus français : revenus fonciers imposés au barème et aux prélèvements sociaux${v.front ? ' (7,5 % pour un frontalier exonéré de CSG/CRDS)' : ''}${v.cr ? ', après déduction de la part française des intérêts' : ''}.
        Revenus étrangers : imposés dans le pays de l'immeuble ; les conventions fiscales évitent la double imposition (crédit d'impôt égal à l'impôt français ou exonération) et ils échappent aux prélèvements sociaux. Ils restent à déclarer (formulaire 2047) et relèvent légèrement le taux d'imposition de vos autres revenus (règle du taux effectif, non chiffrée ici).
        Le régime micro-foncier n'est ouvert aux SCPI que si vous louez aussi un bien en direct.</small>`;

      dessiner(() => ({
        labels: r.serie.map((x) => x.annee),
        datasets: [
          { label: 'Valeur de retrait', data: r.serie.map((x) => x.valeurRetrait), borderColor: COULEURS.lac, backgroundColor: COULEURS.lac, borderWidth: 2.2, pointRadius: 0, tension: 0.25 },
          { label: v.cr ? 'Capital restant dû' : 'Revenus nets cumulés', data: r.serie.map((x) => (v.cr ? x.crd : x.cumulNet)), borderColor: v.cr ? COULEURS.alpin : COULEURS.sapin, backgroundColor: v.cr ? COULEURS.alpin : COULEURS.sapin, borderWidth: 2.2, pointRadius: 0, tension: 0.25 },
          { label: v.cr ? 'Patrimoine net (retrait − dette)' : 'Total (retrait + revenus)', data: r.serie.map((x) => (v.cr ? x.patrimoineNet : x.valeurRetrait + x.cumulNet)), borderColor: COULEURS.nuit, backgroundColor: COULEURS.nuit, borderWidth: 2.2, borderDash: [5, 4], pointRadius: 0, tension: 0.25 },
        ],
      }));
    };
  })());

  // Choix d'une SCPI : pré-remplit ses caractéristiques.
  $('#choix', el).addEventListener('change', (ev) => {
    const x = SCPI.find((y) => y.nom === ev.target.value);
    if (!x) return;
    const regler = (id, val) => { const i = $('#' + id, el); if (i) i.value = val; };
    regler('td', r2(x.td)); regler('fe', r1(x.frais)); regler('fg', r1(x.fg)); regler('dj', x.dj ?? 4);
    regler('pe', Math.round((x.etr ?? 0) * 100)); regler('ie', r1(x.impEtr ?? 0.15));
    $('#td', el).dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/* ------------------------------------------------------------ dividendes */

function simDividendes(el, s) {
  const e = lire();
  const dev = e.reglages.devise;
  const f = (v) => money(v, dev);
  const u = dev === 'CHF' ? 'CHF' : '€';
  monter(el, s, [
    { id: 'cap', type: 'number', libelle: 'Capital investi', valeur: 20000, suffixe: u },
    { id: 'ap', type: 'range', libelle: 'Apport mensuel', min: 0, max: 3000, pas: 50, valeur: 300, format: (v) => f(v) + '/mois' },
    { id: 'rd', type: 'range', libelle: 'Rendement du dividende', min: 1, max: 9, pas: 0.25, valeur: 4, format: pctFmt },
    { id: 'cd', type: 'range', libelle: 'Croissance annuelle du dividende', min: 0, max: 10, pas: 0.5, valeur: 4, format: pctFmt },
    { id: 'cc', type: 'range', libelle: 'Progression annuelle du cours', min: 0, max: 8, pas: 0.5, valeur: 3, format: pctFmt },
    { id: 'an', type: 'range', libelle: 'Durée', min: 5, max: 40, valeur: 20, format: ansFmt },
    { id: 'env', type: 'select', libelle: 'Enveloppe', valeur: 'PEA', options: [['PEA', 'PEA (dividendes non imposés tant qu’ils restent dans le plan)'], ['CTO', 'Compte titres (flat tax)']] },
    { id: 'front', type: 'case', libelle: 'Frontalier exonéré de CSG/CRDS', valeur: e.reglages.frontalier, visible: (v) => v.env === 'CTO' },
    { id: 'rei', type: 'case', libelle: 'Réinvestir les dividendes', valeur: true },
  ],
  tuiles(resultat('Dividendes nets la dernière année', 'rAn', '', true), resultat('Soit par mois', 'rMois'), resultat('Valeur du portefeuille', 'rVal'), resultat('Dividendes nets cumulés', 'rCum')) +
  cadre('g', 'haut', 'Dividendes annuels nets. Rendement et croissance constants : la réalité est plus irrégulière. Les dividendes étrangers peuvent subir une retenue à la source non modélisée.'),
  (() => {
    const dessiner = graphe(el, 'g', {
      type: 'bar',
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => `Année ${i[0].label}`, label: (c) => `Dividendes nets : ${f(c.raw)}` } } }, scales: { x: echelleX('années'), y: echelleMontant() } },
    });
    return (v) => {
      const r = simulationDividendes({ capital: v.cap, apportMensuel: v.ap, rendement: v.rd / 100, croissanceDividende: v.cd / 100, croissanceCours: v.cc / 100, annees: v.an, reinvestir: v.rei, enveloppe: v.env, frontalier: v.front });
      animerNombre($('#rAn', el), r.dividendeAnnuelFinal, f);
      $('#rAn-s', el).textContent = r.taxe ? `après ${pct(r.taxe, 1)} de flat tax` : 'dans le PEA, sans imposition';
      animerNombre($('#rMois', el), r.dividendeMensuelFinal, f);
      animerNombre($('#rVal', el), r.valeurFinale, f);
      $('#rVal-s', el).textContent = `pour ${f(r.verse)} versés`;
      animerNombre($('#rCum', el), r.cumul, f);
      dessiner(() => ({
        labels: r.serie.map((x) => x.annee),
        datasets: [{ label: 'Dividendes nets', data: r.serie.map((x) => x.net), backgroundColor: r.serie.map((_, i) => `rgba(21,128,61,${0.35 + (0.65 * i) / r.serie.length})`), borderRadius: 5 }],
      }));
    };
  })());
}
