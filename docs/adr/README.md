# Architecture Decision Records

| # | Décision | Statut |
|---|---|---|
| [0001](0001-stack-technique.md) | Stack technique : API .NET, web React/Vite, mobile Expo | accepté |
| [0002](0002-clean-architecture-et-ddd.md) | Clean architecture + DDD, cas d'usage sans MediatR | accepté |
| [0003](0003-bdd-specs-partagees.md) | Spécifications Gherkin partagées en français | accepté |
| [0004](0004-strategie-de-tests.md) | Stratégie de tests et double boucle TDD | accepté |
| [0005](0005-outillage-du-squelette.md) | Outillage du squelette : MTP, câblage Reqnroll, TypeScript 6.0 | proposé |
| [0006](0006-donnees-des-scenarios-d-acceptation.md) | Données des scénarios d’acceptation : faux aux ports (@api), API simulée (@web) | proposé |
| [0007](0007-contrat-http-et-persistance-modulaire.md) | Conventions du contrat HTTP et persistance modulaire | proposé |
| [0008](0008-identite-et-roles.md) | Identité : comptes ASP.NET Core Identity et rôles cumulatifs | accepté |
| [0009](0009-specs-adossees-a-une-bibliotheque.md) | Specs d’acceptation adossées à une bibliothèque : vraie base PostgreSQL | accepté |
| [0010](0010-routeur-du-site-web.md) | Routeur du site web (React Router) et pages dédiées | accepté |
| [0011](0011-session-web-et-mots-de-passe.md) | Session du site en cookies, règle de mot de passe (10 caractères) | accepté |
| [0012](0012-tokens-en-variables-css.md) | Design tokens exposés au web en variables CSS | accepté |
| [0013](0013-expiration-et-onglets.md) | Expiration de session et synchronisation entre onglets (indice en localStorage) | accepté |
| [0014](0014-contexte-contribution.md) | Contexte Contribution : un agrégat par type de proposition | accepté |
| [0015](0015-noyau-partage-catalogue-contribution.md) | Noyau partagé Catalogue / Contribution | accepté |
| [0016](0016-integration-contribution-catalogue.md) | Intégration Contribution → Catalogue (appel synchrone, une transaction) et Identité → Contribution | accepté |
| [0017](0017-cle-de-comparaison-et-unicite-du-nom.md) | Clé de comparaison du nom de pose et unicité (index, verrou consultatif) | accepté |
| [0018](0018-contrat-http-de-contribution.md) | Contrat HTTP de Contribution (complète 0007) | accepté |
| [0019](0019-capacites-et-saisie-conservee-cote-site.md) | Côté site : capacités plutôt que rôle, saisie conservée dans l’onglet | accepté |
| [0020](0020-specs-de-contribution-sur-une-vraie-base.md) | Specs @api de Contribution sur une vraie base (amende 0006 et 0009) | accepté |
| [0021](0021-couche-presentation-du-front-partage.md) | Couche de présentation partagée du front (`core/src/presentation`, complète 0002) | accepté |
| [0022](0022-decider-d-une-proposition.md) | Décider d'une proposition : mise à jour conditionnelle sur le statut, publication dans la même transaction, adresse e-mail lue à Identité | accepté |
| [0023](0023-publication-directe-enregistree-et-mes-propositions.md) | Publication directe enregistrée comme un fait (`published_directly`), modèle de lecture « Mes propositions » | accepté |
| [0024](0024-version-d-une-pose-publiee.md) | Version d'une pose publiée (contrôle « la pose a changé entre-temps ») | accepté |
| [0025](0025-reservation-par-pose-puis-par-nom.md) | Réservation par pose, puis par nom (complète 0017) | accepté |
| [0026](0026-proposition-de-modification-d-une-pose.md) | Proposition de modification d'une pose : agrégat distinct, révision dans la même transaction | accepté |
| [0027](0027-file-de-validation-et-mes-propositions-heterogenes.md) | File de validation et « Mes propositions » hétérogènes (`kind`, `/contribution/my-proposals`) | accepté |
| [0028](0028-transition-publiee-et-proposition-de-transition.md) | Transition publiée (agrégat `Transition` du Catalogue) et proposition de transition (agrégat distinct, `TransitionAcceptance`, noyau partagé étendu) | accepté |
| [0029](0029-place-d-une-transition-et-reservation-par-couple.md) | Place d'une transition : unicité par couple orienté, réservation par couple, deux index partiels | accepté |
| [0030](0030-page-d-une-pose-et-contrat-http-des-transitions.md) | Page d'une pose (`GET /catalog/poses/{id}` enrichi) et contrat HTTP des transitions | accepté |
| [0031](0031-direction-visuelle-soleil-et-lune.md) | Direction visuelle « Soleil et Lune », thème sombre tokenisé (suit le système), polices auto-hébergées | accepté |
| [0032](0032-liste-des-etiquettes.md) | Liste des étiquettes : agrégat `TagList` du Catalogue, implication portée par l'étiquette, retrait logique, amorçage unique au démarrage, capacité `manage-tags` | proposé |
| [0033](0033-etiquettes-d-une-transition-et-retrait-conditionnel.md) | Étiquettes d'une transition : ensemble choisi par la liste (`TagChoice`), ajustement, étiquetage direct, retrait conditionnel entre contextes sous verrou `tag-list` partagé ou exclusif, erreurs porteuses de détails | proposé |
| [0034](0034-contrat-http-des-etiquettes.md) | Contrat HTTP des étiquettes (`/catalog/tags`, `/catalog/transitions/{id}/tags`, `tagIds` et `tags` dans Contribution) | proposé |
| [0035](0035-champ-d-application-des-etiquettes-et-amorcage-versionne.md) | Champ d'application des étiquettes (`TagScope`), choix par cible (`TagChoice.NotApplicable`), amorçage versionné de la liste (`SeedRevision`, `Upgrade`) | proposé |
| [0036](0036-etiquettes-d-une-pose-et-contrat-http.md) | Étiquettes d'une pose : étiquetage direct par le Catalogue (version, modification en attente, verrou `pose:<id>` partagé), porteurs entre contextes, contrat HTTP | proposé |
| [0037](0037-contexte-generation-de-flow.md) | Contexte Génération de flow : graphe publié lu au Catalogue (`GetPublishedGraph`, ACL), recherche aléatoire bornée, `POST /flow-generation/flows` | proposé |
| [0038](0038-application-mobile-du-generateur-de-flow.md) | Application mobile du générateur de flow : règle du flow précédent et port du flow gardé dans `core`, navigation par groupes expo-router, `EXPO_PUBLIC_API_URL` par profil de build, `expo-sqlite/kv-store`, `expo-keep-awake`, Maestro sur l'API réelle (lanceur, relais coupé pour « injoignable ») | proposé |
| [0039](0039-photos-des-poses-stockage-diffusion-et-traitement.md) | Photos des poses : stockage objet compatible S3 (MinIO), diffusion par l'API (`GET /catalog/photos/{id}/{taille}`), téléversement multipart avec progression (XHR), traitement synchrone Magick.NET, tailles générées, verrou `pose-photos:<id>` | accepté |
| [0040](0040-hebergement-et-deploiement-continu.md) | Hébergement sur un VPS (Docker Compose, Caddy, PostgreSQL), photos sur Cloudflare R2, images GHCR, déploiement continu par GitHub Actions, migrations par bundle EF Core, clés de Data Protection en base | accepté |
| [0041](0041-videos-des-transitions-televersement-preparation-et-diffusion.md) | Vidéos des transitions : ffmpeg/ffprobe en processus externes, conteneur « worker » et file PostgreSQL par bail, téléversement multipart en flux, diffusion par l'API avec `Range`, `media-src 'self' blob:`, en-tête MP4/MOV lu par le site | accepté |
