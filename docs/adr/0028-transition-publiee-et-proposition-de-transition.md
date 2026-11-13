# 0028. Transition publiée et proposition de transition

- Statut : accepté
- Date : 2026-11-13
- Complète : [0014](0014-contexte-contribution.md), [0015](0015-noyau-partage-catalogue-contribution.md), [0016](0016-integration-contribution-catalogue.md), [0022](0022-decider-d-une-proposition.md), [0023](0023-publication-directe-enregistree-et-mes-propositions.md), [0026](0026-proposition-de-modification-d-une-pose.md)

## Contexte
La story 7 « Proposer une transition » ajoute au catalogue ses arêtes : une transition orientée d'une pose de départ publiée vers une pose d'arrivée publiée, avec un nom facultatif, une difficulté base et une difficulté flyer obligatoires et une description publique facultative. Elle se propose, se décide (acceptation au besoin avec ajustements du nom, des difficultés et de la description, jamais des poses ; refus avec motif), se publie directement pour un validateur et se suit dans « Mes propositions », comme une proposition de pose. Elle présente le **nom actuel** de ses poses partout (catalogue, file, « Mes propositions »), sans contrôle de version des poses.

Le code existant est taillé pour les poses : `Acceptance` porte une `RetainedPose`, `PoseAdjustments` et `PoseFieldAdjustment` décrivent les champs d'une pose, `ProposalText.Normalize` réduit les espaces intérieurs et les retours à la ligne.

## Options envisagées
1. **Étendre `PoseProposal` ou `Acceptance` par des champs facultatifs** : un seul type, mais des invariants conditionnels et une décision qui porte tantôt une pose, tantôt une transition.
2. **Agrégats distincts, décision d'acceptation propre à la transition** (`TransitionProposal`, `TransitionAcceptance`), réutilisant ce qui ne dépend pas du contenu (`ProposalDecision`, `Rejection`, `RejectionReason`, `AdjustmentNote`, `DecisionRules`, `ProposalStatus`, `MyProposalStatus`).
3. **`Acceptance<TRetained>` générique** : moins de code dupliqué, mais le statut (`Decision switch { Acceptance => … }`), la réhydratation et les objets de lecture deviennent génériques pour deux cas seulement.

Pour la transition publiée :
- A. **Agrégat `Transition` du Catalogue**, distinct de `Pose` ;
- B. transitions portées par l'agrégat `Pose` de départ : l'agrégat grossit avec le graphe, et une transition « vers » serait invisible depuis sa pose d'arrivée sans charger toutes les poses.

## Décision
**Option 2 et option A.**

**Noyau partagé** (ADR 0015, étendu) : `TransitionName`, `TransitionNameKey`, `TransitionDescription` et `TransitionContentErrors` rejoignent `AcroFunJam.Domain.SharedKernel` (côté front, `core/src/domain/shared-kernel`), pour la même raison que le nom de pose : une transition proposée doit être publiable telle quelle et son unicité s'apprécie à travers les deux contextes avec la même clé.
- `TransitionName.CreateOptional(string?)` → `Result<TransitionName?>` : mêmes normalisation et longueur qu'un nom de pose (NFC, espaces superflus retirés, 60 points de code) ; vide ou fait d'espaces = **pas de nom** (`null`, succès) ; clé vide (seulement de la ponctuation) = `transition.name-without-letter-or-digit` (Q107) ; trop long = `transition.name-too-long`. La normalisation et le calcul de clé sont partagés avec `PoseName` (fonctions internes du noyau), pas copiés.
- `TransitionNameKey` : même algorithme que `PoseNameKey` (ADR 0017), type distinct pour qu'une clé de transition ne serve jamais à l'unicité d'une pose.
- `TransitionDescription.CreateOptional(string?)` (Q105) : NFC, fins de ligne ramenées à `\n`, espaces et retours à la ligne **retirés en début et en fin seulement** ; espaces intérieurs et retours à la ligne conservés ; vide ou fait d'espaces = pas de description ; 500 points de code au plus après normalisation (`transition.description-too-long`). Ce n'est **pas** un `ProposalText` (qui réduit les espaces intérieurs).
- Les difficultés réutilisent `Difficulty` et ses codes `pose.base-difficulty-required`, `pose.flyer-difficulty-required`, `pose.unknown-difficulty-level` : ce sont les règles de l'échelle, communes aux poses et aux transitions. Verrue assumée (préfixe `pose.`), à renommer en `difficulty.*` si un troisième usage apparaît.

**Catalogue** : agrégat `Transition` (`TransitionId`, `FromPose` / `ToPose` : `PoseId`, `Name?`, `Difficulty`, `Description?`, `SourceProposalId?`, `PublishedAt`), fabrique `Transition.Publish(…, bool fromPosePublished, bool toPosePublished, bool slotTaken, now)` → `catalog.from-pose-not-found`, `catalog.to-pose-not-found`, `catalog.transition-name-taken` ou `catalog.unnamed-transition-taken` (selon que la transition a un nom), événement `TransitionPublished`. Commande `PublishTransition` (utilisée par la publication directe, l'acceptation et l'amorçage de données). Une washing machine (`FromPose == ToPose`) n'a rien de particulier. Le Catalogue reste maître : il revérifie les poses et la place (ADR 0029) à la publication.

**Contribution** :
- `TransitionPoses(From, To)` (`PublishedPoseId`) : le couple orienté, c'est-à-dire le sens. `TransitionPoses.Create(Guid?, Guid?)` → `contribution.from-pose-required`, `contribution.to-pose-required`. Jamais ajusté.
- `ProposedTransition(Name?, Difficulty, Description?)` et `RetainedTransition` (même forme), `ProposedTransition.Retain(TransitionAdjustments)`, `RetainedTransition.AdjustmentsFrom(ProposedTransition)` → `TransitionFieldAdjustment` (hiérarchie fermée : `TransitionNameAdjustment(TransitionName?, TransitionName?)`, `TransitionBaseDifficultyAdjustment`, `TransitionFlyerDifficultyAdjustment`, `TransitionDescriptionAdjustment(TransitionDescription?, TransitionDescription?)`), comparaison des valeurs normalisées (la casse du nom compte).
- `TransitionAdjustments` : chaque valeur est **à trois états** pour le nom et la description (inchangée ; remplacée ; retirée). Dans le contrat HTTP : absent ou `null` = inchangé, chaîne vide ou faite d'espaces = retirée (même règle qu'à la proposition, R8), sinon la valeur suit les règles de contenu.
- `TransitionAcceptance : ProposalDecision` (`Retained`, `Note`, `HasAdjustments`, `IsDirectPublication`) avec `Of`, `Restore`, `DirectPublication`, sur le modèle exact d'`Acceptance` (ADR 0022, 0023). La règle « un message n'accompagne qu'une acceptation avec ajustements » est factorisée en fonction de domaine partagée par les deux, pas en classe de base (ADR 0026).
- Agrégat `TransitionProposal` (`TransitionProposalId`, `Contributor`, `Poses`, `Proposed`, `SubmittedAt`, `Decision`) :
  - `Submit(id, contributor, poses, proposed, bool fromPosePublished, bool toPosePublished, TransitionSlotAvailability slot, now)` : pose de départ, puis pose d'arrivée, puis place ; publication directe pour un validateur ;
  - `Accept(validator, adjustments, note, TransitionSlotAvailability retainedSlot, now)` : `DecisionRules`, puis cohérence de l'acceptation, puis place retenue ; il calcule lui-même la transition retenue (comme `PoseRevisionProposal.Accept`) ;
  - `SlotIfAccepted(adjustments)` : la place que prendrait la transition retenue, pour que le cas d'usage en lise la disponibilité ;
  - `Reject(validator, reason, now)` ;
  - `Rehydrate(…)` vérifie la cohérence d'une publication directe ;
  - événements `TransitionProposed`, `TransitionProposalAccepted` (`WithAdjustments`), `TransitionProposalRejected`.
- La proposition ne stocke **aucun nom de pose** (décision 8) : les noms actuels sont lus au Catalogue en un seul lot par un port `ICatalogPoses.NamesOf(PublishedPoseId[])` (adaptateur qui appelle une query `GetPublishedPoseNames` du Catalogue). Une pose absente du lot n'est pas publiée : c'est aussi ainsi que `ProposeTransition` constate qu'une pose est introuvable.
- Objets de lecture du domaine construits avec ces noms : `PendingTransitionProposal.Of(proposal, fromName, toName)` (`IPendingProposal`, `QueuedName` = nom actuel de la pose de départ) et `MyTransitionProposal.Of(proposal, fromName, toName)` (`IMyProposal`, `ListedName` = nom actuel de la pose de départ ; transition retenue si acceptée, proposée sinon ; ajustements ; message ; motif ; jamais le validateur).
- ACL `ICatalogPublisher.PublishTransition(TransitionProposalId, TransitionPoses, RetainedTransition)` : `catalog.transition-name-taken` → `contribution.transition-name-already-in-catalog`, `catalog.unnamed-transition-taken` → `contribution.unnamed-transition-already-in-catalog`, `catalog.from-pose-not-found` / `catalog.to-pose-not-found` → `contribution.from-pose-not-found` / `contribution.to-pose-not-found`.

**Persistance** :
- une seule migration `AddTransitions` crée les deux tables ; table `catalog.transitions` (`from_pose_id` et `to_pose_id` en clés étrangères vers `catalog.poses`, même schéma ; `name`, `name_key`, `base_difficulty`, `flyer_difficulty`, `description`, `source_proposal_id`, `published_at`), contraintes : niveaux de l'échelle, `char_length(name) <= 60`, `(name IS NULL) = (name_key IS NULL)`, `name_key <> ''`, `description <> ''`, `char_length(description) <= 500` ; index de la place (ADR 0029) et index `(to_pose_id)` pour les transitions « vers » ;
- table `contribution.transition_proposals` (couple, transition proposée avec `name_key`, transition retenue, statut jeton de concurrence (ADR 0022), décision, motif, message d'ajustement, `published_directly` et sa contrainte de cohérence (ADR 0023)), sans clé étrangère vers le schéma `catalog` (isolation des contextes, comme `pose_revision_proposals.pose_id`) ; index de la place en attente (ADR 0029) et index `(contributor_id)`.

## Conséquences
- Duplication attendue entre `TransitionProposal`, `PoseProposal` et `PoseRevisionProposal` (statut, rôle du décideur, décision déjà prise, publication directe) et entre `TransitionAcceptance` et `Acceptance` : à factoriser en phase refactor par des fonctions de domaine, pas par héritage.
- Le titre d'une transition dans la file et dans « Mes propositions » change si une pose est renommée, y compris entre deux lectures : écart accepté avec la modification de pose, qui garde le nom au moment de la proposition (décision 8).
- Les poses n'étant jamais retirées aujourd'hui, une transition en attente ou publiée ne perd jamais une pose ; le jour où le retrait ou la fusion de poses existera, il faudra décider du sort des transitions (question ouverte du Catalogue). Les clés étrangères de `catalog.transitions` bloqueront d'ici là toute suppression silencieuse.
- `TransitionPublished` n'a aucun abonné ; la Génération de flow le consommera peut-être (context map).
