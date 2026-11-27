# Mise en ligne d'AcroFunJam

En production : `https://acrofunjam.fr`, sur un VPS M d'IONOS (2 vCPU, 4 Go), adresse `31.70.198.105`.

Le site et l'API tournent sur un seul serveur, dans Docker. Caddy sert le site et transmet les appels à l'API, sur le même domaine. PostgreSQL tourne à côté, et les photos et les vidéos sont stockées sur Cloudflare R2. Un service `worker` prépare les vidéos des transitions avec ffmpeg, une à la fois, dans un conteneur limité à un cœur et 1 Go ([ADR 0041](adr/0041-videos-des-transitions-televersement-preparation-et-diffusion.md)). Chaque push sur `main` dont la CI réussit est déployé par `.github/workflows/deploy.yml`. Les choix sont justifiés dans l'[ADR 0040](adr/0040-hebergement-et-deploiement-continu.md).

```
Internet ──443──► Caddy (site + proxy) ──► API ──► PostgreSQL ◄── worker (ffmpeg)
                                            │                       │
                                            └────► Cloudflare R2 ◄──┘
                                                   (photos, vidéos)
```

Les comptes, l'achat du domaine et les secrets sont à faire par toi. Compte environ une heure la première fois.

## 1. Ce qu'il faut acheter ou ouvrir

| Quoi | Exemple | Coût indicatif |
|---|---|---|
| Un serveur x86 sous Ubuntu 24.04, au moins 2 vCPU et 4 Go de mémoire | IONOS VPS M (retenu), OVHcloud VPS-1, netcup VPS 500, Hetzner CX23 | 5 à 8 €/mois |
| Un nom de domaine | IONOS (retenu), OVHcloud | ~10 €/an |
| Un compte Cloudflare avec R2 activé (carte bancaire demandée, même pour l'offre gratuite) | | 0 € jusqu'à 10 Go |

Prends un serveur **x86** : les images sont construites pour `linux/amd64`. Un serveur ARM, moins cher chez certains hébergeurs, demanderait de changer la pipeline. Évite les offres à 2 Go de mémoire (IONOS VPS S+, par exemple) : PostgreSQL, l'API et Magick.NET (jusqu'à 512 Mo par photo) n'y tiennent pas pendant un déploiement. Fin 2026, les petites offres d'OVHcloud et de Hetzner étaient souvent en rupture de stock.

Aucun certificat SSL à acheter : Caddy obtient et renouvelle gratuitement celui de Let's Encrypt.

## 2. Le domaine

Chez le registraire, fais pointer l'enregistrement `A` du domaine (`@`) vers l'adresse IPv4 du serveur. Caddy obtient le certificat HTTPS tout seul au premier démarrage, une fois le domaine propagé.

Chez IONOS (**Domaines & SSL → acrofunjam.fr → DNS**) :
- modifie l'enregistrement `A` `@` du « Default Site » ;
- accepte la désactivation du site par défaut qu'IONOS propose alors. Elle retire aussi son enregistrement `AAAA`, qu'il faut supprimer : Let's Encrypt essaierait sinon de joindre le domaine en IPv6, chez IONOS ;
- confirme les coordonnées du titulaire par le lien reçu par e-mail (« Confirmation des données client requise »), sinon le domaine peut être suspendu.

Pendant l'heure qui suit le changement, ton poste peut encore voir l'ancienne adresse : `ipconfig /flushdns`, puis vide le cache DNS du navigateur (`chrome://net-internals/#dns` ou `edge://net-internals/#dns`).

## 3. Cloudflare R2

Sur https://dash.cloudflare.com, menu **R2 Object Storage** :

1. Crée deux buckets : `acrofunjam-photos` et `acrofunjam-backups`. Les deux restent privés : les photos passent par l'API.
2. Dans **Manage API tokens**, crée deux jetons **Object Read & Write**, chacun limité à son bucket (**Apply to specific buckets only**).
3. La page du jeton affiche **une seule fois** l'**Access Key ID**, la **Secret Access Key** et l'adresse **S3 endpoint** (`https://<account id>.r2.cloudflarestorage.com`). Ne les montre à personne, ni dans une capture : un jeton exposé se supprime et se recrée.
4. Sur `acrofunjam-backups`, onglet **Settings**, ajoute une règle de cycle de vie qui supprime les objets après 30 jours.
5. Sur `acrofunjam-photos`, onglet **Settings**, ajoute une règle de cycle de vie limitée au préfixe `originals/`, qui supprime les objets après **2 jours**. Ce sont les vidéos envoyées, en attente de préparation : le worker les supprime lui-même, la règle rattrape celles qu'une panne aurait laissées. Ne l'applique surtout pas à tout le bucket.

L'API envoie chaque taille de photo en un seul morceau, sans somme de contrôle en fin de message : R2 refuse ce mode, que le SDK AWS utilise par défaut (`S3PhotoStorage`).

## 4. Le serveur

Chez IONOS, le Cloud Panel donne l'adresse IPv4 et le mot de passe `root`. Son pare-feu (**Réseau → Stratégies de pare-feu**) passe avant celui du serveur : il doit ouvrir TCP 22, 80 et 443, et de préférence UDP 443 (HTTP/3).

Depuis ton poste, autorise ta clé SSH pour `root` (le mot de passe est demandé une dernière fois) :

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@<adresse> "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Puis, sur le serveur, en `root` :

```sh
# Mises à jour automatiques de sécurité, pare-feu
apt update && apt upgrade -y
apt install -y unattended-upgrades ufw
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw enable

# 2 Go d'échange : une marge quand une photo est traitée pendant un déploiement
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Journaux des conteneurs gardés 14 jours au plus, comme l'annonce la politique de confidentialité
mkdir -p /etc/systemd/journald.conf.d
# journald efface des fichiers entiers : un fichier par jour, pour que rien ne dépasse 14 jours.
printf "[Journal]\nMaxRetentionSec=14day\nMaxFileSec=1day\n" > /etc/systemd/journald.conf.d/acrofunjam.conf
systemctl restart systemd-journald

# Connexion SSH par clé seulement
printf "PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n" > /etc/ssh/sshd_config.d/10-acrofunjam.conf
systemctl reload ssh

# Docker
curl -fsSL https://get.docker.com | sh

# Utilisateur du déploiement, sans mot de passe, autorisé à piloter Docker
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -o deploy -g deploy /opt/acrofunjam
```

Docker publie ses ports sans passer par `ufw`. Ça ne pose pas de problème ici : seul Caddy publie des ports (80 et 443), PostgreSQL et l'API n'en publient aucun.

### Clé SSH du déploiement

Sur ton poste, crée une clé dédiée au déploiement, sans phrase de passe :

```powershell
ssh-keygen -t ed25519 -f acrofunjam-deploy -N '""' -C "github-actions"
```

Sur le serveur, autorise-la pour `deploy` : copie le contenu de `acrofunjam-deploy.pub` dans `/home/deploy/.ssh/authorized_keys`, avec les droits 600, dans un dossier `.ssh` avec les droits 700, appartenant à `deploy`.

Ensuite, sur ton poste, récupère l'empreinte du serveur, qui servira de secret `DEPLOY_KNOWN_HOSTS` :

```powershell
ssh-keyscan -t ed25519 <adresse du serveur>
```

### Le fichier `.env`

Copie `deploy/.env.example` vers `/opt/acrofunjam/.env`, remplis-le, puis protège-le :

```sh
chown deploy:deploy /opt/acrofunjam/.env && chmod 600 /opt/acrofunjam/.env
```

Pour générer le mot de passe de la base : `openssl rand -hex 32`. Évite la base64, dont les caractères `=`, `/` et `+` gênent dans une chaîne de connexion. Garde la ligne `IMAGE_TAG=`, vide : le déploiement la remplit.

Pour écrire les clés de R2 sans éditeur, depuis ton poste (chaque clé est demandée à tour de rôle ; la commande affiche `0` quand il ne reste plus de `A_REMPLIR`) :

```powershell
$names = 'PHOTO_STORAGE_ACCESS_KEY','PHOTO_STORAGE_SECRET_KEY','BACKUP_ACCESS_KEY','BACKUP_SECRET_KEY'
$lines = foreach ($n in $names) { "$n=" + (Read-Host $n).Trim() }
$lines | ssh root@<adresse> 'tr -d ''\r'' | while IFS== read -r k v; do sed -i s/^$k=.*/$k=$v/ /opt/acrofunjam/.env; done; grep -c A_REMPLIR /opt/acrofunjam/.env'
```

La même commande sert à remplacer les clés quand un jeton est recréé, suivie de `docker compose up -d` dans `/opt/acrofunjam`.

### Sauvegardes

`backup.sh` et `backup-files.sh` sont copiés dans `/opt/acrofunjam/` à chaque déploiement. Une fois le premier déploiement fait, ajoute les deux tâches avec `crontab -e`, en tant que `deploy` :

```
15 3 * * * /opt/acrofunjam/backup.sh >> /home/deploy/backup.log 2>&1
45 3 * * 0 /opt/acrofunjam/backup-files.sh >> /home/deploy/backup.log 2>&1
```

- `backup.sh`, chaque nuit : la base.
- `backup-files.sh`, le dimanche : les fichiers du bucket des photos (photos des poses, vidéos préparées et leurs affiches), sans les originaux en attente (`originals/`). Le script met à jour un miroir sur le serveur (`/var/tmp/acrofunjam-files`) avec la clé de l'API, puis envoie une archive `acrofunjam-files-<date>.tar` dans `acrofunjam-backups` avec la clé des sauvegardes. **Aucune clé de plus** : la clé des sauvegardes ne lit pas le bucket des photos, celle de l'API le lit déjà. Compte sur le disque la place du miroir, soit la taille du bucket (quelques Go).

Les deux copies sont gardées 30 jours par la règle de cycle de vie de `acrofunjam-backups`. Teste une restauration de temps en temps. Les commandes sont en tête des scripts. Une base restaurée sans ses fichiers laisse des vidéos « prêtes » sans fichier : elles répondent 404, sans rien casser.

## 5. GitHub

Dans le dépôt, va dans **Settings → Environments** et crée l'environnement `production`. Tu peux y exiger ton approbation avant chaque déploiement, si tu préfères valider à la main.

Dans cet environnement, ajoute ces secrets :

| Secret | Valeur |
|---|---|
| `DEPLOY_HOST` | adresse IP ou nom du serveur |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | contenu de `acrofunjam-deploy`, la clé privée |
| `DEPLOY_KNOWN_HOSTS` | la ligne donnée par `ssh-keyscan` |

Ajoute aussi la variable `DOMAIN`, par exemple `acrofunjam.fr`.

Avec la ligne de commande GitHub, depuis ton poste :

```powershell
gh api -X PUT repos/MarcUnterseh/AcroFunJam/environments/production
gh secret set DEPLOY_HOST --env production --body <adresse>
gh secret set DEPLOY_USER --env production --body deploy
ssh-keyscan -t ed25519 <adresse> | gh secret set DEPLOY_KNOWN_HOSTS --env production
Get-Content -Raw acrofunjam-deploy | gh secret set DEPLOY_SSH_KEY --env production
gh variable set DOMAIN --env production --body acrofunjam.fr
```

Les images sont publiées sur `ghcr.io/<propriétaire>/acrofunjam-*` : `acrofunjam-api`, `acrofunjam-worker`, `acrofunjam-migrations` et `acrofunjam-web`. Le déploiement s'y connecte avec le jeton éphémère du job : aucun autre secret n'est nécessaire.

**Les images restent privées.** Celles de l'API et du worker contiennent le ffmpeg de Debian, sous GPL : tant qu'elles sont privées, tirées par notre seul serveur, rien n'est distribué (ADR 0041). Sur GitHub, **ton profil → Packages → chaque paquet `acrofunjam-*` → Package settings → Danger Zone → Change visibility → Private**. Fais-le pour les paquets déjà publiés avant de pousser la première version avec ffmpeg. `acrofunjam-worker` n'existe qu'après sa première publication : vérifie aussitôt qu'il est privé (c'est le réglage par défaut d'un nouveau paquet). Dans **Manage Actions access** de chaque paquet, le dépôt doit garder le rôle **Read** (donné d'office au dépôt qui l'a publié), sinon le déploiement ne peut plus tirer l'image.

## 6. Premier déploiement

1. Pousse sur `main` ou, dans **Actions → Deploy**, lance le workflow à la main. Il construit les images, applique les migrations, démarre les services, puis vérifie `https://<domaine>/health`.
2. Ouvre le site et inscris-toi.
3. Pour devenir administrateur (ADR 0008) :
   - sur le serveur, renseigne `INITIAL_ADMINISTRATOR_EMAIL` dans `.env` ;
   - lance `cd /opt/acrofunjam && docker compose up -d` ;
   - vide ensuite la valeur, ce qui n'a aucun effet sur le rôle déjà donné.
4. Ajoute une photo à une pose pour vérifier l'accès à R2.
5. Ajoute une vidéo à une transition : elle passe « En préparation », puis s'affiche après quelques dizaines de secondes. C'est le signe que le worker tourne et que ffmpeg prépare les vidéos.

Si quelque chose échoue :
- **pas de certificat HTTPS** : vérifie que le DNS pointe sur le serveur et que les ports 80 et 443 sont ouverts, dans le pare-feu de l'hébergeur et dans `ufw`. Puis lis `docker compose logs web` ;
- **vidéo bloquée « En préparation »** : lis `docker compose logs worker`. Un travail en échec est repris une fois, puis la vidéo passe « Impossible à préparer » ;
- **envoi de photo refusé** : lis les erreurs de l'API avec `docker compose logs api --no-log-prefix | grep -A20 "^fail:"`. `AccessDenied` signale un jeton mal limité. `STREAMING-…-TRAILER not implemented` signale un envoi en flux que R2 refuse (voir `S3PhotoStorage`).

## Au quotidien

- **Déployer** : pousser sur `main`. Le déploiement part si la CI est verte.
- **Revenir à une version précédente** : dans **Actions → Deploy → Run workflow**, donne le SHA complet du commit voulu. Si la version suivante avait une migration, la base a déjà bougé : vérifie d'abord que l'ancienne API la supporte.
- **Journaux** : `docker compose logs -f api`, `docker compose logs -f worker` ou `docker compose logs -f web`, dans `/opt/acrofunjam`.
- **Arrêt du worker** (déploiement, `docker compose stop`) : la préparation en cours est annulée et la vidéo remise aussitôt dans la file, sans compter de tentative. Docker lui laisse 40 s (`stop_grace_period`) avant de le tuer ; tué, la vidéo serait reprise au bout de 15 minutes.
- **État** : `docker compose ps`.
- **Migrations** : elles doivent rester compatibles avec la version de l'API qui tourne encore pendant le déploiement. Pour supprimer une colonne ou une table, il faut deux livraisons.

## Demandes reçues à contact@acrofunjam.fr

La politique de confidentialité promet une réponse **sous un mois**. Les commandes se lancent sur le serveur, dans `/opt/acrofunjam`.

- **Retirer une photo** (une seule demande, de la base ou du flyer, suffit, sans compte) : retire-la depuis la page de la pose, en administrateur. Elle n'est plus accessible, même par son adresse.
- **Supprimer un compte** : la demande doit venir de l'adresse du compte ; sinon, écris à cette adresse pour la faire confirmer.
  1. Retrouve le compte :
     ```sh
     docker compose exec -T postgres psql -U acrofunjam -d acrofunjam -c "select \"Id\", role from identity.users where \"NormalizedEmail\" = upper('<adresse>')"
     ```
  2. Supprime-le :
     ```sh
     docker compose exec -T postgres psql -U acrofunjam -d acrofunjam -c "delete from identity.users where \"NormalizedEmail\" = upper('<adresse>')"
     ```
     Ses propositions et décisions restent, mais ne sont plus rattachées à aucune adresse ; une proposition en attente reste dans la file, un validateur la refuse (Q11).
  3. Réponds que c'est fait, en précisant que les sauvegardes en gardent trace 30 jours au plus.
- **Accéder à ses données** : envoie l'adresse, le rôle, la date d'inscription si elle existe, et la liste de ses propositions (« Mes propositions » sur le site, en se connectant, en donne l'essentiel).

## Grandir plus tard

1. Un serveur plus gros, chez le même hébergeur, en quelques clics.
2. Une base PostgreSQL gérée. Il suffit de changer la chaîne de connexion dans `compose.yml` et de faire une sauvegarde puis une restauration. Utilise une connexion directe ou un pool en mode « session », jamais en mode « transaction », à cause des verrous consultatifs.
3. Plusieurs instances de l'API derrière Caddy. C'est possible sans changer le code : les verrous passent par PostgreSQL, les photos par S3 et les clés de session par la base.
