# 0036. Étiquettes d'une pose : étiquetage direct par le Catalogue, porteurs entre contextes, contrat HTTP

- Statut : proposé
- Date : 2026-11-18
- Complète : [0024](0024-version-d-une-pose-publiee.md), [0027](0027-file-de-validation-et-mes-propositions-heterogenes.md), [0033](0033-etiquettes-d-une-transition-et-retrait-conditionnel.md), [0034](0034-contrat-http-des-etiquettes.md), [0035](0035-champ-d-application-des-etiquettes-et-amorcage-versionne.md)

## Contexte
Story 9a : une pose porte des étiquettes (celles qui s'appliquent aux poses). Elles se choisissent en proposant une pose, en proposant une modification (story 6, un champ de plus, ajustable), ou directement par un validateur ou un administrateur depuis la page d'une pose. L'étiquetage direct change la pose : il est refusé tant qu'une modification de la pose attend d'être validée, et la page d'une pose prévient le validateur à l'avance. Le retrait d'une étiquette et la restriction de son champ sont refusés tant qu'une pose publiée, une proposition de pose ou une modification en attente la porte.

## Options envisagées
1. **Étiquetage direct = commande du Catalogue** (`Pose.Tag(choice, revisionPending, now)`), symétrique de `TagTransition` : elle change la version de la pose, lit dans Contribution l'existence d'une modification en attente (`IPendingPoseRevisions`) et prend le verrou `pose:<id>` de Contribution, puis `tag-list` partagé.
2. **Étiquetage direct = modification publiée directement** (story 6) : réutilise les invariants de la modification, mais crée des entrées dans « Mes propositions », exige la version côté client et refuse un ensemble identique.
3. Pas d'étiquetage direct : les poses existantes ne seraient étiquetées que par des modifications.

## Décision
Option **1**.
- `Pose.Tags` (`TagSet`) ; `Pose.Tag` remplace l'ensemble (vide permis), incrémente la version et lève `PoseTagged` ; le même ensemble ne crée ni version ni événement (une modification commencée n'est pas rendue périmée pour rien). Ordre des contrôles : modification en attente (`catalog.pose-revision-pending`), hors liste, non applicable.
- Le verrou `pose:<id>` devient partagé entre Catalogue et Contribution (`IPoseTaggingLock`) ; `PgPoseReservation` prend aussi `tag-list` partagé, comme `PgTransitionReservation` (ADR 0033).
- Contribution : `Tags` dans `ProposedPose`, `RetainedPose` et `PriorPose` ; `PoseTagsChange` et `PoseTagsAdjustment` ; un même ensemble dans un autre ordre n'est ni un changement ni un ajustement ; `ICatalogTags.ChooseForPose` / `ChooseForTransition`.
- Porteurs : `TagCarriers` gagne les poses, et ses propositions en attente sont discriminées par sorte (transition, pose, modification) ; `IPendingTagCarriers` lit les trois sortes.
- Contrat HTTP (révise l'ADR 0034) :
  - `PUT /catalog/poses/{id}/tags` (`tagIds`) : 200, 401, 403, 404, 409 ;
  - `GET /catalog/poses` et `GET /catalog/poses/{id}` : `tags` ; la page d'une pose gagne `pendingRevision` (booléen public, aucun contenu exposé) ;
  - `/catalog/tags` : `scope` obligatoire en écriture, `poseCount` en lecture ;
  - `catalog.tag-carried` gagne `poses`, ses `pendingProposals` portent un `kind` (le site tolère un `kind` inconnu) ;
  - `tagIds` et `tags` dans les propositions de pose, les modifications, leurs acceptations, la file et « Mes propositions » ; 409 `contribution.tag-not-applicable`.

## Conséquences
- Positif : une seule façon simple d'étiqueter vite les poses existantes avant la story 9 ; mêmes règles que les transitions.
- Négatif : le Catalogue dépend d'une lecture de plus dans Contribution et partage un verrou avec elle (relation documentée dans la context map).
- À surveiller : la course étiquetage direct contre soumission d'une modification (test d'intégration) ; `PoseRevisionProposal.Accept` doit comparer les champs par une seule fonction, étiquettes comprises.
