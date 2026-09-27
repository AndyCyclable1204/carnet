// Taux de distribution (TD) 2025 publiés par les sociétés de gestion,
// consolidés par l'open data Louve Invest (via Argent & Salaire, consulté en septembre 2026).
// Le TD d'une SCPI est annuel par nature : cette liste se met à jour une fois par an,
// après la publication des bulletins du 4e trimestre (janvier-février).
//
// frais   : commission de souscription (part du prix payé qui ne se retrouve pas dans la valeur de retrait)
// fg      : commission de gestion, en % TTC des loyers encaissés (déjà déduite du TD)
// etr     : part des revenus de source étrangère (hors France)
// impEtr  : impôt payé à l'étranger, en % des revenus étrangers (estimation moyenne)
// dj      : délai de jouissance en mois
// Les valeurs fg, etr, impEtr et dj sont indicatives (sites des gestionnaires et comparateurs,
// septembre 2026) : elles bougent au gré des acquisitions. Le DIC et le dernier bulletin font foi.

export const SCPI_SOURCE = { annee: 2025, maj: '2026-09', source: 'Sociétés de gestion, open data Louve Invest' };

export const SCPI = [
  { nom: 'Wemo One', gerant: 'Wemo Reim', td: 0.1527, frais: 0.10, prix: 210, creation: 2024, zone: 'France / Europe', fg: 0.12, etr: 0.3, impEtr: 0.15, dj: 4 },
  { nom: 'Reason', gerant: 'MNK Partners', td: 0.129, frais: 0.12, prix: 1.03, creation: 2024, zone: 'Europe', fg: 0.12, etr: 0.8, impEtr: 0.15, dj: 4 },
  { nom: 'Iroko Atlas', gerant: 'Iroko', td: 0.0941, frais: 0, prix: 200, creation: 2025, zone: 'Europe / International', fg: 0.144, etr: 1, impEtr: 0.176, dj: 3, sortie: 'Commission de retrait les premières années' },
  { nom: 'MomenTime', gerant: 'Arkéa REIM', td: 0.0925, frais: 0.10, prix: 200, creation: 2025, zone: 'France / International', fg: 0.12, etr: 0.5, impEtr: 0.15, dj: 4 },
  { nom: 'Sofidynamic', gerant: 'Sofidy', td: 0.0904, frais: 0.02, prix: 320, creation: 2024, zone: 'France / Europe', fg: 0.12, etr: 0.3, impEtr: 0.15, dj: 4 },
  { nom: 'Comète', gerant: 'Alderan', td: 0.09, frais: 0.12, prix: 250, creation: 2023, zone: 'Europe / International', fg: 0.132, etr: 1, impEtr: 0.18, dj: 6 },
  { nom: 'Remake UK', gerant: 'Remake', td: 0.09, frais: 0.085, prix: 1025, creation: 2025, zone: 'Royaume-Uni', fg: 0.18, etr: 1, impEtr: 0.2, dj: 4 },
  { nom: 'EDR Europa', gerant: 'EDR REIM', td: 0.0875, frais: 0.10, prix: 202, creation: 2024, zone: 'France / Europe', fg: 0.12, etr: 0.8, impEtr: 0.15, dj: 4 },
  { nom: 'Elevation Tertiom', gerant: 'Elevation Capital Partners', td: 0.0825, frais: 0, prix: 200, creation: 2024, zone: 'France (DROM-COM)', fg: 0.12, etr: 0, impEtr: 0, dj: 4 },
  { nom: 'Mistral Sélection', gerant: 'Swiss Life', td: 0.0807, frais: 0, prix: 180, creation: 2024, zone: 'Zone euro', fg: 0.12, etr: 0.7, impEtr: 0.15, dj: 4 },
  { nom: 'Eden', gerant: 'Advenis REIM', td: 0.08, frais: 0, prix: 50, creation: 2024, zone: 'Europe', fg: 0.12, etr: 0.9, impEtr: 0.15, dj: 4 },
  { nom: 'Corum USA', gerant: 'Corum AM', td: 0.077, frais: 0.12, prix: 200, creation: 2024, zone: 'États-Unis', fg: 0.132, etr: 1, impEtr: 0.2, dj: 6 },
  { nom: 'Transitions Europe', gerant: 'Arkéa REIM', td: 0.076, frais: 0.12, prix: 202, creation: 2022, zone: 'Europe hors France', fg: 0.12, etr: 1, impEtr: 0.15, dj: 6 },
  { nom: 'Darwin RE01', gerant: 'Darwin Invest', td: 0.0754, frais: 0.08, prix: 202, creation: 2024, zone: 'France / Europe', fg: 0.12, etr: 0.4, impEtr: 0.15, dj: 4 },
  { nom: 'Opportunités Territoires', gerant: 'Perial AM', td: 0.075, frais: 0.11, prix: 51, creation: 2025, zone: 'Régions françaises', fg: 0.12, etr: 0, impEtr: 0, dj: 4 },
  { nom: 'Iroko Zen', gerant: 'Iroko', td: 0.0714, frais: 0, prix: 205, creation: 2020, zone: 'France / Europe', fg: 0.144, etr: 0.55, impEtr: 0.154, dj: 3, sortie: '5 % HT si revente avant 3 ans' },
  { nom: 'Linaclub', gerant: 'Aestiam', td: 0.071, frais: 0.108, prix: 204, creation: 2024, zone: 'Europe', fg: 0.12, etr: 0.5, impEtr: 0.15, dj: 4 },
  { nom: 'NCap Continent', gerant: 'Norma Capital', td: 0.071, frais: 0.10, prix: 210, creation: 2023, zone: 'Europe hors France', fg: 0.12, etr: 1, impEtr: 0.15, dj: 4 },
  { nom: 'Remake Live', gerant: 'Remake', td: 0.0705, frais: 0, prix: 204, creation: 2022, zone: 'France / Europe', fg: 0.18, etr: 0.5, impEtr: 0.15, dj: 3, sortie: '5 % si revente avant 5 ans' },
  { nom: 'Epsilon 360', gerant: 'Epsicap REIM', td: 0.0701, frais: 0.05, prix: 257, creation: 2021, zone: 'France / Europe', fg: 0.12, etr: 0.3, impEtr: 0.15, dj: 4 },
  { nom: 'Osmo Énergie', gerant: 'Mata Capital', td: 0.07, frais: 0.137, prix: null, creation: null, zone: 'France / Europe', fg: 0.12, etr: 0.4, impEtr: 0.15, dj: 4 },
  { nom: 'Épargne Pierre Europe', gerant: 'Atland Voisin', td: 0.0675, frais: 0.10, prix: null, creation: null, zone: 'Europe hors France', fg: 0.12, etr: 1, impEtr: 0.15, dj: 4 },
  { nom: 'Corum Origin', gerant: 'Corum AM', td: 0.065, frais: 0.1196, prix: null, creation: null, zone: 'Europe', fg: 0.132, etr: 0.85, impEtr: 0.15, dj: 6 },
];

// Majoritairement investie hors de France ?
export const horsFrance = (x) => (x.etr ?? 0) >= 0.5;
