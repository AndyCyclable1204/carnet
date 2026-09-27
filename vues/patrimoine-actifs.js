import { lire, modifier, reglage, uid, valeurEnveloppe, ancienneteAnnees } from '../js/store.js';
import { etatPret, fiscaliteSortie, valeurFuture, FISCAL } from '../js/finance.js';
import { money, pct, dateFr, dateHeure, esc, convertir } from '../js/format.js';
import { $, $$, formulaire, toast } from '../js/ui.js';
import { icones } from '../js/icones.js';
import { cours, configure } from '../js/marche.js';

const badge = (d) => `<span class="devise ${String(d || 'EUR').toLowerCase()}">${d || 'EUR'}</span>`;
const ico = (i, fond, couleur) => `<span class="pastille-icone" style="background:${fond};color:${couleur}">${i}</span>`;

/* ================================================================ immobilier & crédits */

const CHAMPS_BIEN = [
  { cle: 'nom', libelle: 'Nom', type: 'text', requis: true },
  { cle: 'type', libelle: 'Type', type: 'select', options: ['Résidence principale', 'Locatif', 'Résidence secondaire', 'Terrain', 'Parking', 'Autre'] },
  { cle: 'devise', libelle: 'Devise', type: 'devise' },
  { cle: 'valeur', libelle: 'Valeur estimée aujourd\'hui', type: 'number', requis: true },
  { cle: 'loyer', libelle: 'Loyer perçu par mois (facultatif)', type: 'number' },
];

const champsPret = () => [
  { cle: 'nom', libelle: 'Nom du crédit', type: 'text', requis: true },
  { cle: 'bienId', libelle: 'Bien financé', type: 'select', options: [['', 'Aucun'], ...lire().biens.map((b) => [b.id, b.nom])] },
  { cle: 'devise', libelle: 'Devise du crédit', type: 'devise', aide: 'Un crédit en CHF est converti au taux du jour dans vos totaux.' },
  { cle: 'capitalRestant', libelle: 'Capital restant dû', type: 'number', requis: true },
  { cle: 'dateReleve', libelle: 'À la date du', type: 'date', requis: true, aide: 'Date de votre dernier relevé ou tableau d\'amortissement.' },
  { cle: 'moisRestants', libelle: 'Mensualités restantes à cette date', type: 'number', requis: true, suffixe: 'mois' },
  { cle: 'tauxAnnuel', libelle: 'Taux annuel hors assurance', type: 'pct', requis: true, pas: 0.01 },
];

export function panneauImmobilier(el, rafraichir) {
  const e = lire();
  const dev = e.reglages.devise;
  const t = e.reglages.tauxChange;
  const f = (v, d) => money(v, d || 'EUR');
  const prets = e.prets.map((p) => ({ ...p, c: etatPret(p) }));

  el.innerHTML = `
  <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))" data-cascade>
    <div class="carte">
      <div class="carte-tete"><h3>${ico(icones.maison, 'var(--sable-clair)', '#8a6414')} Biens immobiliers</h3>
        <button class="btn mini" data-ajout="bien">${icones.plus.replace('<svg', '<svg width="14" height="14"')} Ajouter</button></div>
      <div class="liste-elements">
        ${e.biens.length ? e.biens.map((b) => {
          const dette = prets.filter((p) => p.bienId === b.id).reduce((s, p) => s + convertir(p.c.capitalRestant, p.devise, b.devise || 'EUR', t), 0);
          return `<div class="element" data-modif-bien="${b.id}">
            ${ico(icones.immeuble, 'var(--sable-clair)', '#8a6414')}
            <div><div class="titre">${esc(b.nom)} ${badge(b.devise)}</div><div class="detail">${esc(b.type || '')}${b.loyer ? ` · ${f(b.loyer, b.devise)} de loyer / mois` : ''}</div></div>
            <div class="montant">${f(b.valeur, b.devise)}<small>${dette ? `équité ${f(b.valeur - dette, b.devise)}` : 'sans crédit'}</small></div>
          </div>`;
        }).join('') : `<div class="vide">${icones.maison}<p>Ajoutez votre résidence principale ou un bien locatif.</p></div>`}
      </div>
    </div>

    <div class="carte">
      <div class="carte-tete"><h3>${ico(icones.credit, 'var(--lac-clair)', 'var(--lac)')} Crédits</h3>
        <button class="btn mini" data-ajout="pret">${icones.plus.replace('<svg', '<svg width="14" height="14"')} Ajouter</button></div>
      <div class="liste-elements">
        ${prets.length ? prets.map((p) => {
          const bien = e.biens.find((b) => b.id === p.bienId);
          const fin = new Date(); fin.setMonth(fin.getMonth() + p.c.moisRestants);
          return `<div class="element" data-modif-pret="${p.id}">
            ${ico(icones.credit, 'var(--lac-clair)', 'var(--lac)')}
            <div><div class="titre">${esc(p.nom)} ${badge(p.devise)}</div>
              <div class="detail">${pct(p.tauxAnnuel)} · ${f(p.c.mensualite, p.devise)}/mois dont ${f(p.c.amortiMensuel, p.devise)} de capital${bien ? ` · ${esc(bien.nom)}` : ''}</div>
              <div class="detail">Fin ${p.c.moisRestants ? fin.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'atteinte'}${p.c.estime ? ` · estimé depuis le ${dateFr(p.dateReleve)}` : ''}</div></div>
            <div class="montant neg">${f(p.c.capitalRestant, p.devise)}<small>restant dû</small></div>
          </div>`;
        }).join('') : `<div class="vide">${icones.credit}<p>Aucun crédit. Un prêt en francs suisses se saisit comme un prêt en euros.</p></div>`}
      </div>
      ${prets.length ? '<small style="display:block;margin-top:.8rem">Le capital restant dû est recalculé chaque mois à partir de votre dernier relevé. Mettez-le à jour une fois par an avec le chiffre de la banque.</small>' : ''}
    </div>
  </div>`;

  el.addEventListener('click', async (ev) => {
    const a = ev.target.closest('[data-ajout]')?.dataset.ajout;
    const idBien = ev.target.closest('[data-modif-bien]')?.dataset.modifBien;
    const idPret = ev.target.closest('[data-modif-pret]')?.dataset.modifPret;

    if (a === 'bien' || idBien) {
      const b = e.biens.find((x) => x.id === idBien);
      const r = await formulaire({ titre: b ? 'Modifier le bien' : 'Ajouter un bien', champs: CHAMPS_BIEN, valeurs: b || { devise: 'EUR', type: 'Résidence principale' }, supprimable: !!b });
      if (!r) return;
      modifier((s) => {
        if (r.action === 'supprimer') {
          s.biens = s.biens.filter((x) => x.id !== idBien);
          s.prets.forEach((p) => p.bienId === idBien && (p.bienId = ''));
        } else if (b) Object.assign(s.biens.find((x) => x.id === idBien), r.valeurs);
        else s.biens.push({ id: uid(), ...r.valeurs });
      });
      toast(r.action === 'supprimer' ? 'Bien supprimé' : 'Bien enregistré', 'succes');
      rafraichir();
    }

    if (a === 'pret' || idPret) {
      const p = e.prets.find((x) => x.id === idPret);
      const r = await formulaire({
        titre: p ? 'Modifier le crédit' : 'Ajouter un crédit', champs: champsPret(),
        valeurs: p || { devise: 'EUR', dateReleve: new Date().toISOString().slice(0, 10) }, supprimable: !!p,
      });
      if (!r) return;
      modifier((s) => {
        if (r.action === 'supprimer') s.prets = s.prets.filter((x) => x.id !== idPret);
        else if (p) Object.assign(s.prets.find((x) => x.id === idPret), r.valeurs);
        else s.prets.push({ id: uid(), ...r.valeurs });
      });
      toast(r.action === 'supprimer' ? 'Crédit supprimé' : 'Crédit enregistré', 'succes');
      rafraichir();
    }
  });
}

/* ================================================================ placements */

const TYPES = ['PEA', 'CTO', 'Assurance-vie', 'PER', 'Livret', 'Compte épargne CH', 'Compte titres CH', 'Crypto', 'Autre'];

const champsEnveloppe = [
  { cle: 'nom', libelle: 'Nom', type: 'text', requis: true },
  { cle: 'type', libelle: 'Type', type: 'select', options: TYPES },
  { cle: 'devise', libelle: 'Devise', type: 'devise' },
  { cle: 'etablissement', libelle: 'Établissement (facultatif)', type: 'text' },
  { cle: 'valeur', libelle: 'Valeur actuelle', type: 'number', requis: true, visible: (v) => true, aide: 'En mode avancé, la valeur est calculée à partir des lignes.' },
  { cle: 'verses', libelle: 'Total des versements effectués', type: 'number', aide: 'Sert à calculer la plus-value et la fiscalité de sortie.' },
  { cle: 'versementMensuel', libelle: 'Versement mensuel', type: 'number' },
  { cle: 'rendement', libelle: 'Performance annuelle moyenne attendue', type: 'pct', pas: 0.1 },
  { cle: 'dateOuverture', libelle: "Date d'ouverture", type: 'date', visible: (v) => v.type === 'PEA', aide: 'Après 5 ans, le PEA est exonéré d\'impôt sur le revenu.' },
];

const CHAMPS_LIGNE = [
  { cle: 'libelle', libelle: 'Libellé', type: 'text', requis: true },
  { cle: 'symbole', libelle: 'Symbole Yahoo Finance (facultatif)', type: 'text', aide: 'Mnémonique + suffixe de la place : CW8.PA (Paris), IWDA.AS (Amsterdam), NESN.SW (Zurich).' },
  { cle: 'quantite', libelle: 'Quantité', type: 'number', requis: true, pas: 0.0001 },
  { cle: 'prixRevient', libelle: 'Prix de revient unitaire', type: 'number', pas: 0.01 },
];

export function panneauPlacements(el, rafraichir) {
  const e = lire();
  const front = e.reglages.frontalier;

  el.innerHTML = `
    <div class="entre-deux" style="margin-bottom:1rem">
      <label class="interrupteur"><input type="checkbox" id="frontalier" ${front ? 'checked' : ''}><span></span>Statut frontalier (exonération de CSG/CRDS)</label>
      <div class="pile">
        ${e.enveloppes.some((x) => x.mode === 'avance' && x.lignes.some((l) => l.symbole)) ? `<button class="btn discret mini" id="majCours">${icones.rafraichir.replace('<svg', '<svg width="14" height="14"')} Actualiser les cours</button>` : ''}
        <button class="btn" data-ajout="enveloppe">${icones.plus.replace('<svg', '<svg width="16" height="16"')} Ajouter une enveloppe</button>
      </div>
    </div>
    <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))" data-cascade>
      ${e.enveloppes.length ? e.enveloppes.map((x) => carteEnveloppe(x, front)).join('') : `<div class="carte"><div class="vide">${icones.enveloppe}<p>Ajoutez votre PEA, une assurance-vie, un compte titres ou un compte d'épargne suisse.</p></div></div>`}
    </div>
    <small style="display:block;margin-top:1rem">Fiscalité ${FISCAL.annee} : prélèvements sociaux de ${pct(FISCAL.psPlacements, 1)} sur les gains du PEA et du CTO ; ${pct(FISCAL.solidarite, 1)} seulement (prélèvement de solidarité) si vous êtes exonéré de CSG/CRDS. L'exonération est acquise pour les frontaliers affiliés à la LAMal ; pour les affiliés à la CMU, les sources divergent : vérifiez auprès de votre banque. Les gains antérieurs à 2026 restent taxés à 17,2 % : le calcul applique le taux 2026 à l'ensemble, il est donc légèrement prudent.</small>`;

  $('#frontalier', el).addEventListener('change', (ev) => {
    reglage((r) => (r.frontalier = ev.target.checked));
    rafraichir();
  });

  $('#majCours', el)?.addEventListener('click', async (ev) => {
    const bouton = ev.currentTarget;
    if (!configure()) return toast('Renseignez config.js pour activer les cours automatiques.', 'erreur');
    const symboles = [...new Set(e.enveloppes.flatMap((x) => (x.mode === 'avance' ? x.lignes.map((l) => l.symbole) : [])).filter(Boolean))];
    bouton.disabled = true;
    bouton.innerHTML = '<span class="tourne"></span> Mise à jour…';
    try {
      const { cotations } = await cours(symboles);
      const trouves = new Map(cotations.filter((c) => c.prix).map((c) => [c.symbole, c]));
      modifier((s) => s.enveloppes.forEach((x) => x.lignes.forEach((l) => {
        const c = trouves.get(String(l.symbole || '').toUpperCase());
        if (c) { l.dernierPrix = c.prix; l.devisePrix = c.devise; l.dernierPrixLe = new Date().toISOString(); }
      })));
      const manquants = symboles.filter((s) => !trouves.has(s.toUpperCase()));
      toast(manquants.length ? `Introuvable : ${manquants.join(', ')}` : 'Cours actualisés', manquants.length ? 'erreur' : 'succes');
    } catch (err) {
      toast(err.message, 'erreur');
    }
    rafraichir();
  });

  el.addEventListener('click', async (ev) => {
    const cible = ev.target.closest('[data-ajout],[data-modif-env],[data-mode],[data-ajout-ligne],[data-modif-ligne]');
    if (!cible) return;

    if (cible.dataset.ajout === 'enveloppe' || cible.dataset.modifEnv) {
      const x = e.enveloppes.find((y) => y.id === cible.dataset.modifEnv);
      const valeurs = x ? { ...x } : { type: 'PEA', devise: 'EUR', rendement: 0.06, versementMensuel: 0 };
      const r = await formulaire({ titre: x ? `Modifier ${x.nom}` : 'Ajouter une enveloppe', champs: champsEnveloppe, valeurs, supprimable: !!x });
      if (!r) return;
      modifier((s) => {
        if (r.action === 'supprimer') s.enveloppes = s.enveloppes.filter((y) => y.id !== x.id);
        else if (x) Object.assign(s.enveloppes.find((y) => y.id === x.id), r.valeurs);
        else {
          const v = r.valeurs;
          if (/CH$/.test(v.type) && v.devise === 'EUR') v.devise = 'CHF';
          s.enveloppes.push({ id: uid(), mode: 'simple', lignes: [], especes: 0, ...v });
        }
      });
      toast('Enveloppe enregistrée', 'succes');
      return rafraichir();
    }

    if (cible.dataset.mode) {
      modifier((s) => {
        const x = s.enveloppes.find((y) => y.id === cible.dataset.mode);
        x.mode = x.mode === 'avance' ? 'simple' : 'avance';
      });
      return rafraichir();
    }

    if (cible.dataset.ajoutLigne || cible.dataset.modifLigne) {
      const [idEnv, idLigne] = (cible.dataset.modifLigne || cible.dataset.ajoutLigne + ':').split(':');
      const x = e.enveloppes.find((y) => y.id === idEnv);
      const l = x.lignes.find((y) => y.id === idLigne);
      const champs = [...CHAMPS_LIGNE];
      if (!l && !x.lignes.length) champs.push({ cle: 'especes', libelle: 'Liquidités non investies sur l\'enveloppe', type: 'number' });
      const r = await formulaire({ titre: l ? 'Modifier la ligne' : `Ajouter une ligne à ${x.nom}`, champs, valeurs: l || { especes: x.especes }, supprimable: !!l });
      if (!r) return;
      modifier((s) => {
        const env = s.enveloppes.find((y) => y.id === idEnv);
        if (r.valeurs?.especes != null) { env.especes = r.valeurs.especes; delete r.valeurs.especes; }
        if (r.valeurs?.symbole) r.valeurs.symbole = r.valeurs.symbole.trim().toUpperCase();
        if (r.action === 'supprimer') env.lignes = env.lignes.filter((y) => y.id !== idLigne);
        else if (l) Object.assign(env.lignes.find((y) => y.id === idLigne), r.valeurs);
        else env.lignes.push({ id: uid(), ...r.valeurs });
      });
      rafraichir();
    }
  });
}

function carteEnveloppe(x, frontalier) {
  const d = x.devise || 'EUR';
  const f = (v) => money(v, d);
  const valeur = valeurEnveloppe(x);
  const verses = +x.verses || 0;
  const gain = verses ? valeur - verses : null;
  const anciennete = ancienneteAnnees(x.dateOuverture);
  const fisc = fiscaliteSortie({ type: x.type, valeur, verses: verses || valeur, ancienneteAnnees: anciennete, frontalier });
  const dans10 = valeurFuture({ capital: valeur, versementMensuel: +x.versementMensuel || 0, rendement: +x.rendement || 0, mois: 120 });
  const avance = x.mode === 'avance';

  const corpsSimple = `
    <div class="grille g4" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.8rem">
      ${mini('Valeur', f(valeur))}
      ${mini('Versé', verses ? f(verses) : '—')}
      ${mini('Plus-value', gain === null ? '—' : `<span class="${gain < 0 ? 'neg' : 'pos'}">${gain >= 0 ? '+' : '−'}${f(Math.abs(gain))}</span>`)}
      ${mini('Dans 10 ans', f(dans10), `${f(x.versementMensuel || 0)}/mois à ${pct(x.rendement || 0, 1)}`)}
    </div>`;

  const corpsAvance = `
    ${x.lignes.length ? `<div class="table-cadre"><table>
      <thead><tr><th>Ligne</th><th class="nb">Qté</th><th class="nb">Cours</th><th class="nb">Valeur</th><th class="nb">+/-</th></tr></thead>
      <tbody>${x.lignes.map((l) => {
        const cours = +l.dernierPrix || +l.prixRevient || 0;
        const v = (+l.quantite || 0) * cours;
        const pr = (+l.quantite || 0) * (+l.prixRevient || 0);
        const ec = pr ? v - pr : null;
        return `<tr data-modif-ligne="${x.id}:${l.id}" style="cursor:pointer">
          <td><div class="nom-ligne">${esc(l.libelle)}<small>${esc(l.symbole || 'sans symbole')}${l.dernierPrixLe ? ' · ' + dateHeure(l.dernierPrixLe) : l.symbole ? ' · cours non actualisé' : ''}</small></div></td>
          <td class="nb">${+l.quantite}</td><td class="nb">${cours.toFixed(2)}${l.devisePrix && l.devisePrix !== d ? ` <small>${esc(l.devisePrix)}</small>` : ''}</td>
          <td class="nb"><b>${f(v)}</b></td>
          <td class="nb ${ec < 0 ? 'neg' : 'pos'}">${ec === null ? '—' : `${ec >= 0 ? '+' : '−'}${f(Math.abs(ec))}<br><small>${pr ? pct(ec / pr, 1) : ''}</small>`}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="vide" style="padding:1.3rem"><p>Aucune ligne. Ajoutez vos ETF ou actions pour un suivi au cours du jour.</p></div>'}
    <div class="entre-deux" style="margin-top:.7rem"><small>Liquidités : ${f(x.especes || 0)}</small>
      <button class="btn mini discret" data-ajout-ligne="${x.id}">${icones.plus.replace('<svg', '<svg width="13" height="13"')} Ajouter une ligne</button></div>`;

  return `
  <div class="carte">
    <div class="carte-tete">
      <h3>${ico(icones.enveloppe, 'var(--sapin-clair)', 'var(--sapin)')} <span>${esc(x.nom)}<small style="display:block;font-weight:500">${esc(x.type)}${x.etablissement ? ' · ' + esc(x.etablissement) : ''}</small></span> ${badge(d)}</h3>
      <div class="pile">
        <label class="interrupteur" style="font-size:.8rem" title="Détail ligne à ligne"><input type="checkbox" data-mode="${x.id}" ${avance ? 'checked' : ''}><span></span>Détail des lignes</label>
        <button class="btn mini discret" data-modif-env="${x.id}">Modifier</button>
      </div>
    </div>
    ${avance ? `<div style="font-size:1.6rem;font-weight:750;letter-spacing:-.02em;margin:-.3rem 0 .8rem">${f(valeur)}</div>${corpsAvance}` : corpsSimple}
    ${fisc ? `<div class="ligne-fiscale">
        <div><span>Retrait total aujourd'hui</span><b>${f(valeur)}</b></div>
        <div><span>Plus-value imposable</span><b>${f(fisc.gain)}</b></div>
        <div><span>Prélèvements (${pct(fisc.taux, 1)})</span><b class="neg">−${f(fisc.impot)}</b></div>
        <div><span>Net perçu</span><b class="pos">${f(fisc.net)}</b></div>
      </div>
      <small style="display:block;margin-top:.45rem">${x.type === 'PEA'
        ? (anciennete >= 5 ? `PEA de plus de 5 ans : pas d'impôt sur le revenu, seulement les prélèvements ${frontalier ? 'de solidarité (frontalier)' : 'sociaux'}.` : `PEA de moins de 5 ans (${anciennete.toFixed(1).replace('.', ',')} an) : impôt de 12,8 % en plus des prélèvements, et clôture du plan.`)
        : `Compte titres : prélèvement forfaitaire unique${frontalier ? ' avec exonération de CSG/CRDS' : ''}.`}${!verses ? ' Renseignez vos versements pour un calcul exact.' : ''}</small>` : ''}
  </div>`;
}

const mini = (libelle, valeur, sous = '') => `
  <div><div style="font-size:.76rem;color:var(--encre-2);font-weight:550">${libelle}</div>
  <div style="font-size:1.15rem;font-weight:720;letter-spacing:-.01em">${valeur}</div>${sous ? `<div style="font-size:.74rem;color:var(--encre-3)">${sous}</div>` : ''}</div>`;
