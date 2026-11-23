# Mise en ligne d'AcroFunJam

Le site et l'API tournent sur un seul serveur, dans Docker. Caddy sert le site et transmet les appels à l'API, sur le même domaine. PostgreSQL tourne à côté, et les photos sont stockées sur Cloudflare R2. Chaque push sur `main` dont la CI réussit est déployé par `.github/workflows/deploy.yml`. Les choix sont justifiés dans l'[ADR 0040](adr/0040-hebergement-et-deploiement-continu.md).

```
Internet ──443──► Caddy (site + proxy) ──► API ──► PostgreSQL
                                            └────► Cloudflare R2 (photos)
```

Les comptes, l'achat du domaine et les secrets sont à faire par toi. Compte environ une heure la première fois.

## 1. Ce qu'il faut acheter ou ouvrir

| Quoi | Exemple | Coût indicatif |
|---|---|---|
| Un serveur x86 sous Ubuntu 24.04, 2 vCPU et 4 Go de mémoire | Hetzner CX22, Scaleway, OVH | ~5 €/mois |
| Un nom de domaine | n'importe quel registraire | ~10 €/an |
| Un compte Cloudflare avec R2 activé | | 0 € jusqu'à 10 Go |

Prends un serveur **x86** : les images sont construites pour `linux/amd64`. Un serveur ARM, moins cher chez certains hébergeurs, demanderait de changer la pipeline.

## 2. Le domaine

Chez le registraire, crée un enregistrement `A` qui pointe le domaine (par exemple `acrofunjam.fr`) vers l'adresse IPv4 du serveur. Si le serveur a une IPv6, crée aussi un enregistrement `AAAA`. Caddy obtient le certificat HTTPS tout seul au premier démarrage, une fois le domaine propagé.

## 3. Cloudflare R2

1. Crée deux buckets : `acrofunjam-photos` et `acrofunjam-backups`. Les deux restent privés : les photos passent par l'API.
2. Dans « Manage R2 API Tokens », crée deux jetons « Object Read & Write » :
   - un limité au bucket des photos ;
   - un limité au bucket des sauvegardes.
3. Note l'adresse du compte, `https://<account id>.r2.cloudflarestorage.com`, et les clés de chaque jeton.
4. Sur `acrofunjam-backups`, ajoute une règle de cycle de vie qui supprime les objets après 30 jours.

## 4. Le serveur

Connecte-toi en `root` une première fois, puis :

```sh
# Mises à jour automatiques de sécurité, pare-feu
apt update && apt upgrade -y
apt install -y unattended-upgrades ufw
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw enable

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

Pour générer le mot de passe de la base : `openssl rand -base64 32`. Laisse `IMAGE_TAG` vide : le déploiement le remplit.

### Sauvegardes de la base

`backup.sh` est copié dans `/opt/acrofunjam/` à chaque déploiement. Une fois le premier déploiement fait, ajoute la tâche de nuit avec `crontab -e`, en tant que `deploy` :

```
15 3 * * * /opt/acrofunjam/backup.sh >> /home/deploy/backup.log 2>&1
```

Teste une restauration de temps en temps. La commande est en tête de `backup.sh`.

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

Les images sont publiées sur `ghcr.io/<propriétaire>/acrofunjam-*`. Le déploiement s'y connecte avec le jeton éphémère du job : aucun autre secret n'est nécessaire.

## 6. Premier déploiement

1. Pousse sur `main` ou, dans **Actions → Deploy**, lance le workflow à la main. Il construit les images, applique les migrations, démarre les services, puis vérifie `https://<domaine>/health`.
2. Ouvre le site et inscris-toi.
3. Pour devenir administrateur (ADR 0008) :
   - sur le serveur, renseigne `INITIAL_ADMINISTRATOR_EMAIL` dans `.env` ;
   - lance `cd /opt/acrofunjam && docker compose up -d` ;
   - vide ensuite la valeur, ce qui n'a aucun effet sur le rôle déjà donné.
4. Ajoute une photo à une pose pour vérifier l'accès à R2.

Si l'envoi d'une photo échoue, regarde les journaux de l'API avec `docker compose logs api`. Une erreur `AccessDenied` signale un jeton mal limité. Une erreur de somme de contrôle (`checksum`) signale une incompatibilité entre le SDK S3 et R2, à corriger dans `S3PhotoStorage`.

## Au quotidien

- **Déployer** : pousser sur `main`. Le déploiement part si la CI est verte.
- **Revenir à une version précédente** : dans **Actions → Deploy → Run workflow**, donne le SHA complet du commit voulu. Si la version suivante avait une migration, la base a déjà bougé : vérifie d'abord que l'ancienne API la supporte.
- **Journaux** : `docker compose logs -f api` ou `docker compose logs -f web`, dans `/opt/acrofunjam`.
- **État** : `docker compose ps`.
- **Migrations** : elles doivent rester compatibles avec la version de l'API qui tourne encore pendant le déploiement. Pour supprimer une colonne ou une table, il faut deux livraisons.

## Grandir plus tard

1. Un serveur plus gros, chez le même hébergeur, en quelques clics.
2. Une base PostgreSQL gérée. Il suffit de changer la chaîne de connexion dans `compose.yml` et de faire une sauvegarde puis une restauration. Utilise une connexion directe ou un pool en mode « session », jamais en mode « transaction », à cause des verrous consultatifs.
3. Plusieurs instances de l'API derrière Caddy. C'est possible sans changer le code : les verrous passent par PostgreSQL, les photos par S3 et les clés de session par la base.
