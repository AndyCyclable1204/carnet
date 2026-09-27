export function rendre(vue) {
  vue.innerHTML = `
  <div class="carte" style="max-width:820px;margin-inline:auto">
    <span class="surtitre">Informations</span>
    <h1 style="font-size:clamp(1.6rem,4vw,2.2rem);margin-bottom:1.2rem">Mentions légales et confidentialité</h1>

    <h3>Éditeur</h3>
    <p class="discret">Site personnel non commercial, édité à titre privé. Contact : <a href="mailto:CONTACT@EXEMPLE.FR">CONTACT@EXEMPLE.FR</a>.</p>

    <h3>Hébergement</h3>
    <p class="discret">Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.</p>

    <h3>Vos données</h3>
    <p class="discret">Aucune donnée personnelle n'est collectée ni transmise. Tout ce que vous saisissez (biens, crédits, placements, prévoyance) est enregistré uniquement dans le stockage local de votre navigateur, sur votre appareil. Le site n'utilise ni compte, ni cookie, ni outil de mesure d'audience, ni publicité. Les polices et la bibliothèque de graphiques sont hébergées avec le site : aucun appel à un service tiers n'est fait pour les afficher.</p>
    <p class="discret">Pour afficher les cours, le taux EUR/CHF et les classements, le site interroge un service de cotation (Supabase, fonction « cotations ») qui ne reçoit que des symboles boursiers, jamais vos montants ni votre identité. Ce service relaie les données publiques de Yahoo Finance.</p>
    <p class="discret">Vous pouvez tout effacer à tout moment depuis la page Sauvegarde, ou en vidant les données du site dans votre navigateur.</p>

    <h3>Avertissement</h3>
    <p class="discret">Les simulateurs, projections et classements sont fournis à titre informatif et pédagogique. Ils reposent sur des hypothèses simplifiées et sur les paramètres légaux connus en 2026 (LPP, 3<sup>e</sup> pilier, prélèvements sociaux). Ils ne constituent ni un conseil en investissement, ni un conseil fiscal ou juridique. Les performances passées ne préjugent pas des performances futures. Les cours sont différés et peuvent être inexacts. Avant toute décision, rapprochez-vous d'un professionnel.</p>

    <h3>Sources</h3>
    <p class="discret">Paramètres LPP : Office fédéral des assurances sociales. Prélèvements sociaux : loi de financement de la Sécurité sociale pour 2026. Taux de distribution des SCPI : sociétés de gestion (open data Louve Invest). Cours et dividendes : Yahoo Finance.</p>
  </div>`;
}
