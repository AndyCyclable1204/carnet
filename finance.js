// Carnet — moteur de calcul. Aucune dépendance, réutilisé par les simulateurs
// publics et par le tableau de bord. Toutes les durées sont en mois, tous les
// taux sont annuels et exprimés en décimal (0.06 = 6 %).

export const tauxMensuelCompose = (annuel) => Math.pow(1 + annuel, 1 / 12) - 1;

// Crédit immobilier français : taux proportionnel (annuel / 12), pas équivalent.
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
  let interetsCumules = 0;
  const lignes = [];
  for (let n = 1; n <= dureeMois; n++) {
    const interets = restant * i;
    let part = n === dureeMois ? restant : m - interets;
    if (part > restant) part = restant;
    restant = Math.max(0, restant - part);
    interetsCumules += interets;
    lignes.push({ mois: n, interets, capital: part, assurance, restant });
  }
  return {
    mensualite: m,
    mensualiteAvecAssurance: m + assurance,
    assurance,
    lignes,
    interetsTotaux: interetsCumules,
    coutTotal: interetsCumules + assurance * dureeMois,
  };
}

// Capital amorti à venir sur un prêt déjà entamé, à partir du capital restant dû.
export function amortissementFutur({ capitalRestant, tauxAnnuel, moisRestants, horizonMois }) {
  const i = tauxAnnuel / 12;
  const m = mensualite(capitalRestant, tauxAnnuel, moisRestants);
  const bornes = Math.min(moisRestants, horizonMois);
  let restant = capitalRestant;
  let amorti = 0;
  const parMois = [];
  for (let n = 1; n <= bornes; n++) {
    const interets = restant * i;
    const part = Math.min(m - interets, restant);
    restant -= part;
    amorti += part;
    parMois.push(amorti);
  }
  return {
    amorti,
    parMois,
    mensualite: m,
    amortiMensuelMoyen: bornes ? amorti / bornes : 0,
    capitalRestantFin: restant,
  };
}

// Capital restant dû aujourd'hui, déduit de la date de départ du prêt.
export function capitalRestantEstime({ capital, tauxAnnuel, dureeMois, moisEcoules }) {
  const i = tauxAnnuel / 12;
  if (moisEcoules <= 0) return capital;
  if (moisEcoules >= dureeMois) return 0;
  if (i === 0) return capital * (1 - moisEcoules / dureeMois);
  const m = mensualite(capital, tauxAnnuel, dureeMois);
  return capital * Math.pow(1 + i, moisEcoules) - m * ((Math.pow(1 + i, moisEcoules) - 1) / i);
}

// Projection patrimoniale : trois briques empilées.
// 1. financier   — capital de départ capitalisé + versements mensuels
// 2. amortissement — capital de crédit remboursé mois après mois (dette qui s'efface)
// 3. immobilier  — équité nette actuelle, éventuellement revalorisée
export function projection({
  capitalInitial = 0,
  epargneMensuelle = 0,
  rendement = 0.06,
  annees = 10,
  amortiMensuel = 0,
  equiteImmo = 0,
  valeurImmo = 0,
  revaloImmo = 0,
}) {
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
    const plusValueImmo = valeurImmo ? valeurImmo * (Math.pow(1 + revaloImmo, a) - 1) : 0;
    const base = equiteImmo + plusValueImmo;
    series.push({
      annee: a,
      financier,
      amorti,
      immobilier: base,
      total: financier + amorti + base,
      verses: capitalInitial + epargneMensuelle * 12 * a,
    });
  }
  const fin = series[series.length - 1];
  return {
    series,
    total: fin.total,
    rendementGenere: fin.financier - capitalInitial - epargneMensuelle * 12 * annees,
  };
}

export function rendementLocatif({
  prix,
  frais = 0,
  travaux = 0,
  loyerMensuel,
  chargesAnnuelles = 0,
  taxeFonciere = 0,
  vacance = 0,
}) {
  const investi = prix + frais + travaux;
  if (!investi) return { investi: 0, loyerAnnuel: 0, brut: 0, net: 0, cashflowMensuel: 0 };
  const loyerAnnuel = loyerMensuel * 12 * (1 - vacance);
  const chargesTotales = chargesAnnuelles + taxeFonciere;
  return {
    investi,
    loyerAnnuel,
    brut: loyerAnnuel / investi,
    net: (loyerAnnuel - chargesTotales) / investi,
    cashflowMensuel: (loyerAnnuel - chargesTotales) / 12,
  };
}

export function capaciteEmprunt({
  revenusMensuels,
  chargesCredits = 0,
  tauxAnnuel,
  dureeMois,
  tauxEndettement = 0.35,
  apport = 0,
}) {
  const mensualiteMax = Math.max(0, revenusMensuels * tauxEndettement - chargesCredits);
  const i = tauxAnnuel / 12;
  const capital =
    i === 0 ? mensualiteMax * dureeMois : (mensualiteMax * (1 - Math.pow(1 + i, -dureeMois))) / i;
  return { mensualiteMax, capital, budget: capital + apport };
}

// Agrégats du tableau de bord.
export function patrimoineNet({ biens = [], prets = [], comptes = [], positions = [] }) {
  const immobilier = biens.reduce((s, b) => s + (+b.valeur || 0), 0);
  const dette = prets.reduce((s, p) => s + (+p.capital_restant || 0), 0);
  const especes = comptes.reduce((s, c) => s + (+c.solde_especes || 0), 0);
  const titres = positions.reduce(
    (s, p) => s + (+p.quantite || 0) * (+p.dernier_prix || +p.prix_revient || 0),
    0
  );
  const financier = especes + titres;
  return {
    immobilier,
    dette,
    especes,
    titres,
    financier,
    brut: immobilier + financier,
    net: immobilier + financier - dette,
    equiteImmo: immobilier - dette,
  };
}

export function repartition(agregats) {
  const total = Math.max(agregats.net, 1);
  return [
    { cle: 'immobilier', libelle: 'Immobilier net', valeur: agregats.equiteImmo, part: agregats.equiteImmo / total },
    { cle: 'titres', libelle: 'Titres', valeur: agregats.titres, part: agregats.titres / total },
    { cle: 'especes', libelle: 'Liquidités', valeur: agregats.especes, part: agregats.especes / total },
  ];
}
