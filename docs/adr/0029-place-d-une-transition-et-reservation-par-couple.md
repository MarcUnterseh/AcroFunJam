# 0029. Place d'une transition : unicité par couple orienté, réservation par couple

- Statut : accepté
- Date : 2026-11-13
- Complète : [0017](0017-cle-de-comparaison-et-unicite-du-nom.md), [0022](0022-decider-d-une-proposition.md), [0025](0025-reservation-par-pose-puis-par-nom.md), [0028](0028-transition-publiee-et-proposition-de-transition.md)

## Contexte
Deux règles de la story 7 portent sur l'ensemble des transitions d'une même pose de départ vers une même pose d'arrivée, publiées **ou** en attente de validation (R9, R10, R17, R18, R19) :
- au plus une transition **sans nom** ;
- un nom donné est **unique** (clé de comparaison, ADR 0017) ; le même nom reste libre entre d'autres poses.

Ce sont deux faces d'une même règle : chaque transition occupe une **place**, définie par sa pose de départ, sa pose d'arrivée et la clé de son nom ou l'absence de nom ; deux transitions publiées ou en attente n'occupent jamais la même place. Comme le nom de pose, la règle traverse deux tables de deux contextes (`catalog.transitions`, `contribution.transition_proposals`) et doit tenir sous concurrence : deux propositions simultanées, une proposition et une publication directe, une acceptation et une publication directe, une acceptation qui donne, change ou retire le nom.

## Options envisagées
1. **Verrou consultatif par place** (`transition:<départ>:<arrivée>:<clé ou vide>`) : grain le plus fin, mais une acceptation qui change de place (nom donné, corrigé ou retiré) doit prendre deux verrous dans un ordre fixe.
2. **Verrou consultatif par couple orienté** (`transition-poses:<départ>:<arrivée>`) : toutes les écritures de transitions entre ces deux poses dans ce sens sont sérialisées ; une acceptation ne change jamais de couple (les poses ne s'ajustent pas), donc un seul verrou, connu avant toute lecture.
3. **Index uniques seuls** : ne protègent pas une place prise d'un côté par une transition publiée et de l'autre par une proposition en attente (deux tables).
4. **Colonne « clé de place » non nulle** (`''` pour l'absence de nom) : un seul index ordinaire, mais une valeur sentinelle qui se confond avec une clé vide, que la règle Q107 interdit justement.

## Décision
**Option 2, avec les index uniques comme filets de sécurité.**
- Domaine (Contribution) : value object `TransitionSlot(TransitionPoses Poses, TransitionNameKey? NameKey)` ; `TransitionSlotAvailability` (`Available`, `TakenByPublishedTransition`, `TakenByPendingProposal`, avec `From(publishedInCatalog, pendingProposal)` : le catalogue l'emporte, comme `NameAvailability`). L'agrégat choisit l'erreur selon que la place est celle d'une transition sans nom ou nommée :
  - `contribution.unnamed-transition-already-in-catalog` / `contribution.unnamed-transition-already-pending` ;
  - `contribution.transition-name-already-in-catalog` / `contribution.transition-name-already-pending`.
- Port `ITransitionReservation.Run(TransitionPoses, travail)` (Contribution.Application), adaptateur `PgTransitionReservation` (`Infrastructure.ContextIntegration`, il couvre les deux contextes) : une transaction, `pg_advisory_xact_lock(hashtextextended('transition-poses:' || départ || ':' || arrivée, 0))`, travail, validation si le `Result` réussit, sinon `ChangeTracker.Clear()`. Il partage la mécanique de `PgPoseReservation` (fonction partagée `AdvisoryLocks.RunLocked`), avec un espace de noms de clés distinct. Ce verrou n'est jamais pris avec ceux de l'ADR 0025 : aucun risque d'interblocage.
- Lectures de disponibilité, **dans** la réservation : port `ICatalogTransitions.IsSlotTaken(TransitionSlot)` (ACL vers la query `IsTransitionSlotPublished` du Catalogue) ; `ITransitionProposalRepository.ExistsPendingInSlot(slot)` et, pour l'acceptation, `ExistsOtherPendingInSlot(slot, except)` (la proposition elle-même mise à part).
- `AcceptTransitionProposalHandler` suit l'ADR 0022 : lecture du validateur et de la proposition, réservation du couple, **relecture** de la proposition, disponibilité de la place retenue (`SlotIfAccepted`), décision de l'agrégat, revendication (mise à jour conditionnelle sur le statut), puis `ICatalogPublisher.PublishTransition` dans la même transaction. `RejectTransitionProposalHandler` ne réserve rien.
- Index uniques : l'unité de travail traduit une violation par index en **une** erreur métier (ADR 0017) ; un seul index `NULLS NOT DISTINCT` (PostgreSQL 15 et plus) ne dirait pas si la place prise est nommée ou sans nom. On déclare donc **deux index partiels** par table :
  - `catalog.transitions` : `ix_transitions_named_slot (from_pose_id, to_pose_id, name_key) WHERE name_key IS NOT NULL` → `catalog.transition-name-taken` ; `ix_transitions_unnamed_slot (from_pose_id, to_pose_id) WHERE name_key IS NULL` → `catalog.unnamed-transition-taken` (`CatalogUniqueConstraints`) ;
  - `contribution.transition_proposals` : les mêmes, filtrés en plus sur `status = 'pending'` → `contribution.transition-name-already-pending` / `contribution.unnamed-transition-already-pending` (`ContributionUniqueConstraints`).
- `PublishTransition` appelé hors réservation (amorçage) s'appuie sur les index du Catalogue : un doublon concurrent donne une erreur métier 409, jamais une 500.

## Conséquences
- Toute écriture d'une transition (proposition, publication directe, acceptation, plus tard modification ou retrait) passe par la réservation de son couple : à vérifier par un test d'intégration (deux propositions sans nom simultanées du même couple, une seule passe ; une proposition et une publication directe simultanées, une seule passe).
- Le grain « couple » sérialise aussi deux transitions de noms différents entre les mêmes poses : contention négligeable à ce volume.
- Un refus libère la place (la proposition quitte les index partiels) ; une acceptation qui change le nom libère la place proposée et prend la place retenue dans la même transaction.
- Deux index partiels par table plutôt qu'un index `NULLS NOT DISTINCT` : un peu plus de schéma, mais chaque violation se traduit en son erreur métier propre.
- L'index du Catalogue qui commence par `from_pose_id` sert aussi la lecture des transitions « depuis » ; un index `(to_pose_id)` sert celle des transitions « vers » (ADR 0030).
