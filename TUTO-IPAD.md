# Mettre Carnet en ligne depuis un iPad — pas à pas

Tous les fichiers sont au même niveau, il n'y a aucun dossier à recréer. Compte 45 minutes.

Trois comptes à avoir : GitHub, Supabase, Vercel. Tous gratuits, tous créables depuis Safari.

---

## 1. Récupérer les fichiers (2 min)

1. Télécharge `carnet.zip` depuis la conversation.
2. Ouvre l'app **Fichiers** → Téléchargements → appuie sur `carnet.zip`. Un dossier `carnet` apparaît avec 15 fichiers.

---

## 2. Créer le dépôt GitHub (10 min)

1. Sur `github.com`, connecte-toi → **+** en haut à droite → **New repository**.
2. Nom : `carnet`. Laisse **Public**. Ne coche rien d'autre. → **Create repository**.
3. Sur la page qui s'affiche : lien **uploading an existing file**.
4. Bouton **choose your files** → **Parcourir** → dossier `carnet` → **Sélect.** en haut à droite → sélectionne les **15 fichiers** (appui long puis balayage, ou « Tout sélectionner ») → **Ouvrir**.
5. En bas : **Commit changes**.

Les 15 fichiers doivent apparaître dans la liste du dépôt. S'il en manque, recommence l'upload avec ceux qui manquent : ça s'ajoute.

---

## 3. Créer la base Supabase (10 min)

1. `supabase.com` → **New project**.
2. **Name** : `carnet`.
3. **Database Password** : *Generate a password*, puis enregistre-le dans ton gestionnaire de mots de passe. Il n'est pas récupérable ensuite.
4. **Region** : `Europe (Frankfurt)` ou `Europe (Paris)`. Choix définitif.
5. **Create new project**. Attends 2 à 3 minutes.

### Créer les tables

1. Dans l'autre onglet Safari, sur GitHub, ouvre le fichier `schema.sql` → bouton **Copy raw file** (icône de copie en haut à droite du code).
2. Retour sur Supabase → menu de gauche **SQL Editor** → **New query** → colle → **Run**.
3. Résultat attendu : `Success. No rows returned`.

### Vérifier la sécurité — ne saute pas cette étape

Nouvelle requête, colle ceci, **Run** :

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
```

Tu dois voir 7 lignes (`biens`, `comptes`, `cotations`, `positions`, `prets`, `profils`, `releves`), **toutes avec `true`** dans la colonne de droite.

Si une seule affiche `false` : rejoue `schema.sql`. Tant que ce n'est pas bon, ne mets rien en ligne — c'est ce qui empêche un visiteur de lire les données des autres comptes.

---

## 4. Récupérer les 2 clés et les mettre dans `config.js` (5 min)

Sur Supabase :

1. Roue dentée **Settings** (en bas à gauche) → **API Keys**.
2. S'il n'y a pas encore de clé : **Create new API keys**. Copie la **Publishable key** — elle commence par `sb_publishable_`.
3. Settings → **Data API** : copie l'**URL** du projet — `https://xxxxxxxx.supabase.co`.

Sur GitHub :

4. Ouvre le fichier `config.js` → icône **crayon** (Edit).
5. Remplace les deux valeurs entre apostrophes :

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_xxxxxxxxxxxx';
```

6. **Commit changes** (bouton vert), puis **Commit changes** dans la fenêtre.

⚠️ Ne mets jamais la clé **Secret** / `service_role` dans ce fichier. Elle contourne toutes les protections. Elle ne sert nulle part ici : Supabase la fournit automatiquement aux fonctions.

---

## 5. Déployer les 2 fonctions serveur (10 min)

Elles font ce que le navigateur ne peut pas faire : chercher les cours de bourse, et supprimer un compte.

**Fonction 1 :**

1. Supabase → menu de gauche **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. **Name** : `cotations` — exactement, sans majuscule ni accent.
3. Sur GitHub, ouvre `cotations.ts` → **Copy raw file**.
4. Reviens sur Supabase, efface tout le code d'exemple, colle.
5. Laisse **Verify JWT** activé → **Deploy function**.

**Fonction 2 :** même chose avec le nom `supprimer-compte` et le fichier `supprimer-compte.ts`.

---

## 6. Publier le site sur Vercel (5 min)

1. `vercel.com` → connecte-toi **avec ton compte GitHub** (le plus simple).
2. **Add New** → **Project** → **Import** en face du dépôt `carnet`. Si le dépôt n'apparaît pas : *Adjust GitHub App Permissions* et autorise-le.
3. **Framework Preset** : `Other`. Ne remplis aucun champ de build.
4. **Deploy**. Attends une minute.
5. Note l'adresse obtenue : `https://carnet-xxxx.vercel.app`.

---

## 7. Brancher l'authentification sur cette adresse (3 min)

Sans ça, les mails de confirmation ne mèneront nulle part.

Supabase → **Authentication** → **URL Configuration** :

- **Site URL** : `https://carnet-xxxx.vercel.app`
- **Redirect URLs** — ajoute ces deux lignes :
  - `https://carnet-xxxx.vercel.app/app.html`
  - `https://carnet-xxxx.vercel.app/auth.html`

**Save**.

Puis **Authentication** → **Sign In / Providers** → *Email* : vérifie que **Confirm email** est activé.

---

## 8. Tester (10 min)

Ouvre ton adresse Vercel dans Safari, et fais ces 11 points dans l'ordre :

| # | Action | Attendu |
|---|---|---|
| 1 | Bouger les curseurs de l'accueil | Montant et graphique se recalculent |
| 2 | Créer un compte avec une vraie adresse | Mail reçu en moins d'une minute |
| 3 | Cliquer le lien du mail | Retour sur le site, connecté |
| 4 | Ajouter un bien à 300 000 € | Équité nette = 300 000 € |
| 5 | Ajouter un prêt : 200 000 €, 1,5 %, 240 mois, relevé daté d'il y a 1 an | Capital restant affiché **inférieur** à 200 000 €, mention « estimé depuis… » |
| 6 | Ajouter une enveloppe, puis une ligne avec le symbole `CW8.PA` | La ligne apparaît |
| 7 | **Actualiser les cours** | Le cours se met à jour, date du jour affichée |
| 8 | Historique → **Enregistrer un point** | Un point sur la courbe |
| 9 | Mon compte → **Télécharger mes données** | Un fichier JSON |
| 10 | Se déconnecter, se reconnecter | Tout est là |
| 11 | **Supprimer mon compte** | Dans Supabase → Authentication → Users, l'utilisateur a disparu |

Le 11 est celui qu'on oublie, et c'est celui qui te met en défaut RGPD s'il ne marche pas.

---

## 9. Avant de diffuser l'adresse

À faire uniquement quand tu comptes ouvrir aux autres :

- **Mails** : l'envoi intégré de Supabase est bridé à quelques messages par heure. Crée un compte Resend ou Brevo (gratuit) et renseigne le SMTP dans **Authentication → Emails**. Sinon les inscriptions cassent silencieusement.
- **Anti-robots** : **Authentication → Attack Protection** → active le CAPTCHA.
- **Mentions légales** : sur GitHub, édite `legal.html`, remplace tous les `[crochets]`, supprime le bandeau rouge en haut. Obligatoire dès que tu collectes des données.
- **Polices** : elles viennent de Google Fonts, ce qui transmet l'IP des visiteurs à Google. À rapatrier en local pour un site français ouvert au public.

---

## Modifier le site plus tard

Tout se fait sur GitHub : ouvre le fichier, crayon, modifie, **Commit changes**. Vercel republie tout seul en une minute. Les changements de base passent par le SQL Editor de Supabase.

---

## Si ça coince

| Symptôme | Cause quasi certaine |
|---|---|
| Page blanche | Faute de frappe dans `config.js` |
| `Invalid API key` | Clé tronquée ou espace au collage |
| Le lien du mail mène à une erreur | Étape 7 non faite ou adresse mal recopiée |
| Connecté mais rien ne s'enregistre | La vérification de l'étape 3 n'a pas été faite |
| « Mise à jour impossible » sur les cours | Nom de la fonction mal orthographié (`cotations`) |
| Suppression de compte en échec | Fonction `supprimer-compte` non déployée |

**Point à connaître** : un projet Supabase gratuit se met en pause après 7 jours sans aucune activité. Il se réveille à la main depuis le tableau de bord. Tant que le site a peu de trafic, ça arrivera.
