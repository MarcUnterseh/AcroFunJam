# 0023. Publication directe enregistrée comme un fait, et modèle de lecture « Mes propositions »

- Statut : accepté
- Date : 2026-11-09
- Complète : [0014](0014-contexte-contribution.md), [0016](0016-integration-contribution-catalogue.md), [0018](0018-contrat-http-de-contribution.md), [0022](0022-decider-d-une-proposition.md)

## Contexte
La story 5 « Suivre mes propositions » présente au contributeur chacune de ses propositions avec un statut parmi cinq : en attente de validation, acceptée, acceptée avec ajustements, refusée, **publiée directement** (décision Q19 du 2026-11-09), cette dernière sans date de décision.

Aujourd'hui, une publication directe (story 3) est une `PoseProposal` dont `PoseProposal.Submit` enregistre aussitôt une `Acceptance` décidée par le contributeur lui-même (`contributor.Id.AsValidator()`), au même instant que la soumission. Rien ne la distingue, en mémoire comme en base, d'une proposition acceptée par son contributeur devenu validateur après coup (story 4, R17), qui doit rester « acceptée ».

Deux autres questions se posent :
- où calculer ce que voit le contributeur (pose retenue ou proposée, statut, détail des ajustements, date de décision), sans le laisser fuir vers le handler ou l'endpoint ;
- comment ne jamais exposer le validateur qui a décidé (Q12), alors que la décision le porte (`ProposalDecision.By`, colonne `decided_by`).

## Options envisagées
Pour reconnaître une publication directe :
1. **Inférence à la lecture** : `decided_by = contributor_id AND decided_at = submitted_at`. Aucune migration, mais la règle repose sur un détail d'implémentation (le même `now` lu une fois dans `Submit`). Elle se trompe dès que l'horloge est figée : les scénarios d'acceptation fixent la date (`ScenarioClock`, « Alice a proposé le 2026-11-03… ») ; un scénario R17 sans nouvelle date donnerait `decided_at = submitted_at` et transformerait une acceptation en publication directe. Un futur changement (horodater la décision après la publication) la casserait sans bruit.
2. **Nouveau statut `PublishedDirectly`** dans `ProposalStatus` et dans la colonne `status` : explicite, mais le statut sert aussi de filtre de la file de validation, de jeton de concurrence (ADR 0022) et de contrat de `POST /contribution/pose-proposals` (`accepted`). Une publication directe est une acceptation (glossaire) : le statut « traitée, publiée » est le même, seule la manière d'accepter diffère.
3. **Nouveau type de décision `DirectPublication : ProposalDecision`** : explicite en mémoire, mais `ProposePoseHandler`, `PoseProposalRecords`, le statut et les contraintes en base doivent tous apprendre un troisième cas qui se comporte en tout point comme une acceptation (pose retenue, publication par le même port).
4. **Fait explicite porté par l'acceptation** : `Acceptance.IsDirectPublication`, créé uniquement par une fabrique dédiée appelée par `Submit`, enregistré dans une colonne `published_directly`.

Pour le modèle de lecture :
- A. le handler ou l'endpoint compose la réponse à partir de l'agrégat ;
- B. **un objet de lecture du domaine, `MyPoseProposal`, construit à partir de la `PoseProposal`**, qui porte les règles de présentation métier et n'a aucun membre désignant le validateur ;
- C. une projection SQL dédiée : rapide, mais la comparaison « proposé → retenu » après normalisation (R9 bis) serait réécrite hors du domaine.

## Décision
- **Option 4.** `Acceptance` gagne `IsDirectPublication`. La fabrique `Acceptance.DirectPublication(ProposedPose, ContributorId, DateTimeOffset)` (sans `Result` : rien ne peut échouer) est la seule à créer ce fait : pose retenue égale à la pose proposée, sans message, décidée par le contributeur, à l'instant de la soumission. `Acceptance.Restore` le relit tel qu'il a été enregistré, réservé à la réhydratation (voir **Persistance**). `Acceptance.Of` (validateur, y compris le contributeur promu de R17) ne la pose jamais. `ProposalStatus` reste à trois valeurs, et le contrat de `POST /contribution/pose-proposals` est inchangé (`accepted`).
- **Persistance** : colonne `published_directly boolean NOT NULL DEFAULT false` dans `contribution.pose_proposals`, contrainte `ck_pose_proposals_published_directly` : `NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow))`. La réhydratation vérifie cette cohérence dans le domaine : `PoseProposalRecords` traduit la ligne telle quelle (`Acceptance.Restore`), et `PoseProposal.Rehydrate` signale comme un bogue une publication directe qui n'est pas exactement celle de sa soumission (`Acceptance.DirectPublication`).
- **Reprise des données** (migration `RecordDirectPublications`) : l'inférence de l'option 1 est appliquée **une seule fois**, aux lignes existantes, avec la condition complète de la contrainte (acceptée, par son contributeur, à l'instant de la soumission, sans message, pose retenue égale à la pose proposée) : une ligne atypique reste une acceptation ordinaire au lieu de bloquer le déploiement. Elle est sûre pour les données de production : jusqu'ici, seul `Submit` enregistre une décision dans la même requête que la soumission ; une acceptation par un validateur arrive dans une requête ultérieure, donc à un instant strictement postérieur avec l'horloge système. Le `Down` supprime la colonne (rien n'est perdu que l'on ne puisse réinférer).
- **Option B** pour le modèle de lecture : `MyPoseProposal.Of(PoseProposal)` (domaine) donne la pose présentée (retenue si acceptée, proposée sinon), le statut pour le contributeur (`MyProposalStatus`, cinq valeurs), la date de soumission, la date de décision (aucune pour une publication directe), les ajustements champ par champ (`RetainedPose.AdjustmentsFrom(ProposedPose)`, dont `IsAdjustedFrom` devient un cas particulier : une seule comparaison), le message d'ajustement et le motif de refus. L'ordre (`MyProposalsOrder` : la plus récemment soumise d'abord, puis l'ordre du catalogue sur le nom présenté, puis l'identifiant le plus récent pour un ordre déterministe) est un comparateur du domaine.
- **Port de lecture** `IMyPoseProposalsReader.ListSubmittedBy(ContributorId)` (Contribution.Application), qui renvoie des agrégats `PoseProposal` réhydratés, comme la file de validation (ADR 0022), en s'appuyant sur l'index `ix_pose_proposals_contributor_id`.
- **Résultat de la query** : `GetMyPoseProposals` renvoie directement les objets de lecture du domaine (`MyPoseProposal`), sans DTO d'Application : ils sont déjà immuables, faits pour la lecture et dépourvus de validateur, et un DTO n'en serait qu'une copie champ à champ ; l'endpoint reste seul responsable de la forme JSON.
- **Contrat HTTP** : `GET /contribution/my-pose-proposals`, policy `CanPropose` (toute personne qui peut proposer suit ses propositions). Détail du corps : `docs/domain/context-map.md`.

## Conséquences
- Un fait métier est enregistré au moment où il se produit, au lieu d'être déduit d'horodatages : la publication directe résiste aux horloges figées des scénarios et aux évolutions de l'horodatage.
- `ProposePoseHandler` continue de tester `Decision is Acceptance` : la publication directe emprunte toujours le chemin de l'acceptation (ADR 0016, 0022).
- L'événement `PoseProposalAccepted` n'est pas modifié (aucun consommateur). Si un consommateur doit un jour distinguer la publication directe, l'événement portera le même fait.
- Le validateur reste dans l'agrégat (traçabilité, R7 de la story 4) mais n'existe pas dans `MyPoseProposal` : il ne peut pas fuir par l'endpoint. Un test du domaine et un test de contrat le vérifient.
- La lecture charge toutes les propositions d'un contributeur et les trie en mémoire : compromis assumé (volume faible, pas de pagination, Q27), à revoir avec une pagination.
- La migration fait le pari que les données existantes n'ont pas été produites par une horloge figée. Ce pari est vérifié en production : aucune horloge de test n'y tourne.
