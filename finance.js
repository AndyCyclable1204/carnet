// Moteur de calcul. Aucune dépendance, aucun accès réseau.
// Taux annuels en décimal (0.07 = 7 %), durées en mois sauf mention contraire.

/* ============================================================ paramètres 2026 */

export const LPP = {
  annee: 2026,
  seuilEntree: 22680,
  deductionCoordination: 26460,
  salaireCoordMin: 3780,
  salaireMaxObligatoire: 90720,
  tauxInteretMinimal: 0.0125,
  tauxConversion: 0.068,
  ageRetraite: 65,
};

export const PILIER3A = { annee: 2026, plafondSalarie: 7258 };

// Prélèvements sociaux 2026 (LFSS 2026) et prélèvement de solidarité.
export const FISCAL = {
  annee: 2026,
  psPlacements: 0.186, // PEA, CTO, dividendes, plus-values mobilières
  psFonciers: 0.172, // revenus fonciers (location nue, SCPI), plus-values immobilières
  psMeuble: 0.186, // location meublée non professionnelle (LMNP, BIC)
  plafondMicroFoncier: 15000,
  plafondMicroBIC: 83600, // meublé longue durée, recettes 2026
  // Durées d'amortissement usuelles en LMNP au réel
  amortBati: 30, amortTravaux: 15, amortMobilier: 7,
  solidarite: 0.075, // seul prélèvement dû en cas d'exonération CSG/CRDS (frontalier)
  irForfaitaire: 0.128,
};

/* ============================================================ outils */

export const tauxMensuelCompose = (annuel) => Math.pow(1 + annuel, 1 / 12) - 1;

export function valeurFuture({ capital = 0, versementMensuel = 0, rendement = 0, mois = 0 }) {
  const i = tauxMensuelCompose(rendement);
  if (i === 0) return capital + versementMensuel * mois;
  const g = Math.pow(1 + i, mois);
  return capital * g + versementMensuel * ((g - 1) / i);
}

/* ============================================================ crédit */

export function mensualite(capital, tauxAnnuel, dureeMois) {
  if (!capital || !dureeMois) return 0;
  const i = tauxAnnuel / 12;
  if (i === 0) return capital / dureeMois;
  return (capital * i) / (1 - Math.pow(1 + i, -dureeMois));
}

export function tableauAmortissement({ capital, tauxAnnuel, dureeMois, tauxAssurance = 0 }) {
  const i = tauxAnnuel / 12;
  const m = mensualite(capital, tauxAnnuel, dureeMois);
  const assurance = (capital * tauxAssurance) / 12;
  let restant = capital;
  let interetsTotaux = 0;
  const lignes = [];
  for (let n = 1; n <= dureeMois; n++) {
    const interets = restant * i;
    let part = n === dureeMois ? restant : m - interets;
    if (part > restant) part = restant;
    restant = Math.max(0, restant - part);
    interetsTotaux += interets;
    lignes.push({ mois: n, interets, capital: part, restant });
  }
  return { mensualite: m, mensualiteAvecAssurance: m + assurance, lignes, interetsTotaux };
}

// État d'un prêt aujourd'hui, à partir du dernier relevé connu.
export function etatPret({ capitalRestant, tauxAnnuel, moisRestants, dateReleve }, aujourdHui = new Date()) {
  const d = new Date(dateReleve || aujourdHui);
  const ecoules = Math.max(
    0,
    (aujourdHui.getFullYear() - d.getFullYear()) * 12 + (aujourdHui.getMonth() - d.getMonth())
  );
  const n = Math.max(1, +moisRestants || 1);
  const m = mensualite(capitalRestant, tauxAnnuel, n);
  const i = tauxAnnuel / 12;
  let restant = capitalRestant;
  const pas = Math.min(ecoules, n);
  for (let k = 0; k < pas; k++) restant = Math.max(0, restant - (m - restant * i));
  return {
    capitalRestant: restant,
    mensualite: m,
    amortiMensuel: Math.max(0, m - restant * i),
    moisRestants: Math.max(0, n - pas),
    estime: pas > 0,
  };
}

export function capaciteEmprunt({ revenusMensuels, chargesCredits = 0, tauxAnnuel, dureeMois, tauxEndettement = 0.35, apport = 0 }) {
  const mensualiteMax = Math.max(0, revenusMensuels * tauxEndettement - chargesCredits);
  const i = tauxAnnuel / 12;
  const capital = i === 0 ? mensualiteMax * dureeMois : (mensualiteMax * (1 - Math.pow(1 + i, -dureeMois))) / i;
  return { mensualiteMax, capital, budget: capital + apport };
}

/* ============================================================ projection */

export function projection({ capitalInitial = 0, epargneMensuelle = 0, rendement = 0.06, annees = 10, amortiMensuel = 0, equiteImmo = 0 }) {
  const im = tauxMensuelCompose(rendement);
  let financier = capitalInitial;
  let amorti = 0;
  const series = [];
  for (let a = 0; a <= annees; a++) {
    if (a > 0) {
      for (let m = 0; m < 12; m++) {
        financier = financier * (1 + im) + epargneMensuelle;
        amorti += amortiMensuel;
      }
    }
    series.push({ annee: a, financier, amorti, immobilier: equiteImmo, total: financier + amorti + equiteImmo });
  }
  const fin = series[series.length - 1];
  return { series, total: fin.total, rendementGenere: fin.financier - capitalInitial - epargneMensuelle * 12 * annees };
}

export function versementPourObjectif({ objectif, capital = 0, rendement, annees }) {
  const n = Math.round(annees * 12);
  const i = tauxMensuelCompose(rendement);
  const fvCapital = capital * Math.pow(1 + i, n);
  if (fvCapital >= objectif) return 0;
  if (i === 0) return (objectif - fvCapital) / n;
  return ((objectif - fvCapital) * i) / (Math.pow(1 + i, n) - 1);
}

export function dureePourObjectif({ objectif, capital = 0, versement = 0, rendement }) {
  const i = tauxMensuelCompose(rendement);
  let v = capital;
  for (let m = 0; m <= 1200; m++) {
    if (v >= objectif) return m;
    v = v * (1 + i) + versement;
  }
  return null; // hors d'atteinte en 100 ans
}

/* ============================================================ prévoyance suisse */

export function tauxBonificationLPP(age) {
  if (age < 25) return 0;
  if (age < 35) return 0.07;
  if (age < 45) return 0.1;
  if (age < 55) return 0.15;
  if (age < 66) return 0.18;
  return 0;
}

export function salaireCoordonne(salaire) {
  if (!salaire || salaire < LPP.seuilEntree) return 0;
  return Math.max(Math.min(salaire, LPP.salaireMaxObligatoire) - LPP.deductionCoordination, LPP.salaireCoordMin);
}

// Estimation de l'avoir actuel à partir de l'âge de début de cotisation (minimum légal).
// Le salaire passé est reconstitué en retirant la progression annuelle au salaire actuel.
export function estimationAvoirLPP({ ageDebut, age, salaire, progressionSalaire = 0, interet = LPP.tauxInteretMinimal, salaireAssure = null, tauxManuel = null }) {
  const debut = Math.max(25, Math.round(ageDebut || 25));
  let a = 0;
  for (let x = debut; x < age; x++) {
    const recul = Math.pow(1 + progressionSalaire, age - x);
    const assure = salaireAssure != null ? salaireAssure / recul : salaireCoordonne(salaire / recul);
    a = a * (1 + interet) + assure * (tauxManuel != null ? tauxManuel : tauxBonificationLPP(x));
  }
  return { avoir: a, annees: Math.max(0, age - debut) };
}

// salaireAssure : si renseigné, remplace le salaire coordonné légal (plans surobligatoires).
// tauxManuel : si renseigné, remplace la grille légale par âge.
export function projectionLPP({
  age,
  salaire,
  avoir = 0,
  salaireAssure = null,
  tauxManuel = null,
  partEmployeur = 0.5,
  interet = LPP.tauxInteretMinimal,
  ageRetraite = LPP.ageRetraite,
  progressionSalaire = 0,
  tauxConversion = LPP.tauxConversion,
}) {
  const assure = (k) =>
    salaireAssure != null
      ? salaireAssure * Math.pow(1 + progressionSalaire, k)
      : salaireCoordonne(salaire * Math.pow(1 + progressionSalaire, k));
  const taux = (a) => (tauxManuel != null ? tauxManuel : tauxBonificationLPP(a));

  const cotisationAnnuelle = assure(0) * taux(age);
  // Chaque point : avoir total décomposé en (avoir de départ + intérêts), cumul employé, cumul employeur.
  const serie = [{ age, avoir, base: avoir, employe: 0, employeur: 0, cotisation: 0, taux: 0, salaireAssure: assure(0) }];
  let a = avoir, cumE = 0, cumP = 0;
  for (let x = age, k = 0; x < ageRetraite; x++, k++) {
    const c = assure(k) * taux(x);
    a = a * (1 + interet) + c;
    cumE += c * (1 - partEmployeur);
    cumP += c * partEmployeur;
    serie.push({ age: x + 1, avoir: a, base: a - cumE - cumP, employe: cumE, employeur: cumP, cotisation: c, taux: taux(x), salaireAssure: assure(k) });
  }
  const prochainPalier = [25, 35, 45, 55].find((p) => p > age);
  return {
    serie,
    salaireAssure: assure(0),
    taux: taux(age),
    cotisationAnnuelle,
    partEmployeMensuelle: (cotisationAnnuelle * (1 - partEmployeur)) / 12,
    partEmployeurMensuelle: (cotisationAnnuelle * partEmployeur) / 12,
    avoirRetraite: a,
    renteAnnuelle: a * tauxConversion,
    prochainPalier: tauxManuel == null ? prochainPalier : null,
  };
}

export function projectionCapital({ capital = 0, versementAnnuel = 0, rendement = 0, annees = 0 }) {
  const serie = [{ annee: 0, valeur: capital }];
  let v = capital;
  for (let a = 1; a <= annees; a++) {
    v = v * (1 + rendement) + versementAnnuel;
    serie.push({ annee: a, valeur: v });
  }
  return { serie, final: v };
}

/* ============================================================ fiscalité de sortie */

// Retourne null pour les enveloppes dont la fiscalité n'est pas modélisée.
export function fiscaliteSortie({ type, valeur, verses, ancienneteAnnees = 0, frontalier = false }) {
  const gain = Math.max(0, (+valeur || 0) - (+verses || 0));
  const ps = frontalier ? FISCAL.solidarite : FISCAL.psPlacements;
  let ir;
  if (type === 'PEA') ir = ancienneteAnnees >= 5 ? 0 : FISCAL.irForfaitaire;
  else if (type === 'CTO') ir = FISCAL.irForfaitaire;
  else return null;
  const impot = gain * (ps + ir);
  return { gain, ps, ir, taux: ps + ir, impot, net: valeur - impot };
}

/* ============================================================ immobilier locatif */

// regime : 'micro' (micro-foncier, nu), 'reel' (réel foncier, nu),
//          'microbic' (LMNP micro-BIC, abattement 50 %), 'lmnp' (LMNP réel avec amortissements).
export function rendementLocatif({
  prix, frais = 0, travaux = 0, mobilier = 0, loyerMensuel, chargesAnnuelles = 0, taxeFonciere = 0,
  vacance = 0, tmi = 0.3, regime = 'micro', frontalier = false, partTerrain = 0.15,
}) {
  const meuble = regime === 'microbic' || regime === 'lmnp';
  const investi = prix + frais + travaux + (meuble ? mobilier : 0);
  if (!investi) return null;
  const loyerAnnuel = loyerMensuel * 12 * (1 - vacance);
  const charges = chargesAnnuelles + taxeFonciere;
  const ps = frontalier ? FISCAL.solidarite : meuble ? FISCAL.psMeuble : FISCAL.psFonciers;
  const resultat = loyerAnnuel - charges;

  let base, amort = null;
  if (regime === 'micro') base = loyerAnnuel * 0.7;
  else if (regime === 'microbic') base = loyerAnnuel * 0.5;
  else if (regime === 'reel') base = Math.max(0, resultat);
  else {
    amort = amortissementsLMNP({ prix, frais, travaux, mobilier, partTerrain, resultat });
    base = amort.serie[0].base;
  }
  const impot = base * (tmi + ps);
  return {
    investi,
    loyerAnnuel,
    charges,
    brut: loyerAnnuel / investi,
    net: resultat / investi,
    netNet: (resultat - impot) / investi,
    impot,
    tauxPS: ps,
    cashflowMensuel: (resultat - impot) / 12,
    microEligible: loyerMensuel * 12 <= (meuble ? FISCAL.plafondMicroBIC : FISCAL.plafondMicroFoncier),
    plafondMicro: meuble ? FISCAL.plafondMicroBIC : FISCAL.plafondMicroFoncier,
    amort,
  };
}

// LMNP au réel : le terrain ne s'amortit pas ; les frais de notaire suivent le bien.
// L'amortissement ne peut pas créer de déficit : l'excédent est reporté sans limite de durée.
export function amortissementsLMNP({ prix, frais = 0, travaux = 0, mobilier = 0, partTerrain = 0.15, resultat, horizon = 40 }) {
  const bati = (prix + frais) * (1 - partTerrain);
  const annuel = (a) =>
    (a <= FISCAL.amortBati ? bati / FISCAL.amortBati : 0) +
    (a <= FISCAL.amortTravaux ? travaux / FISCAL.amortTravaux : 0) +
    (a <= FISCAL.amortMobilier ? mobilier / FISCAL.amortMobilier : 0);
  let report = 0;
  let anneesSansImpot = null;
  const serie = [];
  for (let a = 1; a <= horizon; a++) {
    const dispo = annuel(a) + report;
    const utilise = Math.min(dispo, Math.max(0, resultat));
    report = dispo - utilise;
    const base = Math.max(0, resultat - utilise);
    if (base > 0.5 && anneesSansImpot === null) anneesSansImpot = a - 1;
    serie.push({ annee: a, amortissement: annuel(a), utilise, report, base });
  }
  return {
    annuel: annuel(1),
    detail: { bati: bati / FISCAL.amortBati, travaux: travaux / FISCAL.amortTravaux, mobilier: mobilier / FISCAL.amortMobilier },
    anneesSansImpot: anneesSansImpot === null ? horizon : anneesSansImpot,
    auDela: anneesSansImpot === null,
    serie,
  };
}

/* ============================================================ SCPI */

export function simulationSCPI({
  montant, fraisEntree = 0.1, td = 0.06, revalo = 0.005, annees = 10,
  delaiJouissanceMois = 4, tmi = 0.3, frontalier = false, reinvestir = false,
  fraisGestion = 0.12, partEtranger = 0, impotEtranger = 0.15,
  credit = null, // { montant, taux, annees, assurance (taux annuel sur capital initial) }
}) {
  const ps = frontalier ? FISCAL.solidarite : FISCAL.psFonciers;
  const apport = Math.max(0, montant - (credit ? credit.montant : 0));

  // Échéancier annuel du crédit
  let crd = credit ? credit.montant : 0;
  const nMois = credit ? Math.round(credit.annees * 12) : 0;
  const mens = credit && crd > 0 ? mensualite(crd, credit.taux, nMois) : 0;
  const assuranceAn = credit ? credit.montant * (credit.assurance || 0) : 0;

  let parts = montant; // exprimé en € au prix de souscription initial
  let cumulNet = 0, cumulCash = 0, cumulImpots = 0, cumulGestion = 0, cumulInterets = 0, reportDeficit = 0;
  const flux = [-apport];
  const serie = [];
  for (let a = 1; a <= annees; a++) {
    const prix = Math.pow(1 + revalo, a - 1);
    const mois = a === 1 ? Math.max(0, 12 - delaiJouissanceMois) : 12;
    const brut = parts * prix * td * (mois / 12); // distribution, fiscalité étrangère comprise
    const gestion = fraisGestion < 1 ? (brut / (1 - fraisGestion)) * fraisGestion : 0;

    // Crédit de l'année
    let interets = 0, remb = 0, assurance = 0;
    for (let m = 0; m < 12 && crd > 0.01; m++) {
      const i = crd * (credit.taux / 12);
      interets += i;
      remb += mens;
      crd = Math.max(0, crd - (mens - i));
    }
    if (remb > 0) assurance = assuranceAn;

    // Fiscalité : revenus étrangers imposés à la source, neutralisés en France (crédit d'impôt ou exonération)
    const brutFR = brut * (1 - partEtranger);
    const brutETR = brut * partEtranger;
    const impotETR = brutETR * impotEtranger;
    // Seule la part des intérêts rattachée aux revenus français est déductible en France.
    // Le déficit issu des intérêts ne s'impute que sur les revenus fonciers des 10 années suivantes.
    let base = brutFR - (interets + assurance) * (1 - partEtranger) - reportDeficit;
    reportDeficit = base < 0 ? -base : 0;
    base = Math.max(0, base);
    const ir = base * tmi;
    const prelev = base * ps;
    const net = brut - impotETR - ir - prelev;
    const cash = net - remb - assurance;

    cumulGestion += gestion;
    cumulImpots += impotETR + ir + prelev;
    cumulInterets += interets + assurance;
    if (reinvestir && !credit) parts += net / prix;
    else { cumulNet += net; cumulCash += cash; }

    const valeurRetrait = parts * Math.pow(1 + revalo, a) * (1 - fraisEntree);
    flux.push(reinvestir && !credit ? 0 : cash);
    serie.push({ annee: a, brut, gestion, impotETR, ir, prelev, net, cash, cumulNet, cumulCash, valeurRetrait, crd, patrimoineNet: valeurRetrait - crd, interets });
  }
  const fin = serie[serie.length - 1];
  flux[flux.length - 1] += fin.valeurRetrait - fin.crd;
  const totalFinal = fin.valeurRetrait + fin.cumulNet;
  const pleine = serie[Math.min(1, serie.length - 1)]; // 1re année pleine
  const annuelBrut = montant * td;
  return {
    serie,
    apport,
    mensualite: mens,
    assuranceMensuelle: assuranceAn / 12,
    revenuMensuelBrut: annuelBrut / 12,
    revenuMensuelNet: pleine.net / 12,
    cashflowMensuel: pleine.cash / 12,
    fraisEntreeMontant: montant * fraisEntree,
    gestionAnnuelle: fraisGestion < 1 ? (annuelBrut / (1 - fraisGestion)) * fraisGestion : 0,
    valeurRetraitInitiale: montant * (1 - fraisEntree),
    valeurRetraitFinale: fin.valeurRetrait,
    crdFinal: fin.crd,
    patrimoineNetFinal: fin.valeurRetrait - fin.crd,
    cumulNet: fin.cumulNet,
    cumulCash: fin.cumulCash,
    cumulImpots,
    cumulGestion,
    cumulInterets,
    // Fiscalité d'une année pleine, ventilée France / étranger
    fiscalite: {
      brutFR: annuelBrut * (1 - partEtranger), brutETR: annuelBrut * partEtranger,
      impotETR: annuelBrut * partEtranger * impotEtranger,
      irFR: pleine.ir, psFR: pleine.prelev, tauxPS: ps,
    },
    tauxImposition: pleine.brut ? (pleine.impotETR + pleine.ir + pleine.prelev) / pleine.brut : 0,
    rendementAnnualise: credit ? tri(flux) : reinvestir ? Math.pow(fin.valeurRetrait / montant, 1 / annees) - 1 : tri(flux.map((f, k) => (k === 0 ? -montant : f))),
  };
}

// Taux de rendement interne de flux annuels (flux[0] = mise initiale, négative). Dichotomie.
export function tri(flux) {
  const van = (r) => flux.reduce((s, f, k) => s + f / Math.pow(1 + r, k), 0);
  let bas = -0.99, haut = 1;
  if (van(bas) * van(haut) > 0) return null;
  for (let k = 0; k < 100; k++) {
    const mil = (bas + haut) / 2;
    if (van(bas) * van(mil) <= 0) haut = mil; else bas = mil;
  }
  return (bas + haut) / 2;
}

/* ============================================================ dividendes */

export function simulationDividendes({
  capital = 0, apportMensuel = 0, rendement = 0.04, croissanceDividende = 0.03,
  croissanceCours = 0.02, annees = 20, reinvestir = true, enveloppe = 'PEA', frontalier = false,
}) {
  const taxe = enveloppe === 'PEA' ? 0 : FISCAL.irForfaitaire + (frontalier ? FISCAL.solidarite : FISCAL.psPlacements);
  let valeur = capital;
  let cumul = 0;
  let verse = capital;
  const serie = [];
  for (let a = 1; a <= annees; a++) {
    const y = rendement * Math.pow((1 + croissanceDividende) / (1 + croissanceCours), a - 1);
    const brut = valeur * y;
    const net = brut * (1 - taxe);
    cumul += net;
    valeur = valeur * (1 + croissanceCours) + apportMensuel * 12 + (reinvestir ? net : 0);
    verse += apportMensuel * 12;
    serie.push({ annee: a, brut, net, valeur, cumul });
  }
  const fin = serie[serie.length - 1];
  return { serie, dividendeAnnuelFinal: fin.net, dividendeMensuelFinal: fin.net / 12, valeurFinale: fin.valeur, cumul, verse, taxe };
}
