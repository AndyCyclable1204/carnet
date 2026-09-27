import { lire, modifier, reglage, uid } from '../js/store.js';
import { projectionLPP, projectionCapital, tauxBonificationLPP, salaireCoordonne, LPP, PILIER3A } from '../js/finance.js';
import { money, pct, esc, COULEURS, convertir  } from '../js/format.js';
import { $, $$, graphique, animerNombre, formulaire, toast, echelleMontant, echelleX, remplissage, degrade } from '../js/ui.js';
import { icones } from '../js/icones.js';

const chf = (v) => money(v, 'CHF');
const TRANCHES = [
  { de: 25, a: 34, taux: 0.07 },
  { de: 35, a: 44, taux: 0.1 },
  { de: 45, a: 54, taux: 0.15 },
  { de: 55, a: 65, taux: 0.18 },
];
const couleurTranche = (age) => (age < 35 ? '#93c5fd' : age < 45 ? '#5b9bd5' : age < 55 ? '#2471b3' : '#0b1f33');

export function panneauPrevoyance(el, rafraichir) {
  const e = lire();
  el.innerHTML = `<div id="blocLPP"></div><div id="bloc3" style="margin-top:1.2rem"></div>`;
  rendreLPP($('#blocLPP', el), rafraichir);
  rendrePilier3($('#bloc3', el), rafraichir);
}

/* ================================================================ LPP */

function rendreLPP(el, rafraichir) {
  const e = lire();
  const l = e.lpp;

  if (!l.actif) {
    el.innerHTML = `
      <div class="carte" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:1.5rem;align-items:center">
        <div>
          <span class="pastille-icone" style="background:var(--alpin-clair);color:var(--alpin);margin-bottom:.8rem">${icones.bouclier}</span>
          <h2 style="font-size:1.45rem">Votre 2<sup>e</sup> pilier (LPP)</h2>
          <p class="discret" style="margin:.5rem 0 1rem">Indiquez votre âge et votre salaire : le taux de bonification légal, le salaire coordonné et la répartition employeur/employé sont calculés automatiquement. Tout reste modifiable pour coller à votre certificat de prévoyance.</p>
          <button class="btn" id="activer">Configurer ma LPP</button>
        </div>
        <div>${tableTranches(e.reglages.age)}</div>
      </div>`;
    $('#activer', el).addEventListener('click', () => {
      modifier((s) => (s.lpp.actif = true));
      rafraichir();
    });
    return;
  }

  el.innerHTML = `
    <div class="grille g-sim">
      <div class="carte collant">
        <div class="carte-tete"><h3><span class="pastille-icone" style="background:var(--alpin-clair);color:var(--alpin)">${icones.bouclier}</span> LPP — vos paramètres</h3></div>
        <div class="duo">
          ${champ('age', 'Âge', e.reglages.age, '', 1)}
          ${champ('ageRetraite', 'Retraite à', l.ageRetraite, 'ans', 1)}
        </div>
        ${champ('salaire', 'Salaire annuel brut', l.salaire, 'CHF', 100)}
        ${champ('avoir', 'Avoir de vieillesse actuel', l.avoir, 'CHF', 100, 'Sur votre certificat de prévoyance annuel.')}
        <div class="champ"><label class="interrupteur"><input type="checkbox" id="optAssure" ${l.salaireAssure != null ? 'checked' : ''}><span></span>Salaire assuré indiqué sur mon certificat</label></div>
        <div id="blocAssure" ${l.salaireAssure != null ? '' : 'hidden'}>${champ('salaireAssure', 'Salaire assuré', l.salaireAssure ?? '', 'CHF', 100, 'Pour les caisses surobligatoires ou sans déduction de coordination.')}</div>
        <div class="champ"><label class="interrupteur"><input type="checkbox" id="optTaux" ${l.tauxManuel != null ? 'checked' : ''}><span></span>Taux de bonification de mon règlement</label></div>
        <div id="blocTaux" ${l.tauxManuel != null ? '' : 'hidden'}>${champ('tauxManuel', 'Taux total (employé + employeur)', l.tauxManuel != null ? +(l.tauxManuel * 100).toFixed(2) : '', '%', 0.1, 'Remplace la grille légale par âge.')}</div>
        <div class="curseur" style="margin-top:.4rem">
          <div class="curseur-ligne"><label for="partEmp">Part de l'employeur</label><output id="partEmp-v"></output></div>
          <input type="range" id="partEmp" min="50" max="100" step="5" value="${Math.round(l.partEmployeur * 100)}">
          <small>50/50 est le minimum légal. Beaucoup de contrats prévoient 60/40 ou davantage.</small>
        </div>
        ${champ('interet', 'Intérêt crédité projeté', +(l.interet * 100).toFixed(2), '%', 0.05, `Minimum légal ${LPP.annee} : ${pct(LPP.tauxInteretMinimal)} sur la part obligatoire.`)}
        <button class="btn mini danger" id="desactiver" style="margin-top:.6rem">Retirer la LPP du tableau de bord</button>
      </div>

      <div>
        <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
          ${sortie('Salaire coordonné', 'sCoord')}
          ${sortie('Taux de bonification', 'sTaux')}
          ${sortie('Votre part / mois', 'sEmp')}
          ${sortie("Part de l'employeur / mois", 'sPat')}
        </div>
        <div class="carte kpi-principal" style="margin-top:1rem;border-radius:var(--rayon);padding:1.35rem">
          <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:1.2rem">
            <div class="kpi"><div class="libelle">Avoir projeté à <span id="sAgeR"></span> ans</div><div class="grand-chiffre" style="font-size:2.2rem" id="sAvoir">—</div><div class="sous" id="sAvoirEur"></div></div>
            <div class="kpi"><div class="libelle">Rente annuelle estimée</div><div class="grand-chiffre" style="font-size:2.2rem" id="sRente">—</div><div class="sous" id="sRenteM"></div></div>
          </div>
          <div class="sous" style="margin-top:.8rem;font-size:.8rem">Taux de conversion ${pct(LPP.tauxConversion, 1)} appliqué à l'ensemble de l'avoir : il ne vaut légalement que pour la part obligatoire, les caisses appliquent souvent un taux plus bas au surobligatoire.</div>
        </div>
        <div class="carte" style="margin-top:1rem">
          <div class="carte-tete"><h3>Évolution de l'avoir jusqu'à la retraite</h3><span class="badge" id="sPalier"></span></div>
          <div class="cadre-graphique haut"><canvas id="gLPP"></canvas></div>
        </div>
        <div class="carte" style="margin-top:1rem" id="tranches">${tableTranches(e.reglages.age)}</div>
      </div>
    </div>`;

  // Bascule des options.
  $('#optAssure', el).addEventListener('change', (ev) => {
    $('#blocAssure', el).hidden = !ev.target.checked;
    modifier((s) => (s.lpp.salaireAssure = ev.target.checked ? salaireCoordonne(s.lpp.salaire) : null));
    $('[name="salaireAssure"]', el).value = lire().lpp.salaireAssure ?? '';
    maj();
  });
  $('#optTaux', el).addEventListener('change', (ev) => {
    $('#blocTaux', el).hidden = !ev.target.checked;
    modifier((s) => (s.lpp.tauxManuel = ev.target.checked ? tauxBonificationLPP(s.reglages.age) : null));
    $('[name="tauxManuel"]', el).value = lire().lpp.tauxManuel != null ? +(lire().lpp.tauxManuel * 100).toFixed(2) : '';
    maj();
  });
  $('#desactiver', el).addEventListener('click', () => {
    modifier((s) => (s.lpp.actif = false));
    rafraichir();
  });

  el.addEventListener('input', (ev) => {
    const n = ev.target.name || ev.target.id;
    const v = ev.target.value === '' ? null : +ev.target.value;
    if (n === 'partEmp') modifier((s) => (s.lpp.partEmployeur = v / 100));
    else if (n === 'age') { if (v >= 15 && v <= 70) reglage((r) => (r.age = v)); }
    else if (n === 'interet') modifier((s) => (s.lpp.interet = (v ?? 0) / 100));
    else if (n === 'tauxManuel') modifier((s) => (s.lpp.tauxManuel = v == null ? null : v / 100));
    else if (['salaire', 'avoir', 'salaireAssure', 'ageRetraite'].includes(n)) modifier((s) => (s.lpp[n] = v));
    else return;
    maj();
  });

  const canvas = $('#gLPP', el);
  let g;
  function maj() {
    const s = lire();
    const age = +s.reglages.age || 30;
    const l = s.lpp;
    const ageR = Math.max(age + 1, +l.ageRetraite || 65);
    const r = projectionLPP({
      age, ageRetraite: ageR, salaire: +l.salaire || 0, avoir: +l.avoir || 0,
      salaireAssure: l.salaireAssure, tauxManuel: l.tauxManuel, partEmployeur: l.partEmployeur, interet: l.interet,
    });
    const range = $('#partEmp', el);
    remplissage(range);
    $('#partEmp-v', el).textContent = `${Math.round(l.partEmployeur * 100)} % employeur · ${Math.round((1 - l.partEmployeur) * 100)} % vous`;
    $('#sCoord', el).textContent = chf(r.salaireAssure);
    $('#sCoord-s', el).textContent = l.salaireAssure != null ? 'selon votre certificat' : +l.salaire < LPP.seuilEntree ? `sous le seuil d'entrée (${chf(LPP.seuilEntree)})` : `salaire − ${chf(LPP.deductionCoordination)} de coordination`;
    $('#sTaux', el).textContent = pct(r.taux, 0);
    $('#sTaux-s', el).textContent = l.tauxManuel != null ? 'selon votre règlement' : age < 25 ? 'épargne à partir de 25 ans' : `tranche légale ${TRANCHES.find((t) => age >= t.de && age <= t.a)?.de ?? 55}–${TRANCHES.find((t) => age >= t.de && age <= t.a)?.a ?? 65} ans`;
    animerNombre($('#sEmp', el), r.partEmployeMensuelle, (x) => money(x, 'CHF', 0));
    $('#sEmp-s', el).textContent = `${chf(r.partEmployeMensuelle * 12)} par an`;
    animerNombre($('#sPat', el), r.partEmployeurMensuelle, (x) => money(x, 'CHF', 0));
    $('#sPat-s', el).textContent = `${chf(r.partEmployeurMensuelle * 12)} par an`;
    $('#sAgeR', el).textContent = ageR;
    animerNombre($('#sAvoir', el), r.avoirRetraite, chf);
    $('#sAvoirEur', el).textContent = `soit ${money(convertir(r.avoirRetraite, 'CHF', 'EUR', s.reglages.tauxChange), 'EUR')} au taux du jour`;
    animerNombre($('#sRente', el), r.renteAnnuelle, chf);
    $('#sRenteM', el).textContent = `${chf(r.renteAnnuelle / 12)} par mois`;
    const tr = $('#tranches', el); if (tr) tr.innerHTML = tableTranches(age);
    $('#sPalier', el).textContent = r.prochainPalier ? `Prochain palier de taux à ${r.prochainPalier} ans` : l.tauxManuel != null ? 'Taux fixe' : 'Dernière tranche atteinte';

    const serie = r.serie;
    const cotis = serie.slice(1).map((p, i) => {
      const a = age + i;
      const t = l.tauxManuel != null ? l.tauxManuel : tauxBonificationLPP(a);
      return (l.salaireAssure != null ? l.salaireAssure : salaireCoordonne(+l.salaire || 0)) * t;
    });
    const data = {
      labels: serie.map((p) => p.age),
      datasets: [
        { type: 'line', label: 'Avoir de vieillesse', data: serie.map((p) => p.avoir), borderColor: COULEURS.alpin, backgroundColor: degrade(canvas, COULEURS.alpin, 0.28), fill: true, borderWidth: 2.4, pointRadius: 0, tension: 0.25, yAxisID: 'y' },
        { type: 'bar', label: 'Bonifications de l\'année', data: [0, ...cotis], backgroundColor: serie.map((p) => couleurTranche(p.age - 1)), borderRadius: 4, yAxisID: 'y2', barPercentage: 0.7 },
      ],
    };
    if (g) {
      g.data.labels = data.labels;
      g.data.datasets[0].data = data.datasets[0].data;
      g.data.datasets[1].data = data.datasets[1].data;
      g.data.datasets[1].backgroundColor = data.datasets[1].backgroundColor;
      g.update();
      return;
    }
    g = graphique(canvas, {
      data,
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { title: (i) => `${i[0].label} ans`, label: (c) => `${c.dataset.label} : ${chf(c.raw)}` } },
        },
        scales: {
          x: echelleX('âge'),
          y: echelleMontant({ position: 'left' }),
          y2: echelleMontant({ position: 'right', grid: { display: false } }),
        },
      },
    });
  }
  maj();
}

const champ = (nom, libelle, valeur, suffixe, pas, aide = '') => `
  <div class="champ"><label>${libelle}<span class="saisie ${suffixe ? 'avec-suffixe' : ''}"><input type="number" name="${nom}" value="${valeur ?? ''}" step="${pas}" inputmode="decimal">${suffixe ? `<i>${suffixe}</i>` : ''}</span></label>${aide ? `<small>${aide}</small>` : ''}</div>`;

const sortie = (libelle, id) => `
  <div class="carte kpi"><div class="libelle">${libelle}</div><div class="valeur" id="${id}" style="font-size:1.35rem">—</div><div class="sous" id="${id}-s"></div></div>`;

function tableTranches(age) {
  return `
    <h3 style="margin-bottom:.7rem">Bonifications de vieillesse légales</h3>
    <table><thead><tr><th>Âge</th><th class="nb">Taux du salaire coordonné</th><th class="nb">dont vous (50/50)</th></tr></thead>
    <tbody>${TRANCHES.map((t) => {
      const courant = age >= t.de && age <= t.a;
      return `<tr style="${courant ? 'background:var(--alpin-clair);font-weight:650' : ''}"><td>${t.de}–${t.a} ans ${courant ? '<span class="badge rouge">vous</span>' : ''}</td><td class="nb">${pct(t.taux, 0)}</td><td class="nb">${pct(t.taux / 2, 1)}</td></tr>`;
    }).join('')}</tbody></table>
    <small style="display:block;margin-top:.6rem">Chiffres ${LPP.annee} : seuil d'entrée ${chf(LPP.seuilEntree)}, déduction de coordination ${chf(LPP.deductionCoordination)}, salaire coordonné minimal ${chf(LPP.salaireCoordMin)}, salaire maximal assuré obligatoire ${chf(LPP.salaireMaxObligatoire)}.</small>`;
}

/* ================================================================ 3e pilier */

const CHAMPS_P3 = [
  { cle: 'nom', libelle: 'Nom du contrat', type: 'text', requis: true },
  { cle: 'type', libelle: 'Type', type: 'select', options: [['3a', 'Pilier 3a (lié)'], ['3b', 'Pilier 3b (libre)']] },
  { cle: 'etablissement', libelle: 'Établissement (facultatif)', type: 'text' },
  { cle: 'capital', libelle: 'Capital actuel', type: 'number', suffixe: 'CHF', requis: true },
  { cle: 'versementAnnuel', libelle: 'Versement annuel', type: 'number', suffixe: 'CHF', aide: `Plafond 3a ${PILIER3A.annee} pour un salarié affilié à une caisse de pension : ${chf(PILIER3A.plafondSalarie)}.` },
  { cle: 'rendement', libelle: 'Performance annuelle moyenne', type: 'pct', pas: 0.1 },
];

function rendrePilier3(el, rafraichir) {
  const e = lire();
  const age = +e.reglages.age || 30;
  const ageR = +e.lpp.ageRetraite || 65;
  const annees = Math.max(0, ageR - age);
  const contrats = e.pilier3.map((c) => ({ ...c, fin: projectionCapital({ capital: +c.capital || 0, versementAnnuel: +c.versementAnnuel || 0, rendement: +c.rendement || 0, annees }).final }));
  const total = contrats.reduce((s, c) => s + (+c.capital || 0), 0);
  const totalFin = contrats.reduce((s, c) => s + c.fin, 0);

  el.innerHTML = `
    <div class="carte">
      <div class="carte-tete">
        <h3><span class="pastille-icone" style="background:#efeafe;color:var(--lavande)">${icones.piece}</span> 3<sup>e</sup> pilier</h3>
        <button class="btn mini" data-ajout-p3>${icones.plus.replace('<svg', '<svg width="14" height="14"')} Ajouter un contrat</button>
      </div>
      ${contrats.length ? `
        <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:1rem">
          <div class="kpi"><div class="libelle">Capital actuel</div><div class="valeur">${chf(total)}</div></div>
          <div class="kpi"><div class="libelle">Projeté à ${ageR} ans</div><div class="valeur" style="color:var(--lavande)">${chf(totalFin)}</div><div class="sous">dans ${annees} ans</div></div>
        </div>
        <div class="liste-elements">${contrats.map((c) => `
          <div class="element" data-modif-p3="${c.id}">
            <span class="pastille-icone" style="background:#efeafe;color:var(--lavande)">${icones.piece}</span>
            <div><div class="titre">${esc(c.nom)} <span class="badge">${c.type === '3b' ? 'Pilier 3b' : 'Pilier 3a'}</span></div>
              <div class="detail">${chf(c.versementAnnuel || 0)} / an à ${pct(c.rendement || 0, 1)}${c.etablissement ? ' · ' + esc(c.etablissement) : ''}
              ${c.type !== '3b' && +c.versementAnnuel > PILIER3A.plafondSalarie ? `<br><span class="neg">Au-dessus du plafond 3a ${PILIER3A.annee} (${chf(PILIER3A.plafondSalarie)})</span>` : ''}</div></div>
            <div class="montant">${chf(c.capital)}<small>${chf(c.fin)} à ${ageR} ans</small></div>
          </div>`).join('')}</div>`
      : `<div class="vide">${icones.piece}<p>Ajoutez un compte 3a bancaire, un 3a en titres ou une assurance 3b.</p></div>`}
      <div class="encart attention" style="margin-top:1rem">${icones.info.replace('<svg', '<svg width="18" height="18" style="flex:none"')}
        <p>Pour un frontalier, la déduction fiscale des versements 3a dépend de son imposition : envisageable avec une taxation ordinaire en Suisse (quasi-résident genevois par exemple), en principe exclue si vous êtes imposé en France. Vérifiez votre situation avant de verser.</p></div>
    </div>`;

  el.addEventListener('click', async (ev) => {
    const id = ev.target.closest('[data-modif-p3]')?.dataset.modifP3;
    if (!id && !ev.target.closest('[data-ajout-p3]')) return;
    const c = e.pilier3.find((x) => x.id === id);
    const r = await formulaire({ titre: c ? 'Modifier le contrat' : 'Ajouter un contrat', champs: CHAMPS_P3, valeurs: c || { type: '3a', rendement: 0.03 }, supprimable: !!c });
    if (!r) return;
    modifier((s) => {
      if (r.action === 'supprimer') s.pilier3 = s.pilier3.filter((x) => x.id !== id);
      else if (c) Object.assign(s.pilier3.find((x) => x.id === id), r.valeurs);
      else s.pilier3.push({ id: uid(), ...r.valeurs });
    });
    toast('3e pilier mis à jour', 'succes');
    rafraichir();
  });
}
