import { projection, capaciteEmprunt, rendementLocatif, tableauAmortissement } from './finance.js';
import { eur, nb, pct, pct1, $, couleurs } from './format.js';

Chart.defaults.font.family = 'IBM Plex Sans, system-ui, sans-serif';
Chart.defaults.color = '#55625c';
Chart.defaults.animation = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 350 };

const val = (id) => +$(id).value;

/* ---------------- projection patrimoniale ---------------- */

const champs = ['capital', 'epargne', 'rendement', 'duree', 'equite', 'amorti'];
let graphique;

function zone(ctx, couleur, opacite) {
  const g = ctx.createLinearGradient(0, 0, 0, 340);
  g.addColorStop(0, couleur + Math.round(opacite * 255).toString(16).padStart(2, '0'));
  g.addColorStop(1, couleur + '18');
  return g;
}

function dessineProjection(series) {
  const ctx = $('graphique').getContext('2d');
  const labels = series.map((p) => p.annee);
  const jeux = [
    { label: 'Immobilier net', data: series.map((p) => p.immobilier), couleur: couleurs.immobilier },
    { label: 'Crédit amorti', data: series.map((p) => p.amorti), couleur: couleurs.amorti },
    { label: 'Épargne capitalisée', data: series.map((p) => p.financier), couleur: couleurs.financier },
  ].map((j) => ({
    label: j.label,
    data: j.data,
    borderColor: j.couleur,
    backgroundColor: zone(ctx, j.couleur, 0.55),
    borderWidth: 1.5,
    fill: true,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.25,
  }));

  if (graphique) {
    graphique.data.labels = labels;
    graphique.data.datasets.forEach((d, i) => (d.data = jeux[i].data));
    graphique.update();
    return;
  }

  graphique = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: jeux },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#101b17',
          padding: 10,
          callbacks: {
            title: (t) => `Dans ${t[0].label} an${+t[0].label > 1 ? 's' : ''}`,
            label: (c) => `${c.dataset.label} : ${eur(c.raw)}`,
            footer: (items) => 'Total : ' + eur(items.reduce((s, i) => s + i.raw, 0)),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'années' } },
        y: {
          stacked: true,
          grid: { color: couleurs.trait },
          border: { display: false },
          ticks: { callback: (v) => (v >= 1000 ? nb(v / 1000) + ' k' : v) },
        },
      },
    },
  });
}

function calculeProjection() {
  const annees = val('duree');
  const r = projection({
    capitalInitial: val('capital'),
    epargneMensuelle: val('epargne'),
    rendement: val('rendement') / 100,
    annees,
    amortiMensuel: val('amorti'),
    equiteImmo: val('equite'),
  });
  const fin = r.series[annees];
  const depart = r.series[0].total;

  $('vCapital').textContent = eur(val('capital'));
  $('vEpargne').textContent = eur(val('epargne')) + ' / mois';
  $('vRendement').textContent = val('rendement').toFixed(1).replace('.', ',') + ' %';
  $('vDuree').textContent = annees + ' an' + (annees > 1 ? 's' : '');
  $('vEquite').textContent = eur(val('equite'));
  $('vAmorti').textContent = eur(val('amorti')) + ' / mois';

  $('etiquetteAnnees').textContent = annees + ' an' + (annees > 1 ? 's' : '');
  $('total').textContent = eur(fin.total);
  $('construit').textContent = '+ ' + eur(fin.total - depart);
  $('genere').textContent = eur(r.rendementGenere);
  $('lgImmo').textContent = eur(fin.immobilier);
  $('lgAmorti').textContent = eur(fin.amorti);
  $('lgFin').textContent = eur(fin.financier);

  dessineProjection(r.series);
}

champs.forEach((id) => $(id).addEventListener('input', calculeProjection));

/* ---------------- crédit ---------------- */

let graphiqueCredit;

function calculeCredit() {
  const dureeMois = Math.max(1, Math.round(val('cDuree') * 12));
  const taux = val('cTaux') / 100;
  const r = capaciteEmprunt({
    revenusMensuels: val('cRevenus'),
    chargesCredits: val('cCharges'),
    tauxAnnuel: taux,
    dureeMois,
    tauxEndettement: val('cEndettement') / 100,
    apport: val('cApport'),
  });
  const table = tableauAmortissement({ capital: r.capital, tauxAnnuel: taux, dureeMois });

  $('cBudget').textContent = eur(r.budget);
  $('cCapital').textContent = eur(r.capital);
  $('cMensualite').textContent = eur(r.mensualiteMax);
  $('cCout').textContent = eur(table.interetsTotaux);

  const pas = dureeMois > 120 ? 3 : 1;
  const lignes = table.lignes.filter((_, i) => i % pas === 0);
  const data = {
    labels: lignes.map((l) => (l.mois / 12).toFixed(1)),
    datasets: [
      {
        label: 'Capital',
        data: lignes.map((l) => l.capital),
        backgroundColor: couleurs.financier,
        borderWidth: 0,
      },
      {
        label: 'Intérêts',
        data: lignes.map((l) => l.interets),
        backgroundColor: couleurs.dette,
        borderWidth: 0,
      },
    ],
  };

  if (graphiqueCredit) {
    graphiqueCredit.data = data;
    graphiqueCredit.update();
    return;
  }
  graphiqueCredit = new Chart($('graphiqueCredit').getContext('2d'), {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${eur(c.raw)}` } },
      },
      scales: {
        x: { stacked: true, grid: { display: false }, title: { display: true, text: 'années' }, ticks: { maxTicksLimit: 10 } },
        y: { stacked: true, grid: { color: couleurs.trait }, border: { display: false }, ticks: { callback: (v) => eur(v) } },
      },
    },
  });
}

['cRevenus', 'cCharges', 'cTaux', 'cDuree', 'cApport', 'cEndettement'].forEach((id) =>
  $(id).addEventListener('input', calculeCredit)
);

/* ---------------- locatif ---------------- */

function calculeLocatif() {
  const r = rendementLocatif({
    prix: val('lPrix'),
    frais: val('lFrais'),
    travaux: val('lTravaux'),
    loyerMensuel: val('lLoyer'),
    chargesAnnuelles: val('lCharges'),
    taxeFonciere: val('lTaxe'),
    vacance: val('lVacance') / 100,
  });
  $('lNet').textContent = pct(r.net);
  $('lBrut').textContent = pct(r.brut);
  $('lInvesti').textContent = eur(r.investi);
  $('lCashflow').textContent = eur(r.cashflowMensuel);
}

['lPrix', 'lFrais', 'lTravaux', 'lLoyer', 'lCharges', 'lTaxe', 'lVacance'].forEach((id) =>
  $(id).addEventListener('input', calculeLocatif)
);

/* ---------------- onglets ---------------- */

document.querySelectorAll('.onglets button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.onglets button').forEach((x) => {
      x.setAttribute('aria-selected', String(x === b));
      document.getElementById(x.dataset.panneau).hidden = x !== b;
    });
    if (b.dataset.panneau === 'pCredit') graphiqueCredit?.resize();
  });
});

calculeProjection();
calculeCredit();
calculeLocatif();
