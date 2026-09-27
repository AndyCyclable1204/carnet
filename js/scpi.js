// Taux de distribution (TD) 2025 publiés par les sociétés de gestion,
// consolidés par l'open data Louve Invest (via Argent & Salaire, consulté en septembre 2026).
// Le TD d'une SCPI est annuel par nature : cette liste se met à jour une fois par an,
// après la publication des bulletins du 4e trimestre (janvier-février).
// Frais = commission de souscription ; prix = prix de souscription d'une part.

export const SCPI_SOURCE = { annee: 2025, maj: '2026-09', source: 'Sociétés de gestion, open data Louve Invest' };

export const SCPI = [
  { nom: 'Wemo One', gerant: 'Wemo Reim', td: 0.1527, frais: 0.10, prix: 210, creation: 2024, zone: 'France / Europe' },
  { nom: 'Reason', gerant: 'MNK Partners', td: 0.129, frais: 0.12, prix: 1.03, creation: 2024, zone: 'Europe' },
  { nom: 'Iroko Atlas', gerant: 'Iroko', td: 0.0941, frais: 0, prix: 200, creation: 2025, zone: 'Europe / International' },
  { nom: 'MomenTime', gerant: 'Arkéa REIM', td: 0.0925, frais: 0.10, prix: 200, creation: 2025, zone: 'France / International' },
  { nom: 'Sofidynamic', gerant: 'Sofidy', td: 0.0904, frais: 0.02, prix: 320, creation: 2024, zone: 'France / Europe' },
  { nom: 'Comète', gerant: 'Alderan', td: 0.09, frais: 0.10, prix: 250, creation: 2023, zone: 'Europe / International' },
  { nom: 'Remake UK', gerant: 'Remake', td: 0.09, frais: 0.085, prix: 1025, creation: 2025, zone: 'Royaume-Uni' },
  { nom: 'EDR Europa', gerant: 'EDR REIM', td: 0.0875, frais: 0.10, prix: 202, creation: 2024, zone: 'France / Europe' },
  { nom: 'Elevation Tertiom', gerant: 'Elevation Capital Partners', td: 0.0825, frais: 0, prix: 200, creation: 2024, zone: 'France (DROM-COM)' },
  { nom: 'Mistral Sélection', gerant: 'Swiss Life', td: 0.0807, frais: 0, prix: 180, creation: 2024, zone: 'Zone euro' },
  { nom: 'Eden', gerant: 'Advenis REIM', td: 0.08, frais: 0, prix: 50, creation: 2024, zone: 'Europe' },
  { nom: 'Corum USA', gerant: 'Corum AM', td: 0.077, frais: 0.12, prix: 200, creation: 2024, zone: 'États-Unis' },
  { nom: 'Transitions Europe', gerant: 'Arkéa REIM', td: 0.076, frais: 0.10, prix: 202, creation: 2022, zone: 'Europe' },
  { nom: 'Darwin RE01', gerant: 'Darwin Invest', td: 0.0754, frais: 0.08, prix: 202, creation: 2024, zone: 'France / Europe' },
  { nom: 'Opportunités Territoires', gerant: 'Perial AM', td: 0.075, frais: 0.11, prix: 51, creation: 2025, zone: 'Régions françaises' },
  { nom: 'Iroko Zen', gerant: 'Iroko', td: 0.0714, frais: 0, prix: 205, creation: 2020, zone: 'France / Europe' },
  { nom: 'Linaclub', gerant: 'Aestiam', td: 0.071, frais: 0.108, prix: 204, creation: 2024, zone: 'Europe' },
  { nom: 'NCap Continent', gerant: 'Norma Capital', td: 0.071, frais: 0.10, prix: 210, creation: 2023, zone: 'Europe' },
  { nom: 'Remake Live', gerant: 'Remake', td: 0.0705, frais: 0, prix: 204, creation: 2022, zone: 'France / Europe' },
  { nom: 'Epsilon 360', gerant: 'Epsicap REIM', td: 0.0701, frais: 0.05, prix: 257, creation: 2021, zone: 'France / Europe' },
  { nom: 'Osmo Énergie', gerant: 'Mata Capital', td: 0.07, frais: 0.137, prix: null, creation: null, zone: 'France / Europe' },
  { nom: 'Épargne Pierre Europe', gerant: 'Atland Voisin', td: 0.0675, frais: 0.10, prix: null, creation: null, zone: 'Europe' },
  { nom: 'Corum Origin', gerant: 'Corum AM', td: 0.065, frais: 0.12, prix: null, creation: null, zone: 'Europe' },
];
