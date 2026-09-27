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
  psFonciers: 0.172, // revenus fonciers (location nue, SCPI)
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
  const serie = [{ age, avoir }];
  let a = avoir;
  for (let x = age, k = 0; x < ageRetraite; x++, k++) {
    a = a * (1 + interet) + assure(k) * taux(x);
    serie.push({ age: x + 1, avoir: a });
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

export function rendementLocatif({
  prix, frais = 0, travaux = 0, loyerMensuel, chargesAnnuelles = 0, taxeFonciere = 0,
  vacance = 0, tmi = 0.3, regime = 'micro', frontalier = false,
}) {
  const investi = prix + frais + travaux;
  if (!investi) return null;
  const loyerAnnuel = loyerMensuel * 12 * (1 - vacance);
  const charges = chargesAnnuelles + taxeFonciere;
  const ps = frontalier ? FISCAL.solidarite : FISCAL.psFonciers;
  const base = regime === 'micro' ? loyerAnnuel * 0.7 : Math.max(0, loyerAnnuel - charges);
  const impot = base * (tmi + ps);
  return {
    investi,
    loyerAnnuel,
    brut: loyerAnnuel / investi,
    net: (loyerAnnuel - charges) / investi,
    netNet: (loyerAnnuel - charges - impot) / investi,
    impot,
    cashflowMensuel: (loyerAnnuel - charges - impot) / 12,
    microEligible: loyerMensuel * 12 <= 15000,
  };
}

/* ============================================================ SCPI */

export function simulationSCPI({
  montant, fraisEntree = 0.1, td = 0.06, revalo = 0.005, annees = 10,
  delaiJouissanceMois = 4, tmi = 0.3, frontalier = false, reinvestir = false,
}) {
  const ps = frontalier ? FISCAL.solidarite : FISCAL.psFonciers;
  let parts = montant; // exprimé en € au prix de souscription initial
  let cumulNet = 0;
  let cumulBrut = 0;
  const serie = [];
  for (let a = 1; a <= annees; a++) {
    const prix = Math.pow(1 + revalo, a - 1);
    const mois = a === 1 ? Math.max(0, 12 - delaiJouissanceMois) : 12;
    const brut = parts * prix * td * (mois / 12);
    const net = brut * (1 - tmi - ps);
    cumulBrut += brut;
    if (reinvestir) parts += net / prix;
    else cumulNet += net;
    serie.push({
      annee: a,
      brut,
      net,
      cumulNet,
      valeurRetrait: parts * Math.pow(1 + revalo, a) * (1 - fraisEntree),
    });
  }
  const fin = serie[serie.length - 1];
  const totalFinal = fin.valeurRetrait + fin.cumulNet;
  return {
    serie,
    revenuMensuelBrut: (montant * td) / 12,
    revenuMensuelNet: ((montant * td) / 12) * (1 - tmi - ps),
    valeurRetraitInitiale: montant * (1 - fraisEntree),
    valeurRetraitFinale: fin.valeurRetrait,
    cumulNet: fin.cumulNet,
    cumulBrut,
    rendementAnnualise: Math.pow(totalFinal / montant, 1 / annees) - 1,
    tauxImposition: tmi + ps,
  };
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
