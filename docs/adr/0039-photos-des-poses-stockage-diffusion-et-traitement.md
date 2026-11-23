# 0039. Photos des poses : stockage objet S3, diffusion par l'API, téléversement multipart, traitement Magick.NET

- Statut : accepté
- Date : 2026-11-20
- Complète : [0002](0002-clean-architecture-et-ddd.md), [0004](0004-strategie-de-tests.md), [0007](0007-contrat-http-et-persistance-modulaire.md), [0011](0011-session-web-et-mots-de-passe.md), [0036](0036-etiquettes-d-une-pose-et-contrat-http.md)

## Contexte
La story 10 « Photos des poses » (decouverte.md, R1 à R19, validée le 2026-11-20) est la première à stocker des fichiers. Un validateur ou un administrateur ajoute jusqu'à 5 photos à une pose publiée (JPEG, PNG, WebP ou HEIC, 10 Mio au plus, au moins 800 px sur le plus petit côté). Les métadonnées sont retirées et la photo est redressée. La photo principale sert de vignette au catalogue. Une photo retirée doit être inaccessible tout de suite, même par son adresse (R13). Le site réduit avant l'envoi une photo trop lourde qu'il sait lire, et montre la progression de l'envoi avec « Annuler l'envoi ».

Le modèle du domain-expert (agrégat `PosePhotos` distinct de `Pose`, ports `IPhotoProcessor`, `IPhotoStorage`, `IPhotoAddresses`, `IPosePhotosLock`) est dans la context map. L'hébergement de production n'est fixé par aucun ADR : ce choix ne doit pas en dépendre. Le site et l'API partagent la même origine (ADR 0011).

## Options envisagées
1. **Stockage** : (a) stockage objet compatible S3 ; (b) Azure Blob Storage ; (c) PostgreSQL (`bytea`) ; (d) disque du serveur.
2. **Diffusion** : (a) par l'API sous la même origine, qui vérifie la base à chaque lecture ; (b) adresses publiques du stockage ou d'un CDN.
3. **Traitement** : (a) Magick.NET (ImageMagick, Apache 2.0, HEIC par libheif) ; (b) ImageSharp (pas de HEIC, licence Six Labors) ; (c) SkiaSharp (HEIC selon la plateforme).
4. **Téléversement** : (a) `multipart/form-data` vers l'API ; (b) adresse pré-signée vers le stockage, puis confirmation à l'API.
5. **Moment du traitement** : (a) synchrone, dans la requête d'ajout ; (b) en tâche de fond, avec un état « en préparation ».

## Décision
**1(a), 2(a), 3(a)** (choisis par le porteur du produit le 2026-11-20), **4(a), 5(a).**

### Stockage
- Adaptateur `S3PhotoStorage` (AWSSDK.S3, `ForcePathStyle`), derrière `IPhotoStorage` (`Store`, `Open`, `Delete`). Un seau `acrofunjam-photos`, privé. Clés `poses/{photoId}/{taille}.{ext}`, aucune donnée personnelle dans la clé.
- Local : service `rustfs` (image `rustfs/rustfs:1.0.4`, port 9000) ajouté au `docker-compose.yml`, seau créé au premier envoi. Configuration `PhotoStorage:ServiceUrl`, `Bucket`, `AccessKey`, `SecretKey` (secrets utilisateur hors Development).
- Le fichier d'origine n'est jamais gardé : seules les tailles générées sont stockées (Q258).

### Diffusion
- `GET /catalog/photos/{photoId}/{taille}` (`thumbnail`, `page`, `enlarged`), public. L'API vérifie que la photo existe dans `catalog.photos` (sinon 404, R13), puis renvoie le flux du stockage.
- En-têtes : `Cache-Control: private, max-age=31536000, immutable` (le contenu d'un `PhotoId` ne change jamais), `Content-Type` exact, `X-Content-Type-Options: nosniff`. Un retrait rend la photo introuvable par l'API tout de suite. Un navigateur qui l'avait déjà en cache peut encore la montrer : c'est accepté.
- `IPhotoAddresses.Of(PhotoId)` renvoie ces chemins relatifs. Le contrat de `GET /catalog/poses/{id}` donne, pour chaque photo, `id`, `altText`, `credit`, `width`, `height` (taille `page`) et `sources` (`thumbnail`, `page`, `enlarged`). La liste du catalogue donne `thumbnail` (adresse ou `null`). La confirmation des droits n'est jamais renvoyée.
- Un CDN pourra être ajouté devant l'API sans changer le contrat. La purge au retrait sera alors à prévoir.

### Traitement (Magick.NET, synchrone)
- Adaptateur `MagickPhotoProcessor` (`Magick.NET-Q8-AnyCPU`, binaires natifs Linux et Windows inclus).
  - `Probe` constate le format au contenu (en-tête `ping`, sans décoder les pixels), puis les dimensions une fois redressées. Le domaine décide (`PhotoFile.Accept`).
  - `Render` décode, applique l'orientation EXIF (`AutoOrient`), convertit en sRGB, retire toutes les métadonnées (`Strip`), puis génère les trois tailles.
- Garde-fous, réglés au démarrage :
  - `ResourceLimits` : mémoire, largeur et hauteur maximales (16 000 px), aire maximale (environ 100 Mpx) ;
  - les codeurs sont limités à JPEG, PNG, WebP et HEIC par `MagickReadSettings.Format` explicite après `Probe` (aucun codeur « délégué » : pas de SVG, PDF ni MSL) ;
  - une politique ImageMagick restrictive (`policy.xml`) désactive les autres codeurs.
- Tailles générées (WebP, qualité 80 ; une seule sortie, car tous les navigateurs ciblés lisent WebP) :
  - `thumbnail` : carré de 192 px (vignette jusqu'à 96 px en 2×). La photo est **contenue, jamais recadrée**, pour ne couper ni la tête ni les pieds d'une pose verticale. Les marges sont **transparentes** (canal alpha du WebP) : le site peint le passe-partout `photoMat` derrière, qui suit le thème (ui-designer, 2026-11-20) ;
  - `page` : 1200 px sur le plus grand côté ;
  - `enlarged` : 2400 px sur le plus grand côté.
  - Aucune taille n'agrandit une photo plus petite.
- Traitement **synchrone** dans la requête d'ajout : une photo de 10 Mio se traite en une à deux secondes. « Présentée aussitôt » (R1) reste vrai, sans état intermédiaire. On reviendra à une tâche de fond si les durées mesurées le demandent.

### Téléversement
- `POST /catalog/poses/{poseId}/photos`, `multipart/form-data` : parties `file`, `altText`, `credit`, `rightsConfirmed`. Réponse 201 avec la photo telle que présentée.
- Limites : `RequestSizeLimit` de 11 Mio sur cet endpoint seulement (10 Mio de fichier et la marge multipart), `MultipartBodyLengthLimit` de 10 Mio. Le dépassement est traduit en ProblemDetails `photo.too-large` (413), que le site traite comme l'erreur de poids. Le proxy de production devra accepter 11 Mio.
- **Site** : l'adaptateur `PosePhotosGateway` d'`api-client` utilise un transport `XMLHttpRequest` injectable (`upload.onprogress`, `abort()` relié à l'`AbortSignal`), car `fetch` ne donne pas la progression d'un envoi. Les autres appels restent sur openapi-fetch. La réduction avant l'envoi (`canvasPhotoReducer`, JPEG qualité 0,85) se fait dans `apps/web`, derrière le port `PhotoReducer` de `core`.
- `PUT /catalog/poses/{poseId}/photos/main` (`{ photoId }`), `PUT /catalog/poses/{poseId}/photos/{photoId}` (`{ altText, credit }`), `DELETE /catalog/poses/{poseId}/photos/{photoId}`. Tous sont protégés par la policy `CanManagePhotos`.

### Cohérence et concurrence
- Ajout : traiter, puis **stocker sous un `PhotoId` neuf hors verrou**, puis, sous le verrou `pose-photos:<id>` (advisory lock PostgreSQL, comme `pose:<id>`), relire l'agrégat, `Add` (contrôle du maximum qui fait foi), enregistrer. Si l'enregistrement échoue, les fichiers sont supprimés (compensation). Un jeton de concurrence (`xmin`) sur `catalog.pose_photos` sert de filet de sécurité.
- Retrait : enregistrer d'abord (la photo devient introuvable), puis supprimer les fichiers dans la même requête. Un échec de suppression est journalisé et n'annule pas le retrait.
- Fichiers orphelins (compensation ou suppression échouée) : un balayage périodique, qui compare les clés du seau aux `PhotoId` de la base, est **reporté**. On le fera quand une première orpheline sera constatée.
- Tables `catalog.pose_photos` (`pose_id` PK, `main_photo_id`) et `catalog.photos` (`id`, `pose_id`, `alt_text`, `credit`, `width`, `height`, `addition_rank`, `added_at`, `rights_confirmed_by`, `rights_confirmed_at`).

### Données personnelles de la confirmation des droits
- `rights_confirmed_by` garde l'identifiant du compte et `rights_confirmed_at` la date, jamais présentés. Après suppression du compte, l'identifiant reste. Il ne renvoie plus à personne et suffit à prouver qu'une confirmation a été donnée. La durée de conservation est celle de la photo. À reprendre dans la politique de confidentialité avant la mise en production.

### Tests
- Specs `@api` : faux `IPhotoProcessor` et `IPhotoStorage` en mémoire (comme les autres ports, ADR 0006). Les fixtures nommées des scénarios sont des descriptions (« une photo JPEG de 2 Mo de 1600×1200 ») que le faux traduit en `PhotoProbe`. Aucun fichier binaire n'est versionné.
- Intégration (`Category=Integration`) :
  - `MagickPhotoProcessor` sur des fichiers **générés pendant le test** (JPEG avec GPS et orientation 6, PNG, WebP, GIF, PDF, texte nommé `.jpg`, HEIC si l'encodeur le permet, sinon un petit HEIC versionné) ;
  - `S3PhotoStorage` sur RustFS par Testcontainers (conteneur générique) ;
  - le dépôt et le verrou sur PostgreSQL.
- Web : API simulée (ADR 0009) et images de test servies par le simulateur.

## Conséquences
- Positif :
  - aucun lien avec un hébergeur : tout stockage compatible S3 convient (Scaleway, OVH, Cloudflare R2, AWS, RustFS, Garage…) ;
  - le retrait est immédiat et vérifié par l'API ;
  - le site garde la même origine, sans changement de politique de sécurité ni de cookie ;
  - le HEIC des iPhone est lu ;
  - le domaine ne connaît ni S3 ni ImageMagick.
- Négatif :
  - l'API sert chaque octet des images (mémoire, bande passante) tant qu'aucun CDN n'est placé devant ;
  - une dépendance native (ImageMagick) dans l'image de l'API ;
  - un service de plus (RustFS) dans le `docker-compose` et en CI d'intégration ;
  - un transport XHR à part dans `api-client` ;
  - un balayage des fichiers orphelins à écrire un jour.
- À surveiller :
  - les mises à jour de sécurité de Magick.NET (bibliothèque exposée à des fichiers externes) ;
  - la durée du traitement synchrone ;
  - la taille du seau et son coût ;
  - le décodage du HEIC selon les versions de libheif ;
  - les sauvegardes du seau, séparées de celles de la base.

## Écarts constatés à l'implémentation (2026-11-21)
- **RustFS au lieu de MinIO** (choix du porteur du produit) : MinIO ne publie plus ses images Docker (Docker Hub et Quay refusent le téléchargement). RustFS, compatible S3, sert en local (`docker-compose`) et dans les tests d'intégration ; le code de l'application ne change pas (AWSSDK.S3).
- **Magick.NET 15** (`Magick.NET-Q8-AnyCPU`) : le paquet ne sait pas **encoder** le HEIC ; le test de lecture du HEIC est ignoré quand l'encodeur manque. La lecture d'une vraie photo d'iPhone reste à vérifier à la main.
- **Jeton de concurrence** : pas de `xmin` sur `catalog.pose_photos` ; le verrou `pose-photos:<id>` suffit à sérialiser les écrivains.
- **Événement** : `MainPhotoChanged` (et non `MainPhotoChosen`), selon la règle d'architecture des événements au passé en « -ed ».
- **Création du seau** : au premier envoi (`S3PhotoStorage.EnsureBucket`), en développement comme en test.
- **Revue d'architecture (2026-11-23)** :
  - le format est reconnu **en C# par les premiers octets** (JPEG, PNG, WebP, HEIC) avant tout appel à ImageMagick, qui reçoit toujours un format explicite : ses autres codeurs (SVG, MVG, MSL, TEXT, ImageTragick) ne sont jamais atteints. Pas de `policy.xml` : ce garde la remplace ; `ResourceLimits.Memory` est plafonné (512 Mo) et deux photos au plus sont traitées en même temps ; les tailles sont produites en cascade ;
  - l'**AVIF** n'est pas accepté (R4) ;
  - la compensation supprime les tailles stockées aussi quand une **exception** survient (stockage, verrou, base, annulation) ; une suppression du stockage ne lève jamais d'exception ;
  - un corps qui n'est pas un formulaire, ou un formulaire mal formé, est `photo.file-required` (400) ; seul le dépassement de taille est `photo.too-large` (413) ;
  - `Cache-Control: private` (et non `public`) : aucun cache partagé ne garde une photo retirée ; un CDN avec purge fera l'objet de sa propre décision ;
  - `width` et `height` de la réponse sont les dimensions redressées de la photo envoyée (même ratio que la taille `page`) ;
  - `Location` d'un ajout : l'adresse de la taille `page` de la photo.

