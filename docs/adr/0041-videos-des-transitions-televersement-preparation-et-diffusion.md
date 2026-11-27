# 0041. Vidéos des transitions : téléversement, préparation et diffusion

- Statut : accepté (2026-11-26)
- Date : 2026-11-26
- Complète : [0039](0039-photos-des-poses-stockage-diffusion-et-traitement.md), [0040](0040-hebergement-et-deploiement-continu.md), [0006](0006-donnees-des-scenarios-d-acceptation.md), [0009](0009-specs-adossees-a-une-bibliotheque.md)

## Contexte
La story 12 « Vidéos des transitions » (decouverte.md, V1 à V23, validée le 2026-11-26) fait téléverser par un validateur ou un administrateur jusqu'à 3 vidéos par transition publiée :
- formats MP4, MOV ou WebM, reconnus au contenu ;
- 100 Mo au plus, de 2 s à moins de 31 s, au moins 480 px sur le plus petit côté ;
- son et métadonnées retirés, vidéo redressée, 720 px au plus sur le plus petit côté, affiche tirée de la première image ;
- préparation **en différé** : la vidéo est « en préparation », puis « prête » ou « impossible à préparer » ; le fichier d'origine n'est jamais gardé.

Les questions techniques Q290 et Q303 à Q312 de la carte sont tranchées ici.

Contraintes :
- le serveur de production est un VPS IONOS de 2 vCPU et 4 Go, partagé par Caddy, l'API et PostgreSQL (ADR 0040) ;
- les photos sont stockées sur Cloudflare R2 et servies par l'API, sous la même origine (ADR 0039) ;
- la politique de sécurité du contenu (`deploy/Caddyfile`) n'autorise aucune source `blob:` pour les médias.

Contrairement à une photo (1 à 2 s de Magick.NET), une vidéo demande des dizaines de secondes de processeur.

Le modèle du domaine (domain-expert, 2026-11-26) est dans la context map, section « Vidéos des transitions » :
- agrégat `TransitionVideos`, distinct de `Transition` ;
- ports `IVideoProcessor`, `IVideoStorage`, `IVideoAddresses`, `IVideoPreparationQueue` et `ITransitionVideosLock`.

## Options envisagées
1. **Outil de préparation** :
   - (a) ffmpeg et ffprobe en **processus externes** ;
   - (b) liaison en bibliothèque (FFmpeg.AutoGen, FFMpegCore en mode natif) ;
   - (c) service externe de transcodage (Cloudflare Stream, Mux).
2. **Où préparer** :
   - (a) `BackgroundService` dans le processus de l'API ;
   - (b) conteneur de préparation séparé (« worker »), avec ses propres limites de processeur et de mémoire.
3. **File de préparation** :
   - (a) table PostgreSQL, prise par bail (`FOR UPDATE SKIP LOCKED` pour revendiquer, puis transaction courte) ;
   - (b) l'état de la vidéo sert de file, verrouillé pendant toute la préparation ;
   - (c) courtier de messages (RabbitMQ, Redis).
4. **Téléversement** :
   - (a) `multipart/form-data` vers l'API, en flux vers un fichier temporaire ;
   - (b) adresse pré-signée vers R2, puis confirmation à l'API.
5. **Diffusion** :
   - (a) par l'API, avec les requêtes partielles (`Range`) ;
   - (b) adresses pré-signées de R2 ou CDN.
6. **Contrôles dès le choix d'une vidéo HEVC illisible par le navigateur (UX-55)** :
   - (a) le site lit l'en-tête MP4/MOV ;
   - (b) contrôles après l'envoi seulement.

## Décision
**1(a), 2(b), 3(a), 4(a), 5(a), 6(a) pour MP4 et MOV, 6(b) pour WebM.**

### Outil : ffmpeg et ffprobe en processus externes (Q303)
- Paquet `ffmpeg` de Debian dans l'image (`apt-get install --no-install-recommends ffmpeg`), à la version de la distribution de l'image `aspnet:10.0`. Il apporte `ffprobe`, `libx264`, les décodeurs HEVC, VP9 et AV1, `libwebp` et `zimg`.
- Le binaire n'est **jamais lié** à notre code. Les adaptateurs `FfprobeVideoProbe` et `FfmpegVideoPreparer` (derrière `IVideoProcessor.Probe` / `Prepare`) lancent un processus :
  - avec des arguments passés un à un (`ProcessStartInfo.ArgumentList`, jamais une ligne de commande composée) ;
  - avec un **environnement vidé** (aucun secret transmis) ;
  - sous un délai maximal, et tué avec ses processus enfants au délai comme à l'annulation ;
  - sans jamais garder sa sortie entière en mémoire : elle est lue ligne à ligne, une ligne de plus de 4096 caractères arrête le processus, et la sortie d'erreur est lue puis jetée.
- **Licences** :
  - le ffmpeg de Debian est compilé `--enable-gpl` (x264, x265). Notre code n'est pas une œuvre dérivée, car il appelle un exécutable sans s'y lier : la GPL ne s'étend pas à AcroFunJam ;
  - la seule obligation porte sur la **distribution** de l'image. Si les images GHCR restent **privées** (tirées par notre seul serveur), il n'y a pas de distribution. Si elles deviennent publiques, il faut offrir les sources des paquets GPL (sources Debian correspondantes) : une mention dans le dépôt suffit ;
  - **à confirmer par le porteur** : visibilité des images.
- **Brevets** :
  - le décodage HEVC (entrée seulement) et le codage H.264 (sortie) sont couverts par des brevets ;
  - risque jugé faible pour un site gratuit et non commercial dans l'Union européenne. La diffusion gratuite de vidéos H.264 aux utilisateurs finaux est exemptée de redevance par MPEG LA ;
  - aucun codage HEVC n'est fait ;
  - à revoir si AcroFunJam devient commercial.
- Écarté : (b) expose la mémoire du processus .NET aux défauts d'un décodeur C. (c) est payant, ajoute un sous-traitant de plus et fait sortir les vidéos de l'Union européenne.

### Profil de sortie (Q304)
- **Vidéo** : MP4 H.264, `libx264`, réglages suivants :
  - `-preset veryfast -crf 23 -maxrate 2M -bufsize 4M` ;
  - `-profile:v high -pix_fmt yuv420p` ;
  - `-fpsmax 30` ;
  - `-movflags +faststart` (index en tête, lecture avant la fin du téléchargement).
- **Son, métadonnées et rotation** :
  - `-an -sn -dn` (ni son, ni sous-titres, ni données) ;
  - `-map 0:v:0` (une seule piste vidéo, la première) ;
  - `-map_metadata -1 -map_chapters -1 -fflags +bitexact -flags:v +bitexact` ;
  - redressement par l'auto-rotation de ffmpeg (matrice d'affichage appliquée, puis absente de la sortie).
- **Dimensions** : décidées par le **domaine**. `VideoDimensions.Presented()` donne 720 px au plus sur le plus petit côté, sans jamais agrandir et en gardant le ratio. L'adaptateur les arrondit au pair inférieur, une contrainte technique du 4:2:0.
- **HDR** : les iPhone filment en HDR (HLG / Dolby Vision, 10 bits, BT.2020). Une vidéo HDR est convertie en SDR BT.709 par `zscale` et `tonemap` (filtre `hable`), sinon ses couleurs seraient délavées. **À vérifier sur une vraie vidéo d'iPhone** : si le `zimg` du paquet Debian manque, on passera à une version statique de ffmpeg (même licence).
- **Affiche** : la première image de la vidéo **préparée** (donc redressée et convertie), en WebP qualité 80, même taille (`-frames:v 1 -c:v libwebp`).
- Une seule qualité : ni HLS ni qualité adaptative. Environ 4 à 7 Mo pour 30 s.

### Où préparer : un conteneur « worker » séparé (Q305)
- **Projet** :
  - nouveau projet hôte `AcroFunJam.Worker` (SDK Worker) : *composition root* comme l'Api, qui ne référence qu'Application et Infrastructure ;
  - un `BackgroundService` y appelle en boucle le cas d'usage `PrepareNextVideo` (Application) ;
  - attente de 5 s quand la file est vide (pas de `LISTEN/NOTIFY` au départ).
- **Image** : cible `worker` de `deploy/api.Dockerfile`, sur une étape commune `media` (`aspnet:10.0` + `ffmpeg`), que l'image de l'API utilise aussi pour `ffprobe`.
- **Service `worker` dans `deploy/compose.yml`** :
  - `cpus: "1.0"`, `mem_limit: 1g`, `pids_limit: 64`, `restart: unless-stopped` ;
  - un volume dédié pour les fichiers temporaires ;
  - mêmes variables de base et de stockage que l'API, sans port publié ;
  - ffmpeg y tourne avec `nice -n 10` et `-threads 2`.
- **Pourquoi pas (a)** :
  - sur 2 vCPU, une préparation sans quota de processeur ralentit toutes les requêtes de l'API pendant une minute ;
  - un décodeur qui s'emballe (mémoire) emporterait l'API ;
  - le quota du conteneur rend la charge prévisible : un cœur au plus pour les vidéos, un pour l'API et PostgreSQL.
- **Limite assumée** : le worker garde l'accès à la base et au stockage. Il ne limite donc pas ce qu'un ffmpeg compromis pourrait atteindre, seulement ce qu'il consomme. ffmpeg lui-même ne reçoit aucun secret (environnement vidé) et ne lit que des fichiers locaux (`-protocol_whitelist file`).
- **Une préparation à la fois.** Durées estimées sur un cœur :
  - 30 s en 1080p HEVC : de 20 à 40 s ;
  - 30 s en 4K à 60 images/s : de 1 à 2 min.
- **À mesurer** sur le serveur, avant l'ouverture, avec la mémoire réelle de PostgreSQL et de l'API.

### File de préparation : table PostgreSQL et bail (Q305, Q309)
- **Table `catalog.video_preparation_jobs`** : `video_id` (PK, FK vers `catalog.videos`, `ON DELETE CASCADE`), `transition_id`, `enqueued_at`, `attempts`, `lease_until`.
- **Ajout du travail** : par `IVideoPreparationQueue.Enqueue`, dans la **même transaction** que l'ajout de la vidéo. Il n'y a donc pas de vidéo en préparation sans travail, ni l'inverse.
- **Revendication** : une transaction courte qui donne un bail de 15 min et compte une tentative :

  ```sql
  UPDATE … SET lease_until = now() + interval '15 minutes', attempts = attempts + 1
  WHERE video_id = (SELECT video_id … WHERE lease_until IS NULL OR lease_until < now()
                    ORDER BY enqueued_at FOR UPDATE SKIP LOCKED LIMIT 1)
  RETURNING …
  ```

  Aucun verrou n'est gardé pendant ffmpeg : un retrait ou une correction ne sont jamais bloqués par une préparation (pourquoi pas 3(b)).
- **Fin** :
  - succès ou fichier impossible à préparer : le travail est supprimé dans la transaction qui enregistre l'état de la vidéo ;
  - panne (exception, conteneur tué, redémarrage brutal) : le bail expire et le travail est repris ;
  - arrêt demandé du worker (un déploiement) : la préparation en cours est annulée (ffmpeg tué) et le travail **rendu** aussitôt (`IVideoPreparationQueue.Release` : `lease_until = NULL`, `attempts - 1`), sans attendre le bail ni compter la tentative. `stop_grace_period: 40s` dans `deploy/compose.yml` laisse le temps de le faire.
- **Tentatives** : 2 au plus (« une seule nouvelle tentative »). À la troisième revendication, `PrepareNextVideo` déclare la vidéo impossible à préparer sans relancer ffmpeg.
- Pourquoi pas 3(c) : un service de plus sur 4 Go, pour quelques vidéos par semaine.

### Téléversement en flux (Q306)
- **Point d'entrée** : `POST /catalog/transitions/{transitionId}/videos`, `multipart/form-data`, parties `caption`, `credit`, `description`, `rightsConfirmed`, puis `file`. Policy `CanManageVideos`.
- **Lecture du corps** :
  - par `MultipartReader`, sans `ReadFormAsync` ni `IFormFile` ;
  - la partie `file` est copiée **en flux** vers un fichier temporaire (`/tmp/acrofunjam-uploads/<guid>`, jamais en mémoire), arrêtée au-delà de 100 Mio : `video.too-large` (413) ;
  - le fichier temporaire est supprimé dans un `finally` de l'Api ;
  - au démarrage, l'Api et le worker vident leur répertoire temporaire.
- **Limites** :
  - Kestrel : `RequestSizeLimit` de 101 Mio sur ce seul point d'entrée. Le reste de l'API garde la limite par défaut ;
  - Caddy : `request_body` avec `max_size 102MiB` (un Mio au-dessus de Kestrel, pour que l'API réponde elle-même `video.too-large`) sur la seule route d'ajout (`path_regexp ^/catalog/transitions/[^/]+/videos$`, méthode POST) ;
  - délais : ni Caddy ni Kestrel n'imposent de délai total par défaut (100 Mo en 4G : plus d'une minute). On garde le débit minimal de Kestrel (`MinRequestBodyDataRate`, 240 o/s), qui coupe un envoi abandonné.
- **Envois simultanés** : 2 au plus (limiteur de concurrence ASP.NET sur ce point d'entrée, 503 au-delà, très rare : quelques gestionnaires). C'est ce qui borne le disque temporaire et les `ffprobe` parallèles.
- **Contrôles dans la requête, avant toute écriture** :
  1. légende, crédit, description, confirmation (domaine) ;
  2. poids ;
  3. transition publiée ;
  4. maximum (échec rapide, sans verrou) ;
  5. `IVideoProcessor.Probe`, puis `VideoFile.Accept` (le domaine décide : V4 à V7).
- **Puis** :
  - le fichier d'origine est déposé dans le stockage (`originals/{videoId}`, préfixe privé) **hors verrou** ;
  - sous le verrou `transition-videos:<id>` : relire l'agrégat, `Add` (maximum qui fait foi), enregistrer avec le travail de préparation ;
  - si l'ajout échoue, l'original est supprimé (compensation, comme ADR 0039).
- **Réponse** : `202 Accepted`, avec la vidéo telle que présentée au gestionnaire (`preparation: "in-preparation"`, `sources: null`) et `Location` vers `GET /catalog/transitions/{id}/videos`.
- **Site** : même transport XHR que les photos (progression, « Annuler l'envoi »). « Vérification de la vidéo… » s'affiche entre la fin de l'envoi (100 %) et la réponse.

### Garde-fous contre les fichiers hostiles (Q308)
- **Format reconnu en C# par les premiers octets**, avant tout appel à ffprobe :
  - boîte `ftyp` et marque MP4 (`isom`, `iso2`, `mp41`, `mp42`, `avc1`, `M4V `…) ou QuickTime (`qt  `) ;
  - en-tête EBML `1A 45 DF A3` avec `DocType` `webm`. Un Matroska (`matroska`) n'est pas accepté ;
  - les marques HEIF des photos (`heic`, `mif1`…) ne sont pas des vidéos.
- **ffprobe ne reçoit que ce format**, et ses autres demultiplexeurs (HLS, concat, image2…) ne sont jamais essayés :
  - format explicite (`-f mov` ou `-f matroska`) ;
  - `-protocol_whitelist file` : une liste de lecture piégée ne fait lire ni fichier local ni adresse réseau ;
  - `-probesize 50M -analyzeduration 60M` ;
  - délai de 20 s.
- **Mesure** :
  - **durée constatée au démultiplexage** : horodatage du premier et du dernier paquet de la piste vidéo, et non la durée déclarée dans l'en-tête. Rapide (pas de décodage), elle ne fait pas confiance au champ `duration`. La sortie de ffprobe (format `compact`, une ligne par paquet) est lue en flux : seuls les temps extrêmes et le nombre de paquets sont gardés ;
  - dimensions et matrice de rotation de la piste vidéo.
- **Refusées comme illisibles** (`video.unreadable`) :
  - aucune piste vidéo ;
  - plus de 8 pistes ;
  - un codec hors liste (H.264, HEVC, VP8, VP9, AV1) ;
  - plus de 8192 px de côté ;
  - plus de 120 images/s ;
  - plus de paquets que 120 images/s pendant 31 s (3720) : ffprobe est arrêté dès ce nombre dépassé ;
  - une durée incalculable.
- **À la préparation** :
  - ffmpeg décode réellement, avec `-protocol_whitelist file`, les décodeurs limités à la liste ci-dessus, `-t 32` (borne de calcul) et un délai de 5 min ;
  - la **durée décodée** est remontée au domaine : `MarkPrepared` déclare la vidéo impossible à préparer si elle dépasse la limite de plus de 0,5 s. Un fichier qui mentait au démultiplexage n'est jamais présenté ; il est signalé au gestionnaire, qui le retire.
- **Exploitation** : utilisateur non root dans les conteneurs ; mises à jour de sécurité de ffmpeg par la reconstruction régulière des images. Aujourd'hui, une image n'est reconstruite qu'à un déploiement : prévoir une reconstruction hebdomadaire, **à décider**.

### Diffusion avec requêtes partielles (Q307)
- **Adresses publiques** : `GET /catalog/videos/{videoId}/video` (`video/mp4`) et `GET /catalog/videos/{videoId}/poster` (`image/webp`).
- **Vérification de la base à chaque lecture** : une vidéo absente ou pas prête donne 404, si bien qu'un retrait est immédiat (V16).
- **Requêtes partielles** :
  - un seul intervalle `Range: bytes=a-b`, `a-` ou `-n` → `206 Partial Content`, `Content-Range`, `Accept-Ranges: bytes` ;
  - plusieurs intervalles → `200` avec le fichier entier ;
  - intervalle hors du fichier → `416` ;
  - `If-Range` sur l'`ETag` (identifiant de la vidéo, contenu immuable).
- **Lecture dans le stockage** : `IVideoStorage.Open(videoId, rendition, ByteRange?)` fait une lecture partielle dans R2 (`GetObject` avec `ByteRange`) et renvoie la longueur totale. ASP.NET ne sait pas découper un flux S3 non navigable : l'Api traduit elle-même l'en-tête.
- Safari sur iPhone exige ces réponses (requête `bytes=0-1` d'abord). L'avance dans la vidéo s'en sert partout.
- **En-têtes** : ceux des photos (`Cache-Control: private, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`).
- **Caddy** :
  - les réponses `206` passent telles quelles (`reverse_proxy` ne tamponne pas) ;
  - `encode` ne compresse pas `video/mp4` ni `image/webp`, qui ne sont pas dans sa liste par défaut. **À vérifier par un test** : une réponse partielle compressée casserait la lecture.
- **Bande passante** : environ 6 Mo par lecture, servis par le VPS (trafic IONOS sans facturation au volume ; débit partagé avec le site).
- Option gardée pour plus tard : adresses pré-signées de R2 ou CDN, avec purge au retrait et `media-src` élargi. Elle fera l'objet de sa propre décision.

### Politique de sécurité du contenu
- `media-src 'self' blob:` ajouté à la CSP de `deploy/Caddyfile`, pour l'aperçu local d'une vidéo choisie (`URL.createObjectURL`).
- Les vidéos et les affiches servies par l'API sont déjà couvertes par `'self'`.
- Le serveur de développement Vite et le simulateur d'API des tests ne posent pas de CSP. Un test de l'image `web` (ou une revue) vérifie la directive.

### En-tête MP4/MOV lu par le site (UX-55)
- **Jugé fiable pour MP4 et MOV**, comme pré-contrôle (l'API refait les contrôles) :
  - le format ISO BMFF se parcourt par boîtes. Le site lit des tranches du fichier choisi (`Blob.slice`, rien n'est envoyé), trouve `moov` où qu'il soit (en tête ou en fin de fichier), puis lit `mvhd` (durée et échelle de temps), et, pour la piste vidéo, `tkhd` (dimensions en 16.16 et matrice de rotation : 90° et 270° échangent largeur et hauteur), `mdhd` et `elst` (liste d'édition, qui peut raccourcir la durée présentée) ;
  - il gère les tailles de boîte 64 bits ;
  - un MP4 fragmenté (`mvex`/`mehd`) ou toute boîte incohérente rend « inconnu ». Le site envoie alors sans contrôle, et l'API décide.
- **Pas de lecture d'en-tête pour WebM** : contrôles après l'envoi quand le navigateur ne sait pas le lire, ce qui est rare.
- Petit lecteur maison dans le site (`apps/web`, adaptateur `browserVideoInspector`), sans bibliothèque (mp4box.js pèse plus de 100 Ko). Les tests portent sur des fichiers générés par ffmpeg (iPhone en portrait, `moov` en fin, liste d'édition).
- **Écart possible** entre la durée de l'en-tête (site) et celle du démultiplexage (API) : quelques centièmes de seconde, sans effet pratique. Le site tronque à la seconde pour le message (UX-48) ; seul l'avis de l'API fait foi.

### Nettoyage et cohérence (Q309)
- **Fichier d'origine** :
  - supprimé par le worker dès la préparation finie ou impossible ;
  - filet de sécurité : règle de cycle de vie R2 sur le préfixe `originals/` (suppression après 2 jours). Aucun original ne survit à une panne.
- **Retrait d'une vidéo** (quel que soit son état) :
  - enregistré d'abord : le travail disparaît par la cascade, et la vidéo devient introuvable ;
  - puis suppression, au mieux, des fichiers préparés et de l'original.
- **Retrait pendant une préparation** : le worker finit, puis `MarkPrepared` répond `catalog.video-not-found`. Il supprime alors ce qu'il vient de produire et l'original.
- **Interruption en cours de route** : arrêter ffmpeg dès le retrait (vérification toutes les 10 s) est une optimisation **reportée**.
- **Fichiers temporaires** : supprimés dans un `finally`, plus une purge du répertoire au démarrage de l'Api et du worker.
- **Fichiers préparés orphelins** (compensation échouée) : balayage reporté, comme pour les photos.
- **Concurrence** :
  - verrou consultatif `transition-videos:<id>` (port `ITransitionVideosLock`) autour de « relire, décider, enregistrer » pour l'ajout, le retrait, la correction et l'enregistrement d'une préparation ;
  - jamais pris avec un autre verrou, donc aucun cycle ;
  - deux ajouts simultanés à une transition qui a 2 vidéos donnent une vidéo de plus et un refus `catalog.video-limit-reached`.
- Ajouter une vidéo ne touche ni `catalog.transitions` ni la réservation `transition-poses:<départ>:<arrivée>` (ADR 0029).

### Contrat HTTP (Q310)
- **`GET /catalog/poses/{id}`** : chaque transition de `transitionsFrom` / `transitionsTo` gagne une liste `videos`, dans l'ordre d'ajout, avec pour chaque vidéo :

  ```json
  { "id", "caption", "credit", "description": string | null, "width", "height", "durationMs",
    "preparation": "ready" | "in-preparation" | "failed",
    "sources": { "video", "poster" } | null }
  ```

  - `sources` est nul tant que la vidéo n'est pas prête ;
  - `width` et `height` sont les dimensions présentées (prévues, tant que la vidéo est en préparation) ;
  - un **visiteur** ne reçoit que les vidéos `ready`. Un appelant qui a la capacité « gérer les vidéos » (évaluée par l'Api, comme les policies) les reçoit toutes ;
  - la réponse dépend donc de l'appelant : `Cache-Control: private, no-cache` ;
  - un client doit tolérer un état inconnu.
- **`GET /catalog/transitions/{transitionId}/videos`** (`CanManageVideos`) : les vidéos de la transition, tous états. Le site l'interroge pour mettre à jour « En préparation » sans recharger la page (UX-52).
- **Ajout** : `POST /catalog/transitions/{transitionId}/videos` → 202 (ci-dessus).
- **Correction** : `PUT /catalog/transitions/{transitionId}/videos/{videoId}` (`{ caption, credit, description }`) → 200.
- **Retrait** : `DELETE /catalog/transitions/{transitionId}/videos/{videoId}` → 204.
- La confirmation des droits n'est jamais renvoyée.
- **Erreurs** :
  - 400 `video.file-required`, `video.format-not-accepted`, `video.too-long` (extension `durationSeconds`, tronquée), `video.too-short`, `video.too-small`, `video.unreadable`, `video.caption-required`, `video.caption-too-long`, `video.credit-required`, `video.credit-too-long`, `video.credit-not-an-author`, `video.description-too-long`, `video.rights-confirmation-required` ;
  - 413 `video.too-large` ;
  - 404 `catalog.transition-not-found`, `catalog.video-not-found` ;
  - 409 `catalog.video-limit-reached` ;
  - 403 `identity.capability-required` (« Seul un validateur ou un administrateur gère les vidéos. ») ;
  - 401.
- **`GET /me`** gagne `manage-videos`, entre `manage-photos` et `manage-roles`.
- **Mise à jour sans recharger** : le site interroge les vidéos de la transition :
  - toutes les 5 s tant que l'une d'elles est en préparation ;
  - pause quand l'onglet est caché ;
  - abandon au bout de 15 min.
  
  Pas de SSE ni de WebSocket : plus d'infrastructure (Caddy, connexions longues) pour un repère vu par quelques gestionnaires.

### Coûts et sauvegardes (Q312)
- **Stockage** : R2, même seau que les photos (`acrofunjam-photos`, clés `transitions/{videoId}/video.mp4`, `transitions/{videoId}/poster.webp`, `originals/{videoId}`). Pas de second seau, ni de seconde clé d'accès.
- **Volume** : environ 6 Mo par vidéo. 3 vidéos pour 300 transitions font environ 5,4 Go ; avec les photos, l'offre gratuite de R2 (10 Go) tiendra quelques centaines de transitions et de poses. Au-delà : 0,015 $ par Go et par mois.
- **Opérations** :
  - une lecture partielle est une opération de classe B (10 millions gratuites par mois) ;
  - un envoi, 3 opérations de classe A. Négligeable ;
  - sortie de R2 gratuite.
- **Disque du VPS** : au plus 2 envois de 100 Mo plus une préparation, soit environ 400 Mo de fichiers temporaires.
- **Sauvegardes** :
  - la base (métadonnées des vidéos, confirmations des droits) est sauvegardée chaque nuit (ADR 0040) ;
  - **les fichiers des photos et des vidéos n'ont aujourd'hui aucune copie** hors du seau R2 : durable, mais exposé à une suppression par erreur ou à une clé compromise.
  
  Tranché par le porteur (voir plus bas) : copie hebdomadaire, `deploy/backup-files.sh`. Une restauration de la base sans les fichiers laisserait des vidéos « prêtes » sans fichier : la diffusion répond alors 404, sans rien casser.

### Tests (Q311)
- **Specs `@api`** :
  - faux `IVideoProcessor`, qui traduit les fixtures nommées (« une vidéo MOV HEVC de 12 s filmée par un iPhone ») en `VideoProbe` et en `PreparedVideo`. Aucun fichier binaire n'est versionné ;
  - stockage en mémoire ;
  - le worker n'est **pas** démarré : les pas « AcroFunJam a fini de préparer la vidéo … » et « n'a pas pu préparer » appellent le cas d'usage `PrepareNextVideo` avec un faux qui réussit ou échoue. Un « Soit … une vidéo ajoutée » la prépare aussitôt, sauf mention « encore en préparation ».
- **Intégration** (`Category=Integration`) :
  - `FfprobeVideoProbe` et `FfmpegVideoPreparer` sur des fichiers **générés par ffmpeg pendant le test**, dans un cache du répertoire temporaire. Durées 1, 2, 30, 30,9 et 31 s ; mire `testsrc2` avec son `sine` ; HEVC (`libx265`) avec position GPS et modèle de l'appareil (`-metadata`) et marque de rotation de 90° (`-display_rotation`) ; WebM VP9 ; 640×360, 854×480, 3840×2160 courte ; GIF et JPEG ; un faux MP4 dont l'en-tête annonce 10 s pour 40 s d'images ; un fichier tronqué ;
  - les vérifications relisent la sortie avec ffprobe : pas de piste audio, aucune étiquette de métadonnées (lieu, modèle, date), portrait, dimensions, première image de l'affiche ;
  - `S3VideoStorage`, dont les lectures partielles, sur RustFS (Testcontainers) ;
  - la file (revendication concurrente : deux revendications simultanées ne prennent jamais le même travail ; bail expiré repris ; travail rendu à l'arrêt) et le verrou sur PostgreSQL ;
  - les garde-fous des processus externes avec le shell du système (environnement vidé, processus et enfants tués au délai et à l'annulation, sortie trop longue) ;
  - la boucle du worker (attente quand la file est vide, survie à une préparation en échec, arrêt) et sa composition (`AcroFunJam.Worker.Tests`).
- **CI** : `ffmpeg` installé par `apt-get` dans le job `api` (les tests d'intégration le demandent) ; sans ffmpeg, ces tests sont ignorés en local avec un message explicite, mais échouent quand `CI=true`.
- **Web** :
  - API simulée (ADR 0009) qui sert une petite vidéo et une affiche générées une fois et versionnées dans les fixtures du web (quelques Ko). Exception assumée à « aucun binaire » : Playwright doit lire une vraie vidéo ;
  - le lecteur d'en-tête MP4/MOV est testé sur des fichiers générés ;
  - le repère « En préparation » est mis à jour par le simulateur, qui change l'état.
- **Mesure manuelle avant l'ouverture** : une vraie vidéo HDR d'iPhone en portrait et une vidéo Android, préparées sur le serveur de production (durée, couleurs, mémoire).

## Conséquences
- Positif :
  - l'API reste réactive pendant une préparation (un cœur réservé), et un décodeur qui s'emballe ne l'emporte pas ;
  - aucun nouveau fournisseur : R2 et PostgreSQL suffisent, et la file survit aux redémarrages ;
  - retrait immédiat, vérifié par l'API, y compris pendant la préparation ;
  - le domaine décide de tout ce qui est visible (formats, durée, dimensions présentées, états, visibilité), et ffmpeg ne fait que constater et exécuter ;
  - lecture sur iPhone (H.264, requêtes partielles, `faststart`).
- Négatif :
  - un projet hôte, une image et un conteneur de plus ;
  - environ 300 Mo de paquets ffmpeg dans les images ;
  - un lecteur d'en-tête MP4/MOV à maintenir dans le site ;
  - une logique de `Range` écrite à la main dans l'Api ;
  - le site interroge l'API pendant une préparation ;
  - le VPS sert chaque octet des vidéos ;
  - un miroir des fichiers sur le disque du serveur, pour la copie hebdomadaire.
- À surveiller :
  - durée et mémoire des préparations sur le serveur (4 Go partagés) ;
  - conversion HDR des vidéos d'iPhone ;
  - mises à jour de sécurité de ffmpeg ;
  - taille du seau (offre gratuite de 10 Go partagée avec les photos) ;
  - débit sortant du VPS ;
  - visibilité des images GHCR (GPL).
- Suites :
  - story 12b (une vidéo proposée réutilisera le même worker, avec un original gardé jusqu'à la décision) ;
  - 12c (vidéos des poses : même agrégat sur le modèle de `PosePhotos`, ou généralisation à décider alors) ;
  - 12d (application mobile : `expo-video`, mêmes adresses, `Range` déjà en place).

## Décisions du porteur du produit (2026-11-26)
- La maquette `docs/design/maquettes/12-videos-des-transitions.html` et ce document sont acceptés.
- **Images privées** : les images publiées sur GHCR (`acrofunjam-api`, `acrofunjam-web`, `acrofunjam-migrations`, et la future image du worker) sont passées en privé avant la publication de la première image contenant ffmpeg. Le déploiement s'y connecte déjà avec le jeton éphémère du job.
- **Sauvegarde des fichiers** : une copie hebdomadaire des photos et des vidéos préparées va dans le seau des sauvegardes (`rclone`, ou `aws s3 sync` du conteneur déjà utilisé par `backup.sh`), gardée 30 jours comme les sauvegardes de la base.
  - Mise en œuvre : `deploy/backup-files.sh`, lancé le dimanche par cron (`docs/deploiement.md`). `aws s3 sync` met à jour un miroir sur le serveur (hors `originals/`), lu avec la clé de l'API ; une archive `tar` de ce miroir est envoyée en flux dans le seau des sauvegardes avec la clé des sauvegardes. Aucune nouvelle clé : celle des sauvegardes ne lit pas le seau des photos, celle de l'API le lit déjà.
