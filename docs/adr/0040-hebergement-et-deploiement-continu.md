# 0040. Hébergement sur un VPS et déploiement continu par GitHub Actions

- Statut : accepté
- Date : 2026-11-23
- Complète : [0011](0011-session-web-et-mots-de-passe.md), [0030](0030-page-d-une-pose-et-contrat-http-des-transitions.md), [0039](0039-photos-des-poses-stockage-diffusion-et-traitement.md)

## Contexte
Première mise en ligne de l'API et du site. Le porteur du produit veut payer le moins possible au début, quitte à grandir plus tard, et un déploiement continu par une pipeline GitHub.

Contraintes déjà posées :
- le site et l'API partagent la même origine (ADR 0011 : cookie `__Host-`, `SameSite=Strict`) ;
- le site renvoie `index.html` pour toute route (ADR 0010) ;
- l'API et le site sont livrés ensemble (ADR 0030) ;
- un envoi de photo pèse jusqu'à 11 Mio, et Magick.NET demande jusqu'à 512 Mo de mémoire (ADR 0039) ;
- PostgreSQL porte des verrous consultatifs **de session** (ADR 0017, 0033, 0039) ;
- les photos vont dans un stockage compatible S3 (ADR 0039).

Les clés de Data Protection d'ASP.NET Core, qui chiffrent le cookie de session, étaient gardées dans le dossier du profil de l'utilisateur. Dans un conteneur, elles disparaissent à chaque déploiement : tout le monde serait déconnecté.

## Options envisagées
1. **Hébergement** :
   - (a) un petit VPS européen (Hetzner, Scaleway, OVH) avec Docker Compose : environ 5 €/mois, coût fixe, même origine naturelle derrière un proxy, mais système à entretenir ;
   - (b) une plateforme gérée (Azure Container Apps, Render, Fly.io) et une base gérée : moins d'entretien, mais 15 à 25 €/mois pour la base, et les offres gratuites s'endorment ;
   - (c) une base gratuite mutualisée (Neon, Supabase) : le mode « transaction » de leur pgbouncer casse les verrous consultatifs de session.
2. **Stockage des photos** : (a) RustFS sur le VPS ; (b) Cloudflare R2 (10 Go gratuits, sortie gratuite) ; (c) le stockage objet de l'hébergeur (environ 5 €/mois minimum).
3. **Frontal** : (a) Caddy (HTTPS Let's Encrypt automatique, configuration courte) ; (b) Nginx avec certbot ; (c) Traefik.
4. **Migrations** : (a) au démarrage de l'API ; (b) un « bundle » EF Core exécuté avant de démarrer la nouvelle API.
5. **Clés de Data Protection** : (a) dossier dans un volume ; (b) table de la base (`PersistKeysToDbContext`).
6. **Déclenchement** : (a) un job de plus dans `ci.yml` ; (b) un workflow `deploy.yml` déclenché par la réussite de la CI sur `main`, et lançable à la main pour redéployer une version.

## Décision
**1(a), 2(b), 3(a), 4(b), 5(b), 6(b).**

### Sur le serveur (`deploy/`)
- `compose.yml` :
  - `web` : Caddy, qui sert le site compilé et transmet à l'API les chemins `/catalog/*`, `/contribution/*`, `/flow-generation/*`, `/identity/*`, `/me` et `/health`. Il redirige HTTP vers HTTPS et ajoute les en-têtes de sécurité (HSTS, CSP, `nosniff`, `Referrer-Policy`). Seul service exposé, ports 80 et 443.
  - `api` : l'image de l'API, joignable seulement par Caddy.
  - `migrate` : le bundle EF Core, lancé une fois par déploiement.
  - `postgres` : PostgreSQL 17, avec ses données dans un volume.
- `.env` (non versionné, sur le serveur) : domaine, mot de passe de la base, accès à R2, adresse du premier administrateur. Un modèle `deploy/.env.example` est versionné.
- `backup.sh` : chaque nuit, `pg_dump` compressé envoyé dans un bucket R2 distinct de celui des photos.

### Images (registre GHCR, étiquetées par le SHA du commit)
- `acrofunjam-api` : `deploy/api.Dockerfile`, sur `mcr.microsoft.com/dotnet/aspnet:10.0`. On prend l'image Debian complète et non l'image « chiseled », pour les bibliothèques natives de Magick.NET.
- `acrofunjam-migrations` : même Dockerfile, cible `migrations`, bundle EF Core autonome.
- `acrofunjam-web` : `deploy/web.Dockerfile`, compilation Vite puis `caddy:2-alpine` avec le `Caddyfile`.

### Pipeline (`.github/workflows/deploy.yml`)
1. Déclenché quand le workflow CI réussit sur `main`, ou à la main avec un SHA, ce qui permet de revenir à une version précédente.
2. Construit et publie les trois images.
3. Dans l'environnement GitHub `production` :
   - copie `compose.yml` sur le serveur par SSH ;
   - se connecte à GHCR avec le jeton éphémère du job ;
   - lance `migrate`, puis `up -d` ;
   - vérifie `https://<domaine>/health`.

### API
- **Clés de Data Protection** : gardées dans la table `identity.data_protection_keys`, nom d'application `AcroFunJam`. Elles survivent aux déploiements, sont incluses dans la sauvegarde de la base et seront partagées par plusieurs instances.
- **En-têtes du proxy** : pris en compte par `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` dans le compose. L'API n'est joignable que par Caddy, sur le réseau Docker.

## Conséquences
- Coût de départ : un VPS d'environ 2 vCPU et 4 Go (environ 5 €/mois), R2 gratuit jusqu'à 10 Go, un nom de domaine (environ 10 €/an).
- Pour grandir, dans l'ordre :
  - un serveur plus gros ;
  - une base PostgreSQL gérée (connexion directe ou pool en mode « session », jamais en mode « transaction ») ;
  - plusieurs instances de l'API derrière Caddy, possible puisque les verrous passent par PostgreSQL, les photos par S3 et les clés par la base.
- Le serveur est à notre charge : mises à jour du système, pare-feu, sauvegardes, à vérifier par une restauration de temps en temps. Le guide `docs/deploiement.md` décrit l'installation.
- Une migration doit rester compatible avec la version précédente de l'API pendant les quelques secondes du déploiement. Une migration destructive se fait en deux livraisons.
- Les clés de Data Protection ne sont pas chiffrées au repos : l'accès à la base vaut accès aux sessions, comme pour le reste des données.
- L'application mobile pourra pointer son profil `production` sur `https://<domaine>` (ADR 0038).
- La politique de confidentialité (ADR 0039) reste à écrire avant d'ouvrir le site au public.
