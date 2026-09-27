import { lire, modifier, bilan, reinitialiser } from '../js/store.js';
import { projection, projectionLPP, projectionCapital } from '../js/finance.js';
import { money, pct, dateFr, COULEURS, esc  } from '../js/format.js';
import {
  $, $$, htmlOnglets, placerIndicateur, graphique, detruireGraphiques, animerNombre,
  cascade, echelleMontant, echelleX, htmlCurseur, remplissage, toast, degrade,
} from '../js/ui.js';
import { icones } from '../js/icones.js';
import { panneauImmobilier, panneauPlacements } from './patrimoine-actifs.js';
import { panneauPrevoyance } from './prevoyance.js';

const ONGLETS = [
  { id: 'synthese', libelle: 'Synthèse' },
  { id: 'immobilier', libelle: 'Immobilier & crédits' },
  { id: 'placements', libelle: 'Placements' },
  { id: 'prevoyance', libelle: 'Prévoyance suisse' },
  { id: 'historique', libelle: 'Historique' },
];

let racine;
let actif = 'synthese';
let premier = true;

export function rendre(vue, sous) {
  actif = ONGLETS.some((o) => o.id === sous) ? sous : 'synthese';
  vue.innerHTML = `
    <div class="entre-deux" style="margin-bottom:1.2rem">
      <div><span class="surtitre">Tableau de bord</span><h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">Mon patrimoine</h1></div>
      <span class="badge" title="Aucune donnée n'est envoyée à un serveur">${icones.cadenas.replace('<svg', '<svg width="13" height="13"')} Stocké uniquement dans ce navigateur</span>
    </div>
    ${htmlOnglets(ONGLETS, actif)}
    <div id="panneau"></div>`;
  racine = $('#panneau', vue);
  premier = true;
  const barre = $('.onglets', vue);
  barre.addEventListener('click', (e) => {
    const b = e.target.closest('[data-onglet]');
    if (b) location.hash = `#/patrimoine/${b.dataset.onglet}`;
  });
  requestAnimationFrame(() => placerIndicateur(barre));
  afficherPanneau(false);
}

export function changerSous(sous) {
  const nouveau = ONGLETS.some((o) => o.id === sous) ? sous : 'synthese';
  if (nouveau === actif) return;
  actif = nouveau;
  const barre = $('.onglets');
  $$('[data-onglet]', barre).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.onglet === actif)));
  placerIndicateur(barre);
  afficherPanneau(true);
}

// Redessine le panneau courant (après une modification de données).
export function rafraichir() {
  afficherPanneau(false);
}

function afficherPanneau(anime) {
  detruireGraphiques();
  const neuf = document.createElement('div');
  neuf.id = 'panneau';
  racine.replaceWith(neuf);
  racine = neuf;
  const f = { synthese, immobilier: panneauImmobilier, placements: panneauPlacements, prevoyance: panneauPrevoyance, historique }[actif];
  f(racine, rafraichir);
  if (anime) racine.classList.add('panneau-entre');
  if (anime || premier) cascade(racine);
  premier = false;
}

/* ================================================================ synthèse */

function synthese(el) {
  const e = lire();
  const b = bilan(e);
  const dev = b.devise;
  const f = (v) => money(v, dev);
  const dernier = e.historique.at(-1);
  const netHisto = dernier ? (dev === 'CHF' ? dernier.netCHF : dernier.netEUR) : null;
  const pos = (d) => Math.max(0, b.parDevise[d] || 0);
  const totalDevise = Math.max(1, pos('EUR') + pos('CHF') + pos('USD'));
  const partCHF = pos('CHF') / totalDevise;
  const partUSD = pos('USD') / totalDevise;
  const partEUR = Math.max(0, 1 - partCHF - partUSD);

  el.innerHTML = `
    ${e.exemple ? `<div class="encart info" style="margin-bottom:1rem">${icones.info.replace('<svg', '<svg width="18" height="18" style="flex:none"')}
      <p>Vous voyez un <b>PEA d'exemple</b> (40 000 €, 300 €/mois, 7 %). Modifiez-le dans <a href="#/patrimoine/placements">Placements</a>, ou <a href="#" data-action="vider">partez d'une page blanche</a>.</p></div>` : ''}

    <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))" data-cascade>
      <div class="carte kpi kpi-principal" style="grid-row:span 2">
        <div class="libelle">Patrimoine net</div>
        <div class="grand-chiffre" id="kNet">${f(0)}</div>
        <div class="sous">${netHisto != null ? `<span class="delta ${b.net - netHisto < 0 ? 'neg' : ''}">${b.net - netHisto >= 0 ? '+' : '−'} ${f(Math.abs(b.net - netHisto))}</span> depuis le point du ${dateFr(dernier.date)}` : 'Enregistrez un point dans Historique pour suivre son évolution.'}</div>
        <div style="margin-top:1.4rem">
          <div class="entre-deux" style="font-size:.82rem;color:#b9cbe0"><span><span class="devise eur">EUR</span> ${pct(partEUR, 0)}</span>${partUSD > 0 ? `<span><span class="devise usd">USD</span> ${pct(partUSD, 0)}</span>` : ''}<span>${pct(partCHF, 0)} <span class="devise chf">CHF</span></span></div>
          <div class="barre-repartition" style="background:rgba(255,255,255,.12)"><i style="width:${partEUR * 100}%;background:#5b9bd5"></i>${partUSD > 0 ? `<i style="width:${partUSD * 100}%;background:#9b8ff0"></i>` : ''}<i style="width:${partCHF * 100}%;background:var(--alpin)"></i></div>
          <small style="color:#8fa6bf">Exposition de votre patrimoine net par devise</small>
        </div>
      </div>
      ${kpi('Immobilier net', b.equiteImmo, f, `${f(b.immobilier)} de biens · ${f(b.dette)} de dette`, icones.maison, 'var(--sable-clair)', '#8a6414')}
      ${kpi('Placements', b.placements, f, `${f(b.versementsMensuels)} versés chaque mois`, icones.enveloppe, 'var(--sapin-clair)', 'var(--sapin)')}
      ${kpi('Prévoyance suisse', b.prevoyance, f, `LPP ${f(b.lpp)} · 3e pilier ${f(b.pilier3)}${e.reglages.inclurePrevoyance ? '' : ' · hors total'}`, icones.bouclier, 'var(--alpin-clair)', 'var(--alpin)')}
      ${kpi('Capital amorti / mois', b.amortiMensuel, f, 'part capital de vos mensualités', icones.credit, 'var(--lac-clair)', 'var(--lac)')}
    </div>

    <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));margin-top:1rem" data-cascade>
      <div class="carte">
        <div class="carte-tete"><h3>Répartition</h3></div>
        <div class="cadre-graphique bas"><canvas id="gRep"></canvas></div>
      </div>
      <div class="carte">
        <div class="carte-tete"><h3>Projection à partir de vos chiffres</h3></div>
        <div class="duo">
          <label class="champ">Épargne mensuelle<span class="saisie avec-suffixe"><input type="number" id="pjEp" value="${Math.round(b.versementsMensuels)}"><i>${dev === 'CHF' ? 'CHF' : '€'}</i></span></label>
          <label class="champ">Rendement placements<span class="saisie avec-suffixe"><input type="number" id="pjRd" step="0.5" value="${+(b.rendementMoyen * 100).toFixed(1)}"><i>%</i></span></label>
        </div>
        ${htmlCurseur({ id: 'pjAn', libelle: 'Horizon', min: 1, max: 40, valeur: 15 })}
        <p style="margin:.6rem 0 0">Patrimoine net projeté : <b id="pjTot" style="font-size:1.15rem">—</b></p>
      </div>
    </div>
    <div class="carte" style="margin-top:1rem">
      <div class="cadre-graphique haut"><canvas id="gProj"></canvas></div>
      <small>Immobilier : équité actuelle, sans revalorisation. Prévoyance : LPP projetée selon votre âge et vos réglages, 3<sup>e</sup> pilier selon vos contrats. Hypothèses constantes, résultats indicatifs.</small>
    </div>`;

  animerNombre($('#kNet', el), b.net, f);
  $$('[data-kpi]', el).forEach((n) => animerNombre(n, +n.dataset.kpi, f));

  el.querySelector('[data-action="vider"]')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (confirm("Effacer l'exemple et repartir d'une page blanche ?")) {
      reinitialiser(true);
      rafraichir();
    }
  });

  graphique($('#gRep', el), {
    type: 'doughnut',
    data: {
      labels: ['Immobilier net', 'Placements', 'Prévoyance suisse'],
      datasets: [{ data: [Math.max(0, b.equiteImmo), b.placements, b.prevoyance], backgroundColor: [COULEURS.sable, COULEURS.sapin, COULEURS.alpin], borderWidth: 3, borderColor: '#fff', hoverOffset: 8 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: (c) => `${c.label} : ${f(c.raw)}` } },
      },
    },
  });

  // Projection empilée.
  const canvas = $('#gProj', el);
  let g;
  const maj = () => {
    const annees = +$('#pjAn', el).value;
    remplissage($('#pjAn', el));
    $('#pjAn-v', el).textContent = `${annees} ans`;
    const p = projection({
      capitalInitial: b.placements,
      epargneMensuelle: +$('#pjEp', el).value || 0,
      rendement: (+$('#pjRd', el).value || 0) / 100,
      annees,
      amortiMensuel: b.amortiMensuel,
      equiteImmo: b.equiteImmo,
    });
    const prev = serieprevoyance(e, annees, dev);
    const total = p.series[annees].total + prev[annees];
    animerNombre($('#pjTot', el), total, f);

    const data = {
      labels: p.series.map((x) => x.annee),
      datasets: [
        couche('Immobilier net', p.series.map((x) => x.immobilier), COULEURS.sable, canvas),
        couche('Crédit amorti', p.series.map((x) => x.amorti), COULEURS.lac, canvas),
        couche('Prévoyance suisse', prev, COULEURS.alpin, canvas),
        couche('Placements', p.series.map((x) => x.financier), COULEURS.sapin, canvas),
      ],
    };
    if (g) {
      g.data.labels = data.labels;
      data.datasets.forEach((d, i) => (g.data.datasets[i].data = d.data));
      g.update();
      return;
    }
    g = graphique(canvas, {
      type: 'line',
      data,
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: (i) => `Dans ${i[0].label} an${+i[0].label > 1 ? 's' : ''}`,
              label: (c) => `${c.dataset.label} : ${f(c.raw)}`,
              footer: (i) => 'Total : ' + f(i.reduce((s, x) => s + x.raw, 0)),
            },
          },
        },
        scales: { x: echelleX('années'), y: echelleMontant({ stacked: true }) },
      },
    });
  };
  ['pjEp', 'pjRd', 'pjAn'].forEach((id) => $('#' + id, el).addEventListener('input', maj));
  maj();
}

function serieprevoyance(e, annees, dev) {
  const t = e.reglages.tauxChange;
  const versDev = (chf) => (dev === 'CHF' ? chf : chf / t);
  const age = +e.reglages.age || 30;
  const out = new Array(annees + 1).fill(0);
  if (e.lpp.actif) {
    const l = projectionLPP({ ...e.lpp, progressionSalaire: +e.lpp.progression || 0, age, avoir: +e.lpp.avoir || 0, salaire: +e.lpp.salaire || 0, ageRetraite: Math.max(age + annees, e.lpp.ageRetraite) });
    for (let a = 0; a <= annees; a++) {
      // au-delà de l'âge de retraite, l'avoir est figé (rente ou capital versé)
      const idx = Math.min(a, Math.max(0, e.lpp.ageRetraite - age));
      out[a] += versDev(l.serie[idx]?.avoir || 0);
    }
  }
  e.pilier3.forEach((c) => {
    const s = projectionCapital({ capital: +c.capital || 0, versementAnnuel: +c.versementAnnuel || 0, rendement: +c.rendement || 0, annees }).serie;
    s.forEach((x, a) => (out[a] += versDev(x.valeur)));
  });
  if (!e.reglages.inclurePrevoyance) return out.map(() => 0);
  return out;
}

const couche = (label, data, couleur, canvas) => ({
  label, data, borderColor: couleur, backgroundColor: degrade(canvas, couleur, 0.5),
  fill: true, borderWidth: 1.6, pointRadius: 0, pointHoverRadius: 4, tension: 0.3,
});

const kpi = (libelle, valeur, f, sous, icone, fond, couleur) => `
  <div class="carte kpi">
    <div class="libelle"><span class="pastille-icone" style="width:28px;height:28px;border-radius:8px;background:${fond};color:${couleur}">${icone}</span>${libelle}</div>
    <div class="valeur" data-kpi="${valeur}">${f(0)}</div>
    <div class="sous">${esc(sous)}</div>
  </div>`;

/* ================================================================ historique */

function historique(el) {
  const e = lire();
  const dev = e.reglages.devise;
  const f = (v) => money(v, dev);
  const h = e.historique;
  const val = (p, k) => (dev === 'CHF' ? p[k + 'CHF'] : p[k + 'EUR']);

  el.innerHTML = `
    <div class="carte">
      <div class="carte-tete">
        <div><h3>Évolution de votre patrimoine net</h3><small>Un point par date. Enregistrer deux fois le même jour remplace le point.</small></div>
        <button class="btn" id="pointer">${icones.plus.replace('<svg', '<svg width="16" height="16"')} Enregistrer un point</button>
      </div>
      ${h.length ? '<div class="cadre-graphique haut"><canvas id="gHist"></canvas></div>' : `<div class="vide">${icones.histoire}<p>Aucun point pour l'instant. Le premier fixe votre point de départ.</p></div>`}
    </div>
    ${h.length ? `<div class="carte" style="margin-top:1rem"><div class="table-cadre"><table>
      <thead><tr><th>Date</th><th class="nb">Immobilier net</th><th class="nb">Placements</th><th class="nb">Prévoyance</th><th class="nb">Net</th><th class="nb">Évolution</th><th></th></tr></thead>
      <tbody>${[...h].reverse().map((p, i, arr) => {
        const prec = arr[i + 1];
        const d = prec ? val(p, 'net') - val(prec, 'net') : null;
        return `<tr><td>${dateFr(p.date)}</td><td class="nb">${f(val(p, 'immo'))}</td><td class="nb">${f(val(p, 'plac'))}</td><td class="nb">${f(val(p, 'prev'))}</td>
          <td class="nb"><b>${f(val(p, 'net'))}</b></td><td class="nb ${d < 0 ? 'neg' : 'pos'}">${d === null ? '—' : (d >= 0 ? '+' : '−') + f(Math.abs(d))}</td>
          <td class="nb"><button class="icone-btn" data-suppr="${p.date}" title="Supprimer ce point">✕</button></td></tr>`;
      }).join('')}</tbody></table></div></div>` : ''}`;

  $('#pointer', el).addEventListener('click', () => {
    const bE = bilan(lire(), 'EUR');
    const bC = bilan(lire(), 'CHF');
    const date = new Date().toISOString().slice(0, 10);
    modifier((s) => {
      s.historique = s.historique.filter((p) => p.date !== date);
      s.historique.push({
        date,
        netEUR: bE.net, netCHF: bC.net,
        immoEUR: bE.equiteImmo, immoCHF: bC.equiteImmo,
        placEUR: bE.placements, placCHF: bC.placements,
        prevEUR: bE.prevoyance, prevCHF: bC.prevoyance,
        taux: s.reglages.tauxChange,
      });
      s.historique.sort((a, b) => a.date.localeCompare(b.date));
    });
    toast('Point enregistré', 'succes');
    rafraichir();
  });

  $$('[data-suppr]', el).forEach((b) =>
    b.addEventListener('click', () => {
      if (!confirm('Supprimer ce point ?')) return;
      modifier((s) => (s.historique = s.historique.filter((p) => p.date !== b.dataset.suppr)));
      rafraichir();
    })
  );

  if (!h.length) return;
  const canvas = $('#gHist', el);
  graphique(canvas, {
    type: 'line',
    data: {
      labels: h.map((p) => dateFr(p.date)),
      datasets: [
        { label: 'Patrimoine net', data: h.map((p) => val(p, 'net')), borderColor: COULEURS.nuit, backgroundColor: degrade(canvas, COULEURS.lac, 0.25), fill: true, borderWidth: 2.4, pointRadius: 3.5, pointBackgroundColor: '#fff', pointBorderWidth: 2, tension: 0.3 },
        { label: 'Placements', data: h.map((p) => val(p, 'plac')), borderColor: COULEURS.sapin, borderWidth: 1.6, pointRadius: 0, tension: 0.3 },
        { label: 'Immobilier net', data: h.map((p) => val(p, 'immo')), borderColor: COULEURS.sable, borderWidth: 1.6, pointRadius: 0, tension: 0.3 },
        { label: 'Prévoyance', data: h.map((p) => val(p, 'prev')), borderColor: COULEURS.alpin, borderWidth: 1.6, pointRadius: 0, tension: 0.3 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${f(c.raw)}` } } },
      scales: { x: echelleX(), y: echelleMontant() },
    },
  });
}
