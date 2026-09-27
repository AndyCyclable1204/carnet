// Toutes les données restent dans le navigateur (localStorage).
// Aucune donnée personnelle n'est envoyée à un serveur.

import { convertir } from './format.js';
import { etatPret, LPP } from './finance.js';

const CLE = 'gpfs:donnees';
const CLE_PRECEDENT = 'gpfs:avant-import';
export const APP = 'gestion-patrimoine-frontalier-suisse';
const VERSION = 1;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const ilYa = (annees) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - annees);
  return d.toISOString().slice(0, 10);
};

export function etatInitial() {
  return {
    app: APP,
    version: VERSION,
    creeLe: new Date().toISOString(),
    exemple: true,
    reglages: {
      devise: 'EUR',
      frontalier: true,
      age: 30,
      tauxChange: 0.93,
      tauxChangeLe: null,
      inclurePrevoyance: true,
    },
    biens: [],
    prets: [],
    enveloppes: [
      {
        id: uid(),
        nom: 'PEA',
        type: 'PEA',
        devise: 'EUR',
        mode: 'simple',
        valeur: 40000,
        verses: 30000,
        versementMensuel: 300,
        rendement: 0.07,
        dateOuverture: ilYa(6),
        especes: 0,
        lignes: [],
      },
    ],
    lpp: {
      actif: false,
      salaire: 85000,
      avoir: 30000,
      salaireAssure: null,
      tauxManuel: null,
      partEmployeur: 0.5,
      interet: LPP.tauxInteretMinimal,
      ageRetraite: 65,
      progression: 0,
    },
    pilier3: [],
    historique: [],
    derniereSauvegarde: null,
  };
}

let etat = charger();
const abonnes = new Set();

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return etatInitial();
    return migrer(JSON.parse(brut));
  } catch {
    return etatInitial();
  }
}

// Complète un état ancien ou incomplet avec les valeurs par défaut.
function migrer(e) {
  const d = etatInitial();
  return {
    ...d,
    ...e,
    reglages: { ...d.reglages, ...(e.reglages || {}) },
    lpp: { ...d.lpp, ...(e.lpp || {}) },
    biens: e.biens || [],
    prets: e.prets || [],
    enveloppes: (e.enveloppes || []).map((x) => ({ lignes: [], especes: 0, mode: 'simple', ...x })),
    pilier3: e.pilier3 || [],
    historique: e.historique || [],
  };
}

export const lire = () => etat;

export function modifier(fn) {
  fn(etat);
  etat.exemple = false;
  enregistrer();
}

// Modification sans retirer le drapeau "exemple" (réglages d'affichage).
export function reglage(fn) {
  fn(etat.reglages);
  enregistrer();
}

function enregistrer() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch (e) {
    console.error('Enregistrement impossible', e);
  }
  abonnes.forEach((f) => f(etat));
}

export const abonner = (f) => (abonnes.add(f), () => abonnes.delete(f));

export async function demanderPersistance() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {}
}

/* ------------------------------------------------ sauvegarde et restauration */

export function exporter() {
  etat.derniereSauvegarde = new Date().toISOString();
  enregistrer();
  const blob = new Blob([JSON.stringify(etat, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `patrimoine-frontalier-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function lireFichier(fichier) {
  const texte = await fichier.text();
  let d;
  try {
    d = JSON.parse(texte);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide (JSON illisible).");
  }
  if (d.app !== APP) throw new Error("Ce fichier ne provient pas de Gestion de patrimoine frontalier Suisse.");
  return migrer(d);
}

export function restaurer(donnees) {
  localStorage.setItem(CLE_PRECEDENT, JSON.stringify(etat));
  etat = migrer(donnees);
  enregistrer();
}

export const peutAnnulerImport = () => !!localStorage.getItem(CLE_PRECEDENT);

export function annulerImport() {
  const p = localStorage.getItem(CLE_PRECEDENT);
  if (!p) return;
  etat = migrer(JSON.parse(p));
  localStorage.removeItem(CLE_PRECEDENT);
  enregistrer();
}

export function reinitialiser(vide = true) {
  localStorage.setItem(CLE_PRECEDENT, JSON.stringify(etat));
  etat = etatInitial();
  if (vide) {
    etat.enveloppes = [];
    etat.exemple = false;
  }
  enregistrer();
}

export function joursDepuisSauvegarde() {
  if (!etat.derniereSauvegarde) return null;
  return Math.floor((Date.now() - new Date(etat.derniereSauvegarde)) / 86400000);
}

/* ------------------------------------------------ bilan */

export function valeurEnveloppe(e) {
  if (e.mode !== 'avance') return +e.valeur || 0;
  const titres = (e.lignes || []).reduce((s, l) => s + (+l.quantite || 0) * (+l.dernierPrix || +l.prixRevient || 0), 0);
  return titres + (+e.especes || 0);
}

export function ancienneteAnnees(date) {
  if (!date) return 0;
  return (Date.now() - new Date(date)) / (365.25 * 86400000);
}

export function bilan(e = etat, devise = e.reglages.devise) {
  const t = e.reglages.tauxChange;
  const c = (m, d) => convertir(+m || 0, d || 'EUR', devise, t);
  const parDevise = { EUR: 0, CHF: 0 };
  const ajout = (m, d) => (parDevise[d || 'EUR'] += c(m, d));

  const immobilier = e.biens.reduce((s, b) => (ajout(b.valeur, b.devise), s + c(b.valeur, b.devise)), 0);

  const prets = e.prets.map((p) => ({ ...p, calc: etatPret(p) }));
  const dette = prets.reduce((s, p) => (ajout(-p.calc.capitalRestant, p.devise), s + c(p.calc.capitalRestant, p.devise)), 0);
  const amortiMensuel = prets.reduce((s, p) => s + c(p.calc.amortiMensuel, p.devise), 0);

  const placements = e.enveloppes.reduce((s, x) => {
    const v = valeurEnveloppe(x);
    ajout(v, x.devise);
    return s + c(v, x.devise);
  }, 0);
  const versementsMensuels = e.enveloppes.reduce((s, x) => s + c(x.versementMensuel, x.devise), 0);
  const rendementMoyen = placements
    ? e.enveloppes.reduce((s, x) => s + c(valeurEnveloppe(x), x.devise) * (+x.rendement || 0), 0) / placements
    : 0.05;

  const lpp = e.lpp.actif ? c(e.lpp.avoir, 'CHF') : 0;
  const p3 = e.pilier3.reduce((s, x) => s + c(x.capital, 'CHF'), 0);
  const prevoyance = lpp + p3;
  if (e.reglages.inclurePrevoyance) {
    if (e.lpp.actif) ajout(e.lpp.avoir, 'CHF');
    e.pilier3.forEach((x) => ajout(x.capital, 'CHF'));
  }

  const net = immobilier - dette + placements + (e.reglages.inclurePrevoyance ? prevoyance : 0);
  return {
    devise,
    immobilier,
    dette,
    equiteImmo: immobilier - dette,
    amortiMensuel,
    placements,
    versementsMensuels,
    rendementMoyen,
    lpp,
    pilier3: p3,
    prevoyance,
    net,
    prets,
    parDevise,
  };
}
