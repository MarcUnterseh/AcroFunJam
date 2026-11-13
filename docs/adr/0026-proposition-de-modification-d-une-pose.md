# 0026. Proposition de modification d'une pose : agrégat distinct, révision dans la même transaction

- Statut : accepté
- Date : 2026-11-12
- Complète : [0016](0016-integration-contribution-catalogue.md), [0022](0022-decider-d-une-proposition.md), [0023](0023-publication-directe-enregistree-et-mes-propositions.md)

## Contexte
La story 6 permet de proposer une modification d'une pose publiée. Elle est décidée comme une proposition de pose (acceptation, au besoin avec ajustements, ou refus avec motif), publiée directement si son contributeur est validateur ou administrateur, et suivie dans « Mes propositions ». Mais ses invariants diffèrent : elle porte sur une pose existante, doit changer au moins un champ, garde la valeur d'avant, est unique par pose et dépend de la version de la pose ([0024](0024-version-d-une-pose-publiee.md)).

## Options envisagées
1. **Étendre `PoseProposal`** avec une pose cible facultative : une seule file et un seul dépôt, mais des invariants conditionnels (« si c'est une modification… ») partout, et une table aux colonnes à moitié nulles.
2. **Agrégat distinct `PoseRevisionProposal`**, qui réutilise les décisions et les value objects existants.
3. **Stocker des écarts (« patchs »)** plutôt que des poses entières : moins de colonnes, mais chaque présentation (avant → proposé, avant → retenu, proposé → retenu) devrait reconstruire des poses.

## Décision
**Option 2, avec des poses entières (pas l'option 3).**
- `PoseRevisionProposal` (Contribution.Domain) : contributeur, pose ciblée (`PublishedPoseId`), version de départ, `ProposedRevision` (valeur d'avant `PriorPose` figée + pose telle que modifiée `ProposedPose`, au moins un champ changé après normalisation, la casse du nom compte), `RevisionMessage` facultatif (500 caractères, mêmes règles que le message d'ajustement), date de soumission, décision.
- Réutilisés tels quels : `ProposalDecision`, `Acceptance` (y compris `Acceptance.DirectPublication` et `IsDirectPublication`), `Rejection`, `PoseAdjustments`, `RetainedPose`, `AdjustmentNote`, `RejectionReason`, `NameAvailability`, `ProposalStatus`.
- `Submit` vérifie, dans l'ordre : version, « ne change rien » (`contribution.revision-changes-nothing`), modification déjà en attente, nom ; un contributeur validateur obtient une publication directe.
- `Accept` reçoit des `PoseAdjustments` (et non une `RetainedPose`) et calcule lui-même la pose retenue ; il refuse une modification retenue identique à la valeur d'avant (`contribution.retained-revision-changes-nothing`). Le validateur peut ajuster tout champ, même un champ que la modification ne changeait pas.
- Toutes les présentations se déduisent par comparaison des poses stockées : avant → proposé, avant → retenu, proposé → retenu (`RetainedPose.AdjustmentsFrom`).
- Catalogue : commande `RevisePose` (garde l'identité, contrôle la version et l'unicité du nom). Contribution l'appelle par `ICatalogPublisher.RevisePose` **dans la même transaction** que la revendication de la décision (ADR 0022) ou que la soumission (publication directe, ADR 0023) ; l'ACL traduit les erreurs du Catalogue.
- Persistance : table `contribution.pose_revision_proposals` (valeur d'avant, pose proposée, pose retenue, `base_version`, `reserved_name_key`, statut, décision, `published_directly` et sa contrainte de cohérence, comme l'ADR 0023).
- Événements : `PoseRevisionProposed`, `PoseRevisionAccepted`, `PoseRevisionRejected` ; côté Catalogue, `PoseRevised`.

## Conséquences
- Duplication attendue entre les deux agrégats (rôle du décideur, décision déjà prise, refus, choix de l'erreur de nom) : à factoriser en phase refactor par des fonctions de domaine, **pas** par une classe de base commune.
- `ValidatorText` sert aussi au message du contributeur : renommé `ProposalText`.
- `PoseFieldChange` (avant → après) et `PoseFieldAdjustment` (proposé → retenu) ont la même forme mais restent deux termes distincts du langage.
- Le message de modification n'est pas présenté au contributeur dans « Mes propositions » (décision du 2026-11-12).
