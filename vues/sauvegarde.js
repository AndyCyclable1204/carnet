import { lire, reglage, exporter, lireFichier, restaurer, peutAnnulerImport, annulerImport, reinitialiser, joursDepuisSauvegarde } from '../js/store.js';
import { dateFr, dateHeure, nombre, esc } from '../js/format.js';
import { $, toast, cascade } from '../js/ui.js';
import { icones } from '../js/icones.js';
import { configure } from '../js/marche.js';

let enAttente = null;

export function rendre(vue) {
  const e = lire();
  const j = joursDepuisSauvegarde();
  const nb = e.biens.length + e.prets.length + e.enveloppes.length + e.pilier3.length + (e.lpp.actif ? 1 : 0);
  const taille = new Blob([localStorage.getItem('gpfs:donnees') || '']).size;

  vue.innerHTML = `
    <div style="margin-bottom:1.2rem"><span class="surtitre">Vos données, chez vous</span><h1 style="font-size:clamp(1.7rem,4vw,2.4rem)">Sauvegarde et réglages</h1></div>

    <div class="carte kpi-principal" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:1.5rem;align-items:center">
      <div>
        <span class="pastille-icone" style="background:rgba(255,255,255,.1);color:#fff;margin-bottom:.8rem">${icones.cadenas}</span>
        <h2 style="font-size:1.35rem;color:#fff">Rien ne quitte ce navigateur</h2>
        <p style="color:#b9cbe0;margin:.5rem 0 0">Pas de compte, pas de serveur : vos chiffres sont enregistrés sur cet appareil uniquement. Le revers, c'est qu'un nettoyage du navigateur les efface. Le fichier de sauvegarde est votre filet de sécurité, et le moyen de passer d'un appareil à l'autre.</p>
      </div>
      <div class="grille" style="grid-template-columns:1fr 1fr;gap:1rem">
        ${stat('Dernière sauvegarde', j === null ? 'Jamais' : j === 0 ? "Aujourd'hui" : `Il y a ${j} j`, e.derniereSauvegarde ? dateFr(e.derniereSauvegarde) : 'à faire', j === null || j > 30)}
        ${stat('Éléments suivis', nombre(nb), `${e.historique.length} point${e.historique.length > 1 ? 's' : ''} d'historique`)}
        ${stat('Taille des données', `${nombre(taille / 1024, 1)} ko`, 'dans ce navigateur')}
        ${stat('1 € vaut', `${nombre(e.reglages.tauxChange, 4)} CHF · ${nombre(e.reglages.tauxUSD, 4)} $`, e.reglages.tauxChangeLe ? dateHeure(e.reglages.tauxChangeLe) : 'non actualisé')}
      </div>
    </div>

    <div class="grille g2" style="margin-top:1rem" data-cascade>
      <div class="carte">
        <div class="carte-tete"><h3><span class="pastille-icone" style="background:var(--sapin-clair);color:var(--sapin)">${icones.sauvegarde}</span> Sauvegarder</h3></div>
        <p class="discret">Télécharge un fichier <code>.json</code> contenant tout votre tableau de bord et son historique. Rangez-le dans votre cloud (iCloud, Google Drive, OneDrive) pour le retrouver partout.</p>
        <button class="btn" id="exporter">${icones.sauvegarde.replace('<svg', '<svg width="16" height="16"')} Télécharger ma sauvegarde</button>
      </div>

      <div class="carte">
        <div class="carte-tete"><h3><span class="pastille-icone" style="background:var(--lac-clair);color:var(--lac)">${icones.import}</span> Restaurer</h3></div>
        <label class="zone-depot" id="zone" style="display:block;border:1.5px dashed #cbd5e1;border-radius:var(--rayon-m);padding:1.4rem;text-align:center;cursor:pointer;transition:border-color .2s,background .2s">
          <input type="file" id="fichier" accept="application/json,.json" hidden>
          <b>Choisir un fichier de sauvegarde</b><br><small>ou le déposer ici</small>
        </label>
        <div id="apercu"></div>
        ${peutAnnulerImport() ? '<button class="btn mini discret" id="annuler" style="margin-top:.8rem">Revenir aux données d’avant la dernière restauration</button>' : ''}
      </div>
    </div>

    <div class="carte" style="margin-top:1rem">
      <div class="carte-tete"><h3>Réglages</h3></div>
      <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))">
        <div class="champ"><label>Votre âge<span class="saisie avec-suffixe"><input type="number" id="age" value="${e.reglages.age}" min="16" max="80"><i>ans</i></span></label><small>Sert au calcul LPP et aux projections de prévoyance.</small></div>
        <div class="champ"><label>Taux EUR/CHF${configure() ? ' (actualisé automatiquement)' : ''}<span class="saisie avec-suffixe"><input type="number" id="taux" step="0.0001" value="${e.reglages.tauxChange}"><i>CHF</i></span></label><small>Nombre de francs pour 1 euro.</small></div>
        <div class="champ"><label>Taux EUR/USD${configure() ? ' (actualisé automatiquement)' : ''}<span class="saisie avec-suffixe"><input type="number" id="tauxUSD" step="0.0001" value="${e.reglages.tauxUSD}"><i>USD</i></span></label><small>Nombre de dollars pour 1 euro.</small></div>
        <div class="champ" style="display:flex;flex-direction:column;gap:.8rem;justify-content:center">
          <label class="interrupteur"><input type="checkbox" id="front" ${e.reglages.frontalier ? 'checked' : ''}><span></span>Frontalier exonéré de CSG/CRDS</label>
          <label class="interrupteur"><input type="checkbox" id="prev" ${e.reglages.inclurePrevoyance ? 'checked' : ''}><span></span>Inclure la prévoyance suisse dans le patrimoine net</label>
        </div>
      </div>
    </div>

    <div class="carte" style="margin-top:1rem">
      <div class="entre-deux">
        <div><h3>Repartir de zéro</h3><small>Efface toutes les données de ce navigateur. Téléchargez une sauvegarde avant.</small></div>
        <button class="btn danger" id="effacer">Tout effacer</button>
      </div>
    </div>

    <div class="encart info" style="margin-top:1rem">${icones.info.replace('<svg', '<svg width="18" height="18" style="flex:none"')}
      <p>Safari efface les données d'un site qui n'a pas été ouvert depuis 7 jours d'utilisation du navigateur. Sur iPhone et iPad, sauvegardez régulièrement, ou ajoutez le site à l'écran d'accueil.</p></div>`;

  cascade(vue);

  $('#exporter', vue).addEventListener('click', () => {
    exporter();
    toast('Sauvegarde téléchargée', 'succes');
    setTimeout(() => rendre(vue), 400);
  });

  const zone = $('#zone', vue);
  const traiter = async (fichier) => {
    if (!fichier) return;
    try {
      enAttente = await lireFichier(fichier);
      const d = enAttente;
      $('#apercu', vue).innerHTML = `
        <div class="encart succes" style="margin-top:1rem;flex-direction:column">
          <p><b>${esc(fichier.name)}</b><br>Sauvegarde du ${d.derniereSauvegarde ? dateHeure(d.derniereSauvegarde) : 'date inconnue'} :
          ${d.biens.length} bien(s), ${d.prets.length} crédit(s), ${d.enveloppes.length} enveloppe(s), ${d.pilier3.length} contrat(s) 3e pilier${d.lpp.actif ? ', LPP' : ''}, ${d.historique.length} point(s) d'historique.</p>
          <div class="pile" style="margin-top:.6rem"><button class="btn mini" id="confirmer">Remplacer mes données actuelles</button><button class="btn mini discret" id="abandon">Annuler</button></div>
        </div>`;
      $('#confirmer', vue).addEventListener('click', () => {
        restaurer(enAttente);
        enAttente = null;
        toast('Données restaurées', 'succes');
        location.hash = '#/patrimoine';
      });
      $('#abandon', vue).addEventListener('click', () => ($('#apercu', vue).innerHTML = ''));
    } catch (err) {
      $('#apercu', vue).innerHTML = `<div class="encart alerte" style="margin-top:1rem"><p>${esc(err.message)}</p></div>`;
    }
  };
  $('#fichier', vue).addEventListener('change', (ev) => traiter(ev.target.files[0]));
  zone.addEventListener('dragover', (ev) => { ev.preventDefault(); zone.style.borderColor = 'var(--lac-vif)'; zone.style.background = 'var(--lac-clair)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; zone.style.background = ''; });
  zone.addEventListener('drop', (ev) => { ev.preventDefault(); zone.style.borderColor = ''; zone.style.background = ''; traiter(ev.dataTransfer.files[0]); });

  $('#annuler', vue)?.addEventListener('click', () => {
    annulerImport();
    toast('Données précédentes rétablies', 'succes');
    rendre(vue);
  });

  $('#age', vue).addEventListener('change', (ev) => { const v = +ev.target.value; if (v >= 16 && v <= 80) reglage((r) => (r.age = v)); });
  $('#tauxUSD', vue).addEventListener('change', (ev) => { const v = +ev.target.value; if (v > 0.5 && v < 2.5) { reglage((r) => { r.tauxUSD = v; }); toast('Taux enregistré'); } });
  $('#taux', vue).addEventListener('change', (ev) => { const v = +ev.target.value; if (v > 0.5 && v < 2) { reglage((r) => { r.tauxChange = v; r.tauxChangeLe = null; }); toast('Taux enregistré'); } });
  $('#front', vue).addEventListener('change', (ev) => reglage((r) => (r.frontalier = ev.target.checked)));
  $('#prev', vue).addEventListener('change', (ev) => reglage((r) => (r.inclurePrevoyance = ev.target.checked)));

  $('#effacer', vue).addEventListener('click', () => {
    if (!confirm('Effacer toutes vos données de ce navigateur ? Sans sauvegarde, elles seront perdues.')) return;
    reinitialiser(true);
    toast('Données effacées');
    rendre(vue);
  });
}

const stat = (libelle, valeur, sous, alerte = false) => `
  <div><div style="font-size:.78rem;color:#b9cbe0">${libelle}</div>
  <div style="font-size:1.25rem;font-weight:720;color:${alerte ? '#fca5a5' : '#fff'}">${valeur}</div>
  <div style="font-size:.76rem;color:#8fa6bf">${sous}</div></div>`;
