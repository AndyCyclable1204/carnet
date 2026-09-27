import { classement, configure, viderCache } from '../js/marche.js';
import { SCPI, SCPI_SOURCE } from '../js/scpi.js';
import { money, pct, pctSigne, dateHeure, esc, nombre } from '../js/format.js';
import { $, $$, htmlOnglets, placerIndicateur, cascade } from '../js/ui.js';
import { icones } from '../js/icones.js';

const ONGLETS = [
  { id: 'etf', libelle: 'ETF' },
  { id: 'dividendes', libelle: 'Dividendes' },
  { id: 'scpi', libelle: 'SCPI' },
];

const DRAPEAUX = { FR: '🇫🇷', CH: '🇨🇭', DE: '🇩🇪', NL: '🇳🇱', IT: '🇮🇹', ES: '🇪🇸', BE: '🇧🇪', FI: '🇫🇮' };
let actif = 'etf';
const etatTri = { etf: { cle: 'perf1a', sens: -1 }, dividendes: { cle: 'rendement', sens: -1 }, scpi: { cle: 'td', sens: -1 } };
const filtres = { etf: 'tous', dividendes: 'tous', scpi: 'tous' };

export function rendre(vue, sous) {
  actif = ONGLETS.some((o) => o.id === sous) ? sous : 'etf';
  vue.innerHTML = `
    <div style="margin-bottom:1.2rem"><span class="surtitre">Top 20</span><h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">Classements</h1>
      <p class="discret" style="margin:.4rem 0 0;max-width:70ch">Une photographie du marché pour repérer des pistes, pas une recommandation. Les performances passées ne préjugent pas des performances futures.</p></div>
    ${htmlOnglets(ONGLETS, actif, 'data-cl')}
    <div id="cl"></div>`;
  const barre = $('.onglets', vue);
  barre.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cl]');
    if (b) location.hash = `#/classements/${b.dataset.cl}`;
  });
  requestAnimationFrame(() => placerIndicateur(barre));
  afficher(false);
}

export function changerSous(sous) {
  const n = ONGLETS.some((o) => o.id === sous) ? sous : 'etf';
  if (n === actif) return;
  actif = n;
  const barre = $('.onglets');
  $$('[data-cl]', barre).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cl === actif)));
  placerIndicateur(barre);
  afficher(true);
}

function afficher(anime, forcer = false) {
  const ancien = $('#cl');
  const el = document.createElement('div');
  el.id = 'cl';
  ancien.replaceWith(el);
  if (anime) el.classList.add('panneau-entre');
  if (actif === 'scpi') return rendreSCPI(el);
  rendreMarche(el, actif, forcer);
}

/* ------------------------------------------------------------ ETF et dividendes */

const CONFIG = {
  etf: {
    titre: 'Les 20 ETF les plus performants de notre sélection',
    intro: "Une sélection d'ETF actions populaires (PEA, compte titres, Bourse suisse), classés sur les 12 derniers mois.",
    filtres: [['tous', 'Tous'], ['pea', 'Éligibles PEA'], ['cto', 'Compte titres'], ['ch', 'Bourse suisse']],
    colonnes: [
      { cle: 'nom', titre: 'ETF', rendu: (x) => `<div class="nom-ligne">${esc(x.nom)}<small>${esc(x.symbole)} · ${esc(x.zone || '')}</small></div>` },
      { cle: 'pea', titre: 'PEA', rendu: (x) => (x.pea ? '<span class="badge vert">PEA</span>' : '<span class="badge">CTO</span>') },
      { cle: 'prix', titre: 'Cours', nb: true, rendu: (x) => `${nombre(x.prix, 2)} <small>${esc(x.devise || '')}</small>` },
      { cle: 'perf1m', titre: '1 mois', nb: true, rendu: (x) => perf(x.perf1m) },
      { cle: 'perfYtd', titre: 'Depuis janvier', nb: true, rendu: (x) => perf(x.perfYtd) },
      { cle: 'perf1a', titre: '1 an', nb: true, rendu: (x, max) => barre(x.perf1a, max) },
    ],
    filtrer: (x, f) => f === 'tous' || (f === 'pea' && x.pea) || (f === 'cto' && !x.pea && x.place !== 'CH') || (f === 'ch' && x.place === 'CH'),
  },
  dividendes: {
    titre: 'Les 20 rendements du dividende les plus élevés',
    intro: 'Grandes valeurs françaises, européennes et suisses. Rendement = dividendes versés sur 12 mois glissants ÷ cours actuel.',
    filtres: [['tous', 'Toutes'], ['pea', 'Éligibles PEA'], ['ch', 'Suisse']],
    colonnes: [
      { cle: 'nom', titre: 'Société', rendu: (x) => `<div class="nom-ligne">${DRAPEAUX[x.pays] || ''} ${esc(x.nom)}<small>${esc(x.symbole)} · ${esc(x.secteur || '')}</small></div>` },
      { cle: 'pea', titre: 'PEA', rendu: (x) => (x.pea ? '<span class="badge vert">PEA</span>' : '<span class="badge">Hors PEA</span>') },
      { cle: 'prix', titre: 'Cours', nb: true, rendu: (x) => `${nombre(x.prix, 2)} <small>${esc(x.devise || '')}</small>` },
      { cle: 'dividende', titre: 'Dividende 12 mois', nb: true, rendu: (x) => `${nombre(x.dividende, 2)} <small>${esc(x.devise || '')}</small><br><small>${x.versements} versement${x.versements > 1 ? 's' : ''}</small>` },
      { cle: 'rendement', titre: 'Rendement', nb: true, rendu: (x, max) => barre(x.rendement, max, false) },
    ],
    filtrer: (x, f) => f === 'tous' || (f === 'pea' && x.pea) || (f === 'ch' && x.pays === 'CH'),
    note: "Un rendement très élevé signale parfois un cours en forte baisse ou un dividende exceptionnel non reconductible. Les dividendes suisses subissent une retenue à la source de 35 %, partiellement récupérable.",
  },
};

const perf = (v) => (v == null ? '—' : `<span class="${v < 0 ? 'neg' : 'pos'}">${pctSigne(v)}</span>`);
const barre = (v, max, signe = true) => v == null ? '—' : `
  <div style="display:flex;align-items:center;gap:.6rem;justify-content:flex-end">
    <div class="barre-mini" style="width:70px"><i style="width:${Math.max(3, (Math.max(0, v) / Math.max(max, 0.0001)) * 100)}%;${v < 0 ? 'background:var(--alpin)' : ''}"></i></div>
    <b class="${v < 0 ? 'neg' : 'pos'}" style="min-width:56px">${signe ? pctSigne(v) : pct(v)}</b></div>`;

async function rendreMarche(el, type, forcer) {
  const cfg = CONFIG[type];
  el.innerHTML = `
    <div class="carte">
      <div class="carte-tete">
        <div><h3>${cfg.titre}</h3><small>${cfg.intro}</small></div>
        <div class="pile"><span class="discret" id="majLe"></span><button class="btn mini discret" id="rafr">${icones.rafraichir.replace('<svg', '<svg width="14" height="14"')} Actualiser</button></div>
      </div>
      <div class="pile" style="margin-bottom:1rem" id="filtres">${cfg.filtres.map(([v, l]) => `<button class="btn mini ${filtres[type] === v ? '' : 'discret'}" data-filtre="${v}">${l}</button>`).join('')}</div>
      <div id="corps">${squelette()}</div>
      ${cfg.note ? `<small style="display:block;margin-top:1rem">${cfg.note}</small>` : ''}
    </div>`;

  $('#rafr', el).addEventListener('click', () => {
    viderCache();
    afficher(false, true);
  });

  if (!configure()) {
    $('#corps', el).innerHTML = `<div class="encart attention">${icones.alerte.replace('<svg', '<svg width="18" height="18" style="flex:none"')}<p>Les classements en direct nécessitent la fonction de cotation. Renseignez <code>config.js</code> avec l'adresse et la clé publiable de votre projet Supabase.</p></div>`;
    return;
  }

  let donnees;
  try {
    donnees = await classement(type);
  } catch (e) {
    $('#corps', el).innerHTML = `<div class="encart alerte">${icones.alerte.replace('<svg', '<svg width="18" height="18" style="flex:none"')}<p>${esc(e.message)}</p></div>`;
    return;
  }
  if (!el.isConnected) return;
  $('#majLe', el).textContent = `Cours du ${dateHeure(donnees.maj)}`;

  const dessiner = () => {
    const tri = etatTri[type];
    let liste = donnees.lignes.filter((x) => cfg.filtrer(x, filtres[type]) && x[tri.cle] != null);
    liste.sort((a, b) => (typeof a[tri.cle] === 'string' ? a[tri.cle].localeCompare(b[tri.cle]) : a[tri.cle] - b[tri.cle]) * tri.sens);
    liste = liste.slice(0, 20);
    const max = Math.max(...liste.map((x) => Math.abs(x[cfg.colonnes.at(-1).cle] || 0)), 0.0001);
    $('#corps', el).innerHTML = liste.length ? tableau(cfg.colonnes, liste, tri, max) : '<div class="vide"><p>Aucune donnée disponible pour ce filtre.</p></div>';
    cascade($('#corps', el));
  };

  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filtre]');
    if (f) {
      filtres[type] = f.dataset.filtre;
      $$('[data-filtre]', el).forEach((b) => b.classList.toggle('discret', b !== f));
      dessiner();
    }
    const th = e.target.closest('[data-tri]');
    if (th) {
      const t = etatTri[type];
      t.sens = t.cle === th.dataset.tri ? -t.sens : -1;
      t.cle = th.dataset.tri;
      dessiner();
    }
  });
  dessiner();
}

function tableau(colonnes, liste, tri, max) {
  return `<div class="table-cadre"><table>
    <thead><tr><th>#</th>${colonnes.map((c) => `<th class="c-${c.cle} ${c.nb ? 'nb' : ''} triable ${tri.cle === c.cle ? 'tri-actif' : ''}" data-tri="${c.cle}">${c.titre}${tri.cle === c.cle ? (tri.sens < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}</tr></thead>
    <tbody data-cascade>${liste.map((x, i) => `<tr><td><span class="rang">${i + 1}</span></td>${colonnes.map((c) => `<td class="c-${c.cle} ${c.nb ? 'nb' : ''}">${c.rendu(x, max)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

const squelette = () => Array.from({ length: 8 }, (_, i) => `<div style="display:flex;gap:1rem;align-items:center;padding:.7rem 0;border-bottom:1px solid var(--trait-2)"><div class="squelette" style="width:28px;height:28px;border-radius:50%"></div><div class="squelette" style="flex:1;max-width:${260 - i * 12}px"></div><div class="squelette" style="width:80px;margin-left:auto"></div></div>`).join('');

/* ------------------------------------------------------------ SCPI */

function rendreSCPI(el) {
  const cfg = {
    colonnes: [
      { cle: 'nom', titre: 'SCPI', rendu: (x) => `<div class="nom-ligne">${esc(x.nom)}<small>${esc(x.gerant)}</small></div>` },
      { cle: 'zone', titre: 'Zone', rendu: (x) => `<small>${esc(x.zone)}</small>` },
      { cle: 'frais', titre: "Frais d'entrée", nb: true, rendu: (x) => (x.frais === 0 ? '<span class="badge vert">Sans frais</span>' : pct(x.frais, 1)) },
      { cle: 'prix', titre: 'Prix de part', nb: true, rendu: (x) => (x.prix ? money(x.prix, 'EUR', x.prix < 10 ? 2 : 0) : '—') },
      { cle: 'td', titre: `TD ${SCPI_SOURCE.annee}`, nb: true, rendu: (x, max) => barre(x.td, max, false) },
    ],
  };
  const dessiner = () => {
    const tri = etatTri.scpi;
    let liste = SCPI.filter((x) => filtres.scpi === 'tous' || (filtres.scpi === 'sansfrais' && x.frais === 0) || (filtres.scpi === 'etablies' && x.creation && x.creation <= 2022));
    liste = [...liste].sort((a, b) => ((a[tri.cle] ?? -1) > (b[tri.cle] ?? -1) ? 1 : -1) * tri.sens).slice(0, 20);
    const max = Math.max(...liste.map((x) => x.td));
    $('#corps', el).innerHTML = tableau(cfg.colonnes, liste, tri, max);
    cascade($('#corps', el));
  };
  el.innerHTML = `
    <div class="carte">
      <div class="carte-tete"><div><h3>Les 20 meilleurs taux de distribution ${SCPI_SOURCE.annee}</h3>
        <small>Le taux de distribution d'une SCPI est publié une fois par an : ce classement est mis à jour chaque année, pas en continu.</small></div>
        <a class="btn mini discret" href="#/simulateurs/scpi">Simuler un investissement</a></div>
      <div class="pile" style="margin-bottom:1rem">
        ${[['tous', 'Toutes'], ['sansfrais', 'Sans frais d’entrée'], ['etablies', 'Créées avant 2023']].map(([v, l]) => `<button class="btn mini ${filtres.scpi === v ? '' : 'discret'}" data-filtre="${v}">${l}</button>`).join('')}
      </div>
      <div id="corps"></div>
      <div class="encart attention" style="margin-top:1rem">${icones.info.replace('<svg', '<svg width="18" height="18" style="flex:none"')}
        <p>Beaucoup des SCPI en tête ont moins de 3 ans : leur taux est souvent gonflé par le délai de jouissance et des acquisitions récentes à prix bas. Un taux se juge sur plusieurs années, avec le taux d'occupation et l'évolution du prix de part.</p></div>
      <small style="display:block;margin-top:.8rem">Source : ${SCPI_SOURCE.source}, données ${SCPI_SOURCE.annee}.</small>
    </div>`;
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filtre]');
    if (f) {
      filtres.scpi = f.dataset.filtre;
      $$('[data-filtre]', el).forEach((b) => b.classList.toggle('discret', b !== f));
      dessiner();
    }
    const th = e.target.closest('[data-tri]');
    if (th) {
      const t = etatTri.scpi;
      t.sens = t.cle === th.dataset.tri ? -t.sens : -1;
      t.cle = th.dataset.tri;
      dessiner();
    }
  });
  dessiner();
}
