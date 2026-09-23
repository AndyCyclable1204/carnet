import { sb, exigeConnexion, deconnexion, fonction, messageErreur } from './supabase.js';
import { amortissementFutur, mensualite, projection, patrimoineNet } from './finance.js';
import { eur, nb, pct1, date as fdate, $, couleurs } from './format.js';

Chart.defaults.font.family = 'IBM Plex Sans, system-ui, sans-serif';
Chart.defaults.color = '#55625c';

const etat = { user: null, biens: [], prets: [], comptes: [], positions: [], releves: [] };
const graphiques = {};

/* ---------------------------------------------------------------- outils */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auj = () => new Date().toISOString().slice(0, 10);

function moisEntre(a, b) {
  const d1 = new Date(a), d2 = new Date(b);
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

// Capital restant dû aujourd'hui, déduit du dernier relevé connu.
function etatPret(p) {
  const taux = +p.taux_annuel || 0;
  const duree = +p.duree_mois || 0;
  const capitalRef = +p.capital_restant || 0;
  const dateRef = p.date_capital_restant || p.date_debut || auj();
  const ecoulesRef = p.date_debut ? Math.max(0, moisEntre(p.date_debut, dateRef)) : 0;
  const moisRestantsRef = Math.max(1, duree - ecoulesRef);
  const depuis = Math.min(Math.max(0, moisEntre(dateRef, auj())), moisRestantsRef);

  const suite = amortissementFutur({
    capitalRestant: capitalRef,
    tauxAnnuel: taux,
    moisRestants: moisRestantsRef,
    horizonMois: depuis,
  });
  const crd = Math.max(0, suite.capitalRestantFin);
  const m = mensualite(capitalRef, taux, moisRestantsRef);
  return {
    ...p,
    capital_restant: crd,
    capital_restant_saisi: capitalRef,
    mensualite: m,
    amortiMensuel: Math.max(0, m - (crd * taux) / 12),
    moisRestants: Math.max(0, moisRestantsRef - depuis),
    recalcule: depuis > 0,
  };
}

const valeurPosition = (p) => (+p.quantite || 0) * (+p.dernier_prix || +p.prix_revient || 0);

function agregats() {
  const prets = etat.prets.map(etatPret);
  const a = patrimoineNet({ biens: etat.biens, prets, comptes: etat.comptes, positions: etat.positions });
  a.amortiMensuel = prets.reduce((s, p) => s + p.amortiMensuel, 0);
  a.prets = prets;
  return a;
}

/* ------------------------------------------------------------- chargement */

async function charger() {
  const [b, p, c, po, r] = await Promise.all([
    sb.from('biens').select('*').order('nom'),
    sb.from('prets').select('*').order('nom'),
    sb.from('comptes').select('*').order('nom'),
    sb.from('positions').select('*').order('libelle'),
    sb.from('releves').select('*').order('date_releve'),
  ]);
  for (const res of [b, p, c, po, r]) if (res.error) throw res.error;
  etat.biens = b.data; etat.prets = p.data; etat.comptes = c.data; etat.positions = po.data; etat.releves = r.data;
}

function toutRendre() {
  rendreSynthese();
  rendreBiens();
  rendrePrets();
  rendreComptes();
  rendreHistorique();
}

/* --------------------------------------------------------------- synthèse */

function rendreSynthese() {
  const a = agregats();
  $('sNet').textContent = eur(a.net);
  $('sImmo').textContent = eur(a.equiteImmo);
  $('sImmoDetail').textContent = `${eur(a.immobilier)} de valeur, ${etat.biens.length} bien${etat.biens.length > 1 ? 's' : ''}`;
  $('sFin').textContent = eur(a.financier);
  $('sFinDetail').textContent = `${eur(a.titres)} de titres, ${eur(a.especes)} de liquidités`;
  $('sDette').textContent = eur(a.dette);
  $('sDetteDetail').textContent = `${a.prets.length} prêt${a.prets.length > 1 ? 's' : ''} en cours`;
  $('sAmorti').textContent = eur(a.amortiMensuel);

  const precedent = etat.releves.at(-1);
  $('sEvolution').innerHTML = precedent
    ? `<span class="delta">${a.net - precedent.net >= 0 ? '+ ' : '− '}${eur(Math.abs(a.net - precedent.net))}</span> depuis le point du ${fdate(precedent.date_releve)}`
    : '<small>Enregistrez un premier point dans l\'onglet Historique pour suivre l\'évolution.</small>';

  dessine('gRepartition', {
    type: 'doughnut',
    data: {
      labels: ['Immobilier net', 'Titres', 'Liquidités'],
      datasets: [{
        data: [Math.max(0, a.equiteImmo), a.titres, a.especes],
        backgroundColor: [couleurs.immobilier, couleurs.financier, couleurs.especes],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { label: (c) => `${c.label} : ${eur(c.raw)} (${pct1(c.raw / Math.max(1, a.net))})` } },
      },
    },
  });

  rendreProjection(a);
}

function rendreProjection(a) {
  const annees = +$('pjDuree').value;
  $('pjVDuree').textContent = annees + ' an' + (annees > 1 ? 's' : '');
  const r = projection({
    capitalInitial: a.financier,
    epargneMensuelle: +$('pjEpargne').value || 0,
    rendement: (+$('pjRendement').value || 0) / 100,
    annees,
    amortiMensuel: a.amortiMensuel,
    equiteImmo: a.equiteImmo,
  });
  $('pjTotal').textContent = eur(r.total);

  dessine('gProjection', {
    type: 'line',
    data: {
      labels: r.series.map((p) => p.annee),
      datasets: [
        { label: 'Immobilier net', data: r.series.map((p) => p.immobilier), couleur: couleurs.immobilier },
        { label: 'Crédit amorti', data: r.series.map((p) => p.amorti), couleur: couleurs.amorti },
        { label: 'Placements', data: r.series.map((p) => p.financier), couleur: couleurs.financier },
      ].map((j) => ({
        label: j.label, data: j.data, borderColor: j.couleur, backgroundColor: j.couleur + '55',
        fill: true, borderWidth: 1.5, pointRadius: 0, tension: 0.25,
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label} : ${eur(c.raw)}`,
            footer: (i) => 'Total : ' + eur(i.reduce((s, x) => s + x.raw, 0)),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'années' } },
        y: { stacked: true, grid: { color: couleurs.trait }, border: { display: false }, ticks: { callback: (v) => nb(v / 1000) + ' k' } },
      },
    },
  });
}

function dessine(id, config) {
  if (graphiques[id]) {
    graphiques[id].data = config.data;
    graphiques[id].update();
  } else {
    graphiques[id] = new Chart($(id).getContext('2d'), config);
  }
}

/* ------------------------------------------------------------- listes */

function tableau(colonnes, lignes, vide) {
  if (!lignes.length) return `<div class="vide">${vide}</div>`;
  return `<table><thead><tr>${colonnes
    .map((c) => `<th class="${c.nombre ? 'nombre' : ''}">${c.titre}</th>`)
    .join('')}</tr></thead><tbody>${lignes.join('')}</tbody></table>`;
}

function rendreBiens() {
  const cols = [
    { titre: 'Bien' }, { titre: 'Type' }, { titre: 'Valeur', nombre: true },
    { titre: 'Dette', nombre: true }, { titre: 'Équité nette', nombre: true }, { titre: '' },
  ];
  const prets = etat.prets.map(etatPret);
  const lignes = etat.biens.map((b) => {
    const dette = prets.filter((p) => p.bien_id === b.id).reduce((s, p) => s + p.capital_restant, 0);
    return `<tr>
      <td>${esc(b.nom)}${b.loyer_mensuel ? `<br><small>${eur(b.loyer_mensuel)} de loyer / mois</small>` : ''}</td>
      <td>${esc(b.type || '—')}</td>
      <td class="nombre">${eur(b.valeur)}</td>
      <td class="nombre">${dette ? eur(dette) : '—'}</td>
      <td class="nombre"><b>${eur((+b.valeur || 0) - dette)}</b></td>
      <td class="nombre"><button class="bouton discret mini" data-modif="biens" data-id="${b.id}">Modifier</button></td>
    </tr>`;
  });
  $('tBiens').innerHTML = tableau(cols, lignes, 'Aucun bien enregistré. Ajoutez votre résidence principale ou un locatif pour commencer.');
}

function rendrePrets() {
  const cols = [
    { titre: 'Prêt' }, { titre: 'Capital restant', nombre: true }, { titre: 'Mensualité', nombre: true },
    { titre: 'Dont capital', nombre: true }, { titre: 'Fin', nombre: true }, { titre: '' },
  ];
  const lignes = etat.prets.map(etatPret).map((p) => {
    const bien = etat.biens.find((b) => b.id === p.bien_id);
    const fin = new Date();
    fin.setMonth(fin.getMonth() + p.moisRestants);
    return `<tr>
      <td>${esc(p.nom)}${bien ? `<br><small>${esc(bien.nom)}</small>` : ''}</td>
      <td class="nombre">${eur(p.capital_restant)}${p.recalcule ? '<br><small>estimé depuis ' + fdate(p.date_capital_restant) + '</small>' : ''}</td>
      <td class="nombre">${eur(p.mensualite)}</td>
      <td class="nombre">${eur(p.amortiMensuel)}</td>
      <td class="nombre">${p.moisRestants ? fin.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : 'soldé'}</td>
      <td class="nombre"><button class="bouton discret mini" data-modif="prets" data-id="${p.id}">Modifier</button></td>
    </tr>`;
  });
  $('tPrets').innerHTML = tableau(cols, lignes, 'Aucun prêt enregistré.');
}

function rendreComptes() {
  if (!etat.comptes.length) {
    $('listeComptes').innerHTML = '<div class="panneau"><div class="vide">Aucune enveloppe. Ajoutez votre PEA, votre assurance-vie ou un livret.</div></div>';
    return;
  }
  $('listeComptes').innerHTML = etat.comptes
    .map((c) => {
      const lignes = etat.positions.filter((p) => p.compte_id === c.id);
      const titres = lignes.reduce((s, p) => s + valeurPosition(p), 0);
      const total = titres + (+c.solde_especes || 0);
      const corps = lignes.length
        ? `<div class="defilant"><table><thead><tr><th>Ligne</th><th class="nombre">Quantité</th><th class="nombre">Cours</th><th class="nombre">Valeur</th><th class="nombre">+/-</th><th></th></tr></thead><tbody>${lignes
            .map((p) => {
              const pr = (+p.quantite || 0) * (+p.prix_revient || 0);
              const v = valeurPosition(p);
              const ecart = pr ? v - pr : 0;
              return `<tr>
                <td>${esc(p.libelle)}${p.symbole ? `<br><small>${esc(p.symbole)}${p.dernier_prix_le ? ' · ' + fdate(p.dernier_prix_le) : ''}</small>` : ''}</td>
                <td class="nombre">${nb(p.quantite)}</td>
                <td class="nombre">${(+p.dernier_prix || +p.prix_revient || 0).toFixed(2)}</td>
                <td class="nombre"><b>${eur(v)}</b></td>
                <td class="nombre" style="color:${ecart >= 0 ? 'var(--vert)' : 'var(--brique)'}">${pr ? (ecart >= 0 ? '+' : '−') + eur(Math.abs(ecart)) : '—'}</td>
                <td class="nombre"><button class="bouton discret mini" data-modif="positions" data-id="${p.id}">Modifier</button></td>
              </tr>`;
            })
            .join('')}</tbody></table></div>`
        : '<div class="vide">Aucune ligne. Ajoutez vos ETF ou laissez l\'enveloppe en liquidités.</div>';
      return `<div class="panneau" style="margin-bottom:1rem">
        <div class="entre" style="margin-bottom:0.8rem">
          <div><h3 style="margin:0">${esc(c.nom)}</h3><small>${esc(c.type || '')}${c.etablissement ? ' · ' + esc(c.etablissement) : ''} · ${eur(c.solde_especes)} en liquidités</small></div>
          <div class="pile"><span class="montant" style="font-family:var(--serif);font-size:1.4rem">${eur(total)}</span>
          <button class="bouton discret mini" data-modif="comptes" data-id="${c.id}">Modifier</button>
          <button class="bouton mini" data-ajout="positions" data-compte="${c.id}">Ajouter une ligne</button></div>
        </div>${corps}</div>`;
    })
    .join('');
}

function rendreHistorique() {
  const r = etat.releves;
  dessine('gHisto', {
    type: 'line',
    data: {
      labels: r.map((x) => fdate(x.date_releve)),
      datasets: [
        { label: 'Patrimoine net', data: r.map((x) => x.net), borderColor: couleurs.encre, backgroundColor: '#101b1715', fill: true, tension: 0.25, borderWidth: 2, pointRadius: 3 },
        { label: 'Immobilier net', data: r.map((x) => x.immobilier - x.dette), borderColor: couleurs.immobilier, borderWidth: 1.5, pointRadius: 0, tension: 0.25 },
        { label: 'Placements', data: r.map((x) => x.financier), borderColor: couleurs.financier, borderWidth: 1.5, pointRadius: 0, tension: 0.25 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${eur(c.raw)}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: couleurs.trait }, border: { display: false }, ticks: { callback: (v) => nb(v / 1000) + ' k' } },
      },
    },
  });

  const cols = [{ titre: 'Date' }, { titre: 'Immobilier', nombre: true }, { titre: 'Placements', nombre: true }, { titre: 'Dette', nombre: true }, { titre: 'Net', nombre: true }];
  const lignes = [...r].reverse().map((x, i, arr) => {
    const suiv = arr[i + 1];
    const delta = suiv ? x.net - suiv.net : null;
    return `<tr>
      <td>${fdate(x.date_releve)}</td>
      <td class="nombre">${eur(x.immobilier)}</td>
      <td class="nombre">${eur(x.financier)}</td>
      <td class="nombre">${eur(x.dette)}</td>
      <td class="nombre"><b>${eur(x.net)}</b>${delta !== null ? `<br><small style="color:${delta >= 0 ? 'var(--vert)' : 'var(--brique)'}">${delta >= 0 ? '+' : '−'}${eur(Math.abs(delta))}</small>` : ''}</td>
    </tr>`;
  });
  $('tHisto').innerHTML = tableau(cols, lignes, 'Aucun point enregistré. Le premier fixe votre point de départ.');
}

/* ------------------------------------------------------- formulaire modal */

const SCHEMAS = {
  biens: {
    titre: 'un bien', table: 'biens',
    champs: [
      { cle: 'nom', libelle: 'Nom', type: 'text', requis: true },
      { cle: 'type', libelle: 'Type', type: 'select', options: ['Résidence principale', 'Locatif', 'Résidence secondaire', 'Terrain', 'Parking', 'Autre'] },
      { cle: 'valeur', libelle: 'Valeur estimée aujourd\'hui (€)', type: 'number', requis: true },
      { cle: 'prix_acquisition', libelle: 'Prix d\'achat (€)', type: 'number' },
      { cle: 'date_acquisition', libelle: 'Date d\'achat', type: 'date' },
      { cle: 'loyer_mensuel', libelle: 'Loyer perçu par mois (€)', type: 'number' },
    ],
  },
  prets: {
    titre: 'un prêt', table: 'prets',
    champs: [
      { cle: 'nom', libelle: 'Nom', type: 'text', requis: true },
      { cle: 'bien_id', libelle: 'Bien financé', type: 'reference', source: 'biens' },
      { cle: 'capital_initial', libelle: 'Capital emprunté (€)', type: 'number' },
      { cle: 'taux_annuel', libelle: 'Taux annuel hors assurance (%)', type: 'number', pas: '0.01', facteur: 100 },
      { cle: 'duree_mois', libelle: 'Durée totale (mois)', type: 'number' },
      { cle: 'date_debut', libelle: 'Date de première échéance', type: 'date' },
      { cle: 'capital_restant', libelle: 'Capital restant dû au dernier relevé (€)', type: 'number', requis: true },
      { cle: 'date_capital_restant', libelle: 'Date de ce relevé', type: 'date', requis: true },
    ],
  },
  comptes: {
    titre: 'une enveloppe', table: 'comptes',
    champs: [
      { cle: 'nom', libelle: 'Nom', type: 'text', requis: true },
      { cle: 'type', libelle: 'Type', type: 'select', options: ['PEA', 'Assurance-vie', 'CTO', 'PER', 'Livret', 'Compte courant', 'Crypto', 'Autre'] },
      { cle: 'etablissement', libelle: 'Établissement', type: 'text' },
      { cle: 'solde_especes', libelle: 'Liquidités non investies (€)', type: 'number' },
      { cle: 'versements_cumules', libelle: 'Versements cumulés (€, pour suivre un plafond)', type: 'number' },
    ],
  },
  positions: {
    titre: 'une ligne', table: 'positions',
    champs: [
      { cle: 'compte_id', libelle: 'Enveloppe', type: 'reference', source: 'comptes', requis: true },
      { cle: 'libelle', libelle: 'Libellé', type: 'text', requis: true },
      { cle: 'symbole', libelle: 'Symbole Yahoo Finance (facultatif)', type: 'text' },
      { cle: 'quantite', libelle: 'Quantité', type: 'number', pas: '0.0001', requis: true },
      { cle: 'prix_revient', libelle: 'Prix de revient unitaire', type: 'number', pas: '0.01' },
    ],
  },
};

let contexteFormulaire = null;

function ouvrirFormulaire(nom, ligne = null, prereglages = {}) {
  const schema = SCHEMAS[nom];
  contexteFormulaire = { nom, schema, id: ligne?.id ?? null };
  $('dTitre').textContent = (ligne ? 'Modifier ' : 'Ajouter ') + schema.titre;
  $('dMessage').textContent = '';
  $('dSupprimer').hidden = !ligne;

  $('dChamps').innerHTML = schema.champs
    .map((c) => {
      let brut = ligne?.[c.cle] ?? prereglages[c.cle] ?? '';
      if (brut !== '' && c.facteur) brut = +brut * c.facteur;
      const v = esc(brut);
      if (c.type === 'select') {
        return `<label class="champ"><span>${c.libelle}</span><select id="f_${c.cle}">${['', ...c.options]
          .map((o) => `<option value="${esc(o)}" ${o === brut ? 'selected' : ''}>${o || '—'}</option>`)
          .join('')}</select></label>`;
      }
      if (c.type === 'reference') {
        return `<label class="champ"><span>${c.libelle}</span><select id="f_${c.cle}"><option value="">—</option>${etat[c.source]
          .map((o) => `<option value="${o.id}" ${o.id === brut ? 'selected' : ''}>${esc(o.nom)}</option>`)
          .join('')}</select></label>`;
      }
      return `<label class="champ"><span>${c.libelle}</span><input type="${c.type}" id="f_${c.cle}" value="${v}" ${c.pas ? `step="${c.pas}"` : ''}></label>`;
    })
    .join('');

  $('dialogue').classList.add('ouvert');
}

function fermerFormulaire() {
  $('dialogue').classList.remove('ouvert');
  contexteFormulaire = null;
}

async function enregistrerFormulaire() {
  const { schema, id, nom } = contexteFormulaire;
  const objet = { profil_id: etat.user.id };
  for (const c of schema.champs) {
    let v = $(`f_${c.cle}`).value;
    if (v === '') {
      if (c.requis) return ($('dMessage').innerHTML = `<span class="avis alerte">Le champ « ${c.libelle} » est obligatoire.</span>`);
      objet[c.cle] = null;
      continue;
    }
    if (c.type === 'number') {
      v = +v;
      if (Number.isNaN(v)) return ($('dMessage').innerHTML = `<span class="avis alerte">« ${c.libelle} » doit être un nombre.</span>`);
      if (c.facteur) v = v / c.facteur;
    }
    objet[c.cle] = v;
  }
  if (id) objet.id = id;

  $('dEnregistrer').disabled = true;
  try {
    const { error } = await sb.from(schema.table).upsert(objet);
    if (error) throw error;
    await charger();
    toutRendre();
    fermerFormulaire();
  } catch (e) {
    $('dMessage').innerHTML = `<span class="avis alerte">${esc(messageErreur(e))}</span>`;
  } finally {
    $('dEnregistrer').disabled = false;
  }
}

async function supprimerLigne() {
  const { schema, id } = contexteFormulaire;
  if (!confirm('Supprimer définitivement cet élément ?')) return;
  const { error } = await sb.from(schema.table).delete().eq('id', id);
  if (error) return ($('dMessage').innerHTML = `<span class="avis alerte">${esc(messageErreur(error))}</span>`);
  await charger();
  toutRendre();
  fermerFormulaire();
}

/* ------------------------------------------------------------- actions */

async function actualiserCours() {
  const symboles = [...new Set(etat.positions.map((p) => p.symbole).filter(Boolean))];
  const bouton = $('majCours');
  if (!symboles.length) return alert('Aucune ligne ne porte de symbole boursier.');
  bouton.disabled = true;
  bouton.textContent = 'Mise à jour…';
  try {
    const { cotations } = await fonction('cotations', { symboles });
    const maj = [];
    for (const c of cotations) {
      if (!c.prix) continue;
      for (const p of etat.positions.filter((x) => x.symbole === c.symbole)) {
        maj.push({ ...p, dernier_prix: c.prix, dernier_prix_le: new Date().toISOString() });
      }
    }
    if (maj.length) {
      const { error } = await sb.from('positions').upsert(maj);
      if (error) throw error;
    }
    const manquants = cotations.filter((c) => !c.prix).map((c) => c.symbole);
    await charger();
    toutRendre();
    if (manquants.length) alert('Cours introuvable pour : ' + manquants.join(', ') + '. Vérifiez le symbole sur Yahoo Finance.');
  } catch (e) {
    alert('Mise à jour impossible : ' + messageErreur(e));
  } finally {
    bouton.disabled = false;
    bouton.textContent = 'Actualiser les cours';
  }
}

async function enregistrerPoint() {
  const a = agregats();
  const ligne = {
    profil_id: etat.user.id,
    date_releve: auj(),
    immobilier: a.immobilier,
    financier: a.financier,
    dette: a.dette,
    net: a.net,
  };
  const { error } = await sb.from('releves').upsert(ligne, { onConflict: 'profil_id,date_releve' });
  if (error) return alert(messageErreur(error));
  await charger();
  toutRendre();
}

function exporter() {
  const donnees = { exporte_le: new Date().toISOString(), compte: etat.user.email, ...etat, user: undefined };
  const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carnet-${auj()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function supprimerCompte() {
  if (!confirm('Supprimer votre compte et toutes vos données ? Cette action est irréversible.')) return;
  if (prompt('Tapez SUPPRIMER pour confirmer.') !== 'SUPPRIMER') return;
  try {
    await fonction('supprimer-compte', {});
    await sb.auth.signOut();
    location.href = 'index.html';
  } catch (e) {
    alert('Suppression impossible : ' + messageErreur(e));
  }
}

/* ---------------------------------------------------------------- liens */

document.querySelectorAll('.onglets button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.onglets button').forEach((x) => {
      x.setAttribute('aria-selected', String(x === b));
      $(x.dataset.panneau).hidden = x !== b;
    });
    Object.values(graphiques).forEach((g) => g.resize());
  });
});

document.addEventListener('click', (e) => {
  const ajout = e.target.closest('[data-ajout]');
  if (ajout) {
    const nom = ajout.dataset.ajout;
    const pre = ajout.dataset.compte ? { compte_id: ajout.dataset.compte } : {};
    return ouvrirFormulaire(nom, null, pre);
  }
  const modif = e.target.closest('[data-modif]');
  if (modif) {
    const nom = modif.dataset.modif;
    const ligne = etat[nom].find((x) => x.id === modif.dataset.id);
    return ouvrirFormulaire(nom, ligne);
  }
});

$('dAnnuler').addEventListener('click', fermerFormulaire);
$('dEnregistrer').addEventListener('click', enregistrerFormulaire);
$('dSupprimer').addEventListener('click', supprimerLigne);
$('dialogue').addEventListener('click', (e) => { if (e.target.id === 'dialogue') fermerFormulaire(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermerFormulaire(); });

['pjEpargne', 'pjRendement', 'pjDuree'].forEach((id) => $(id).addEventListener('input', () => rendreProjection(agregats())));
$('majCours').addEventListener('click', actualiserCours);
$('faireUnPoint').addEventListener('click', enregistrerPoint);
$('exporter').addEventListener('click', exporter);
$('supprimer').addEventListener('click', supprimerCompte);
$('deconnexion').addEventListener('click', deconnexion);

/* ------------------------------------------------------------ démarrage */

(async () => {
  const user = await exigeConnexion();
  if (!user) return;
  etat.user = user;
  $('courriel').textContent = user.email;
  try {
    await charger();
    toutRendre();
  } catch (e) {
    alert('Chargement impossible : ' + messageErreur(e));
  }
})();
