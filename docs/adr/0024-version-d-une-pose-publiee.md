# 0024. Version d'une pose publiée

- Statut : accepté
- Date : 2026-11-12
- Complète : [0016](0016-integration-contribution-catalogue.md), [0022](0022-decider-d-une-proposition.md)

## Contexte
La story 6 « Proposer une modification d'une pose publiée » rend irrecevable une modification commencée sur une pose qui a changé entre-temps (R10, décision D du 2026-11-12) : le site ouvre le formulaire prérempli avec les valeurs actuelles, la personne saisit, et pendant ce temps une autre modification peut être acceptée ou publiée directement. Sans contrôle, la modification serait calculée sur des valeurs périmées : elle écraserait en silence une valeur, ou serait refusée avec le faux motif « ne change rien ».

Le même risque existe côté écriture : deux publications directes concurrentes d'une modification de la même pose, ou une acceptation qui suit une révision inattendue (amorçage de données, outil d'administration).

## Options envisagées
1. **Version de la pose dans le Catalogue** : un entier `version` sur `catalog.poses`, à 1 à la publication, incrémenté à chaque révision ; exposé par `GET /catalog/poses/{id}`, renvoyé par le site avec la modification, et jeton de concurrence de `RevisePose`. Fait explicite, insensible aux allers-retours de valeurs (A → B → A) ; une colonne et une migration de plus dans le Catalogue.
2. **Le site renvoie les cinq valeurs lues** et Contribution les compare aux valeurs actuelles : rien à changer dans le Catalogue, mais un contrat plus lourd, aveugle à un aller-retour A → B → A, et aucune protection côté écriture.
3. **ETag / `If-Match` HTTP** : idiomatique, mais la version voyage dans des en-têtes que le client généré (`openapi-fetch`) expose mal, et la règle métier se retrouverait dans la couche HTTP.

## Décision
**Option 1.**
- Catalogue : value object `PoseVersion` (entier ≥ 1) porté par l'agrégat `Pose` ; `Pose.Publish` démarre à 1 ; `Pose.Revise(…, PoseVersion expected, …)` échoue avec `catalog.pose-version-mismatch` si `expected` n'est pas la version courante, sinon remplace les valeurs, garde l'identité et incrémente la version (événement `PoseRevised`).
- Persistance : colonne `version integer NOT NULL` sur `catalog.poses` (contrainte `version >= 1`), configurée comme jeton de concurrence EF. La migration `RecordPoseVersions` met les poses existantes à 1 par une valeur par défaut qu'elle retire aussitôt : l'application écrit toujours la version, et une valeur par défaut cacherait un oubli (même règle que les autres colonnes de `catalog.poses`). Une mise à jour concurrente est traduite en `catalog.pose-version-mismatch` par l'unité de travail.
- Contribution lit la pose et sa version par le port `ICatalogPoses.Find(PublishedPoseId)` ; `PoseRevisionProposal.Submit` vérifie la version **avant** toute autre règle, pour ne jamais répondre « ne change rien » à une pose qui a changé. La version de départ est enregistrée avec la proposition (`base_version`) et passée à `RevisePose` à l'acceptation.
- Contrat : `GET /catalog/poses/{id}` (public) renvoie la pose et `version` ; `POST /contribution/pose-revision-proposals` reçoit `poseVersion`. L'ACL traduit `catalog.pose-version-mismatch` en `contribution.pose-changed-since-revision-started` (409).

## Conséquences
- Le site recharge les valeurs et la version, en gardant la saisie, quand l'API répond 409 `pose-changed-since-revision-started`.
- Grâce à « une seule modification en attente par pose » ([0025](0025-reservation-par-pose-puis-par-nom.md)), la version ne peut pas changer entre une soumission et son acceptation : à l'acceptation, le contrôle est un filet de sécurité. S'il se déclenche, la modification reste en attente et le validateur la refuse (décision du 2026-11-12).
- La version est un détail du Catalogue exposé à ses clients : elle ne doit jamais servir à autre chose qu'à la concurrence (pas d'« historique des versions », hors périmètre).
