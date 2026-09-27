import { projection } from '../js/finance.js';
import { money, convertir   } from '../js/format.js';
import { lire } from '../js/store.js';
import { htmlCurseur, remplissage, graphique, animerNombre, cascade, $, $$, degrade } from '../js/ui.js';
import { icones, montagnes } from '../js/icones.js';

export function rendre(vue) {
  const dev = lire().reglages.devise;
  const t = lire().reglages.tauxChange;
  const cv = (v) => Math.round(convertir(v, 'EUR', dev, t) / 100) * 100;

  vue.innerHTML = `
  <section class="heros">
    <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:2rem;align-items:center">
      <div>
        <span class="etiquette-haut"><span class="drapeaux"><i style="background:linear-gradient(90deg,#0055a4 33%,#fff 33% 66%,#ef4135 66%)"></i><i style="background:#d8313b"></i></span> Pensé pour les frontaliers France–Suisse</span>
        <h1>Votre patrimoine, <em>des deux côtés de la frontière</em></h1>
        <p class="accroche">Euros et francs suisses, LPP, 3<sup>e</sup> pilier, PEA, crédits : un seul tableau de bord, gratuit et sans compte. Vos chiffres ne quittent jamais votre navigateur.</p>
        <div class="pile">
          <a class="btn clair" href="#/patrimoine">Créer mon tableau de bord ${icones.fleche.replace('<svg', '<svg width="16" height="16"')}</a>
          <a class="btn fantome" href="#/simulateurs">Voir les simulateurs</a>
        </div>
      </div>
      <div class="carte carte-sombre" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);box-shadow:none;backdrop-filter:blur(6px)">
        <span style="color:#b9cbe0;font-size:.86rem;font-weight:550">Patrimoine projeté dans <span id="hAns">15 ans</span></span>
        <div class="grand-chiffre" id="hTotal">—</div>
        <div style="color:#b9cbe0;font-size:.86rem;margin-bottom:1.1rem">dont <b style="color:#86efac" id="hGain">—</b> générés par les marchés</div>
        ${htmlCurseur({ id: 'hCapital', libelle: 'Capital de départ', min: 0, max: cv(300000), pas: 1000, valeur: cv(40000) })}
        ${htmlCurseur({ id: 'hEpargne', libelle: 'Épargne mensuelle', min: 0, max: cv(5000), pas: 50, valeur: cv(500) })}
        ${htmlCurseur({ id: 'hRendement', libelle: 'Rendement annuel', min: 0, max: 12, pas: 0.5, valeur: 7 })}
        ${htmlCurseur({ id: 'hDuree', libelle: 'Horizon', min: 1, max: 40, pas: 1, valeur: 15 })}
        <div class="cadre-graphique bas" style="margin-top:1.1rem;height:150px"><canvas id="hGraph"></canvas></div>
      </div>
    </div>
    ${montagnes}
  </section>

  <div class="titre-section"><div><span class="surtitre">Ce que vous pouvez faire</span><h2>Tout ce qu'un frontalier doit suivre</h2></div></div>
  <div class="grille g3" data-cascade>
    ${carte('#/patrimoine', icones.patrimoine, 'var(--lac-clair)', 'var(--lac)', 'Patrimoine en EUR et CHF', "Biens, crédits en euros ou en francs, comptes suisses et français. Tout est converti au taux du jour.")}
    ${carte('#/patrimoine/prevoyance', icones.bouclier, 'var(--alpin-clair)', 'var(--alpin)', 'LPP et 3e pilier', "Votre âge suffit à retrouver les taux de bonification légaux. La répartition employeur/employé s'ajuste à votre contrat.")}
    ${carte('#/patrimoine/placements', icones.enveloppe, 'var(--sapin-clair)', 'var(--sapin)', 'PEA et fiscalité de sortie', "Ce que coûterait un retrait aujourd'hui, avec l'exonération de CSG/CRDS des frontaliers.")}
    ${carte('#/simulateurs', icones.simulateurs, 'var(--sable-clair)', '#8a6414', '6 simulateurs', 'Projection, objectif, crédit, locatif, SCPI, dividendes. Sans inscription.')}
    ${carte('#/classements', icones.classements, '#efeafe', 'var(--lavande)', 'Classements', 'Top 20 ETF, actions à dividendes et SCPI, actualisés à partir des cours du marché.')}
    ${carte('#/sauvegarde', icones.cadenas, 'var(--trait-2)', 'var(--nuit)', 'Vos données chez vous', "Aucun compte, aucun serveur. Un fichier de sauvegarde pour passer d'un appareil à l'autre.")}
  </div>

  <div class="carte" style="margin-top:2rem;display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;justify-content:space-between">
    <div style="max-width:60ch">
      <h3>Commencez avec un exemple, remplacez-le par vos chiffres</h3>
      <p class="discret" style="margin:.4rem 0 0">Un PEA de démonstration est déjà en place. Modifiez-le, ajoutez votre LPP, vos biens et vos crédits : tout se recalcule instantanément.</p>
    </div>
    <a class="btn" href="#/patrimoine">Ouvrir mon tableau de bord</a>
  </div>`;

  cascade(vue);

  const ids = ['hCapital', 'hEpargne', 'hRendement', 'hDuree'];
  const canvas = $('#hGraph');
  const g = graphique(canvas, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Versé', data: [], borderColor: 'rgba(255,255,255,.45)', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, tension: 0.3 },
      { label: 'Patrimoine', data: [], borderColor: '#7fb6e6', backgroundColor: degrade(canvas, '#7fb6e6', 0.45), fill: true, borderWidth: 2.2, pointRadius: 0, tension: 0.3 },
    ] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => `Année ${i[0].label}`, label: (c) => `${c.dataset.label} : ${money(c.raw, dev)}` } } },
      scales: { x: { display: false }, y: { display: false } },
    },
  });

  const maj = () => {
    const v = Object.fromEntries(ids.map((id) => [id, +$('#' + id).value]));
    ids.forEach((id) => remplissage($('#' + id)));
    $('#hCapital-v').textContent = money(v.hCapital, dev);
    $('#hEpargne-v').textContent = money(v.hEpargne, dev) + ' / mois';
    $('#hRendement-v').textContent = String(v.hRendement).replace('.', ',') + ' %';
    $('#hDuree-v').textContent = v.hDuree + ' ans';
    $('#hAns').textContent = v.hDuree + (v.hDuree > 1 ? ' ans' : ' an');
    const r = projection({ capitalInitial: v.hCapital, epargneMensuelle: v.hEpargne, rendement: v.hRendement / 100, annees: v.hDuree });
    animerNombre($('#hTotal'), r.total, (x) => money(x, dev));
    $('#hGain').textContent = money(r.rendementGenere, dev);
    g.data.labels = r.series.map((p) => p.annee);
    g.data.datasets[0].data = r.series.map((p) => v.hCapital + v.hEpargne * 12 * p.annee);
    g.data.datasets[1].data = r.series.map((p) => p.total);
    g.update();
  };
  ids.forEach((id) => $('#' + id).addEventListener('input', maj));
  maj();
}

const carte = (href, icone, fond, couleur, titre, texte) => `
  <a class="carte cliquable" href="${href}" style="text-decoration:none;color:inherit">
    <span class="pastille-icone" style="background:${fond};color:${couleur};margin-bottom:.9rem">${icone}</span>
    <h3>${titre}</h3>
    <p class="discret" style="margin:.4rem 0 0">${texte}</p>
  </a>`;
