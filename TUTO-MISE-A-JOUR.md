# Mise à jour du site — Gestion de patrimoine frontalier Suisse

## 1. Remplacer le site (GitHub → Vercel)
1. Ouvrir le dépôt **carnet** sur github.com.
2. Supprimer les anciens fichiers (auth.html, app.html, etc.) : *Add file* n'efface rien, donc passer par chaque fichier → ⋯ → *Delete file*, ou recréer le dépôt.
3. *Add file → Upload files* : glisser **tout le contenu** du dossier `gestion-patrimoine-frontalier` (dossiers `js`, `vues`, `vendor`, `fonts`, `supabase` compris) → *Commit changes*.
4. Vercel republie seul en ~1 min sur https://carnet-livid-one.vercel.app
   (renommable : Vercel → Settings → Domains).

`config.js` est déjà rempli avec votre projet Supabase : rien à modifier.

## 2. Mettre à jour la fonction de cotation (Supabase)
1. Supabase → **Edge Functions** → `cotations` → onglet **Code**.
2. Tout remplacer par le contenu de `supabase/cotations.ts` → **Deploy**.
3. Onglet **Details** : décocher **Verify JWT** → *Save*. (Indispensable, sinon erreur 401.)

## 3. Créer le cache des classements
Supabase → **SQL Editor** → *New query* → coller `supabase/migration.sql` → **Run**.

## 4. Vérifier
- En-tête : le taux 1 € = x,xx CHF s'affiche.
- Classements → ETF / Dividendes : les listes se remplissent (premier chargement 10–20 s, ensuite instantané).

## À savoir
- Vos données restent dans le navigateur : faire **Sauvegarde → Exporter** régulièrement, et **Importer** ce fichier sur un autre PC/navigateur.
- Cours et classements : différés ~15 min (cours) / 30 min (classements).
- SCPI : taux de distribution publiés **une fois par an** (2025) — pas de temps réel possible.
- Projet Supabase gratuit mis en pause après 7 jours sans visite : bouton *Restore* dans Supabase.
