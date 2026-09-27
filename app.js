import { lire, reglage, abonner, joursDepuisSauvegarde, exporter, demanderPersistance } from './js/store.js';
import { themeGraphiques, detruireGraphiques, toast, $, $$ } from './js/ui.js';
import { icones, logo } from './js/icones.js';
import { change, configure } from './js/marche.js';
import { nombre, dateHeure } from './js/format.js';

import * as accueil from './vues/accueil.js';
import * as patrimoine from './vues/patrimoine.js';
import * as simulateurs from './vues/simulateurs.js';
import * as classements from './vues/classements.js';
import * as sauvegarde from './vues/sauvegarde.js';
import * as legal from './vues/legal.js';

const ROUTES = { '': accueil, patrimoine, simulateurs, classements, sauvegarde, legal };
const vue = $('#vue');
let courante = { nom: null, module: null };

themeGraphiques();

/* ------------------------------------------------------------ en-tête */

$('#logo').innerHTML = `${logo}<span><b>Gestion de patrimoine</b><small>frontalier Suisse</small></span>`;
$('#navMobile').innerHTML = [
  ['', 'Accueil', icones.accueil],
  ['patrimoine', 'Patrimoine', icones.patrimoine],
  ['simulateurs', 'Simuler', icones.simulateurs],
  ['classements', 'Classements', icones.classements],
  ['sauvegarde', 'Sauvegarde', icones.sauvegarde],
]
  .map(([r, l, i]) => `<a href="#/${r}" data-route="${r}">${i}<span>${l}</span></a>`)
  .join('');

function majEntete() {
  const r = lire().reglages;
  const bascule = $('#bascule');
  bascule.dataset.devise = r.devise;
  $$('button', bascule).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.devise === r.devise)));
  $('#tauxPill').innerHTML = `1 € = <b>${nombre(r.tauxChange, 4)} CHF</b>`;
  $('#tauxPill').title = r.tauxChangeLe ? `Taux du ${dateHeure(r.tauxChangeLe)}` : 'Taux par défaut, non actualisé';
}

$('#bascule').addEventListener('click', (e) => {
  const b = e.target.closest('[data-devise]');
  if (!b || b.dataset.devise === lire().reglages.devise) return;
  reglage((r) => (r.devise = b.dataset.devise));
  majEntete();
  rendre(true);
});

/* ------------------------------------------------------------ rappel de sauvegarde */

function majBandeau() {
  const e = lire();
  const j = joursDepuisSauvegarde();
  const aDesDonnees = !e.exemple && (e.biens.length || e.prets.length || e.enveloppes.length || e.lpp.actif || e.pilier3.length);
  const masque = sessionStorage.getItem('bandeau-masque');
  const afficher = aDesDonnees && !masque && (j === null || j > 30);
  $('#bandeau').innerHTML = afficher
    ? `<div class="bandeau-sauvegarde"><div class="conteneur">
        <span>${icones.alerte.replace('<svg', '<svg width="18" height="18" style="vertical-align:-4px"')}
        ${j === null ? "Vos données ne sont enregistrées que dans ce navigateur. Faites une première sauvegarde." : `Dernière sauvegarde il y a ${j} jours.`}</span>
        <span class="pile" style="margin-left:auto"><button class="btn mini" data-action="sauver">Sauvegarder maintenant</button>
        <button class="btn mini discret" data-action="masquer">Plus tard</button></span></div></div>`
    : '';
}

$('#bandeau').addEventListener('click', (e) => {
  const a = e.target.closest('[data-action]')?.dataset.action;
  if (a === 'sauver') { exporter(); toast('Sauvegarde téléchargée', 'succes'); }
  if (a === 'masquer') sessionStorage.setItem('bandeau-masque', '1');
  majBandeau();
});

/* ------------------------------------------------------------ routeur */

function lireRoute() {
  const [nom = '', sous = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { nom: ROUTES[nom] ? nom : '', sous };
}

function rendre(forcer = false) {
  const { nom, sous } = lireRoute();
  const module = ROUTES[nom];

  $$('[data-route]').forEach((a) => {
    const actif = a.dataset.route === nom;
    a.toggleAttribute('aria-current', actif);
    if (actif) a.setAttribute('aria-current', 'page');
  });

  // Changement d'onglet interne : la vue gère sa propre transition.
  if (!forcer && courante.nom === nom && module.changerSous) {
    module.changerSous(sous);
    return;
  }

  const afficher = () => {
    detruireGraphiques();
    courante.module?.quitter?.();
    vue.innerHTML = '';
    module.rendre(vue, sous);
    courante = { nom, module };
  };

  if (forcer || courante.nom === null) {
    afficher();
    if (courante.nom !== null && !forcer) vue.classList.add('vue-entre');
    return;
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(afficher);
  } else {
    afficher();
    vue.classList.remove('vue-entre');
    void vue.offsetWidth;
    vue.classList.add('vue-entre');
  }
}

window.addEventListener('hashchange', () => rendre());
abonner(() => { majBandeau(); majEntete(); });

/* ------------------------------------------------------------ taux de change */

async function actualiserTaux() {
  if (!configure()) return;
  try {
    const { taux, maj } = await change();
    if (taux > 0.5 && taux < 2) {
      const ancien = lire().reglages.tauxChange;
      reglage((r) => { r.tauxChange = taux; r.tauxChangeLe = maj || new Date().toISOString(); });
      majEntete();
      if (Math.abs(ancien - taux) > 0.0005) rendre(true);
    }
  } catch (e) {
    console.warn('Taux EUR/CHF non actualisé :', e.message);
  }
}

/* ------------------------------------------------------------ démarrage */

majEntete();
majBandeau();
rendre();
actualiserTaux();
demanderPersistance();
