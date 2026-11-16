# 0033. Étiquettes d'une transition : ensemble choisi par la liste, étiquetage direct, retrait conditionnel entre contextes

- Statut : proposé
- Date : 2026-11-13
- Complète : [0016](0016-integration-contribution-catalogue.md), [0022](0022-decider-d-une-proposition.md), [0028](0028-transition-publiee-et-proposition-de-transition.md), [0029](0029-place-d-une-transition-et-reservation-par-couple.md), [0032](0032-liste-des-etiquettes.md)

## Contexte
Une transition porte de 0 à n étiquettes de la liste, chacune une fois, l'ordre ne comptant pas (décisions 3 et 10). On les pose :
- à la proposition (E1 à E4), y compris en publication directe ;
- par le validateur avant d'accepter : c'est un **ajustement** si l'ensemble retenu diffère de l'ensemble proposé (E6, E7) ;
- directement sur une transition publiée, par un validateur, sans proposition : la dernière action l'emporte, sans contrôle de version (P1 à P5).

Partout, « pop », « whip » et « icarien » ajoutent « dynamique » (ADR 0032). Le retrait d'une étiquette de la liste est impossible tant qu'une **transition publiée** (Catalogue) ou une **proposition en attente** (Contribution) la porte, et le refus les liste (L10). Ce contrôle traverse les deux contextes et doit tenir sous concurrence : une proposition qui choisit « vrille » pendant que « vrille » est retirée ne doit pas laisser une proposition en attente porter une étiquette hors de la liste.

Le type `Error` du domaine (`Code`, `Message`) ne porte aucune donnée, or le refus d'un retrait doit lister les transitions et les propositions concernées.

## Options envisagées
Représentation :
1. table d'association (`catalog.transition_tags`) avec clés étrangères : intégrité en base, mais remplacer l'ensemble d'une transition en « dernier l'emporte » demande de verrouiller la transition, et la contribution ne peut pas référencer le schéma `catalog` (ADR 0028) ;
2. **colonne tableau `uuid[]`** sur la transition et sur la proposition (ensembles proposé et retenu) : l'ensemble est une valeur de l'agrégat, écrite en une seule ligne (le dernier l'emporte naturellement), index GIN pour retrouver les porteurs.

Application de l'implication et de l'appartenance à la liste :
- A. dupliquer la règle dans Contribution : dérive assurée ;
- B. **la liste choisit** (`TagList.Choose` → `TagChoice`, ADR 0032) ; Contribution l'obtient par un port anti-corruption, le Catalogue revérifie à la publication.

Retrait conditionnel :
- a. le Catalogue lit les propositions en attente par un port (Contribution devient fournisseur d'une lecture pour le Catalogue) ;
- b. Contribution « réserve » ses étiquettes auprès du Catalogue (compteurs tenus à chaque soumission et décision) : état dupliqué, compensations ;
- c. événements : le retrait ne peut pas attendre une cohérence à terme.

Concurrence :
- verrou consultatif par étiquette : chaque écriture prend un verrou par étiquette choisie, triées ;
- **un seul verrou consultatif `tag-list`, partagé ou exclusif** : toute écriture qui pose des étiquettes le prend en mode partagé (elles ne se bloquent pas entre elles), le retrait en mode exclusif.

## Décision
**Options 2, B, a, et le verrou `tag-list` partagé ou exclusif.**

Catalogue :
- `Transition` gagne `Tags : TagSet` ; `Publish(…, TagChoice tags, …)` vérifie la pose de départ, la pose d'arrivée, **les étiquettes** (`catalog.tag-not-in-list`), puis la place ; `TransitionPublished` porte les étiquettes ;
- `Transition.Tag(TagChoice tags, now)` remplace l'ensemble (vide permis) → `catalog.tag-not-in-list` ; événement `TransitionTagged` ; pas de version, pas d'auteur, pas d'historique ;
- commande `TagTransition(TransitionId, IReadOnlyCollection<TagId>)` : transition introuvable (`catalog.transition-not-found`), choix par `TagList.Choose`, `Transition.Tag`, sous le verrou `tag-list` partagé ;
- `PublishTransition` reçoit les identifiants choisis et refait le choix par la liste (idempotent : un ensemble déjà complété reste identique) ;
- commande `RemoveTag(TagId)` : sous le verrou `tag-list` **exclusif**, lit les porteurs (port `ITagCarriersReader` pour les transitions publiées du Catalogue, port `IPendingTagCarriers` pour les propositions en attente), construit `TagCarriers` et appelle `TagList.Remove` ;
- port `ITagListLock` (`Shared(work)`, `Exclusive(work)`), adaptateur `PgTagListLock` : `pg_advisory_xact_lock_shared` / `pg_advisory_xact_lock` sur `hashtextextended('tag-list', 0)` (mécanique `AdvisoryLocks`, ADR 0029).

Contribution :
- `ProposedTransition` et `RetainedTransition` gagnent `Tags : TagSet` ; `TransitionAdjustments` gagne un ajustement d'étiquettes à deux états (inchangé ; remplacé par un `TagChoice`, vide compris) ;
- `TransitionProposal.Submit(…, TagChoice tags, …)` : pose de départ, pose d'arrivée, **étiquettes** (`contribution.tag-not-in-list`), place ; `Accept` : règles de décision, étiquettes retenues hors liste (`contribution.tag-not-in-list`), cohérence du message, place ;
- `RetainedTransition.AdjustmentsFrom` ajoute `TransitionTagsAdjustment(TagSet Proposed, TagSet Retained)` quand les **ensembles complétés** diffèrent : un autre ordre, ou « dynamique » retirée alors que « pop » reste, n'est pas un ajustement ;
- ports `ICatalogTags.Choose(IReadOnlyCollection<TagId>)` → `TagChoice` (query `ChooseTags` du Catalogue) et `ICatalogTags.NamesOf(TagSet)` → `IReadOnlyDictionary<TagId, TagName>`, étiquettes retirées comprises (query `GetTagNames`), en un lot pour toute la file ou toute la liste « Mes propositions » ;
- `PgTransitionReservation` prend, après le verrou du couple de poses, le verrou `tag-list` **partagé** : proposition, publication directe et acceptation choisissent leurs étiquettes à l'intérieur ;
- query `GetPendingTransitionProposalsCarryingTag(TagId)`, exposée au Catalogue par l'adaptateur `ContributionPendingTagCarriers` (`Infrastructure.ContextIntegration`) : identifiant, poses (identifiants) et nom ; le Catalogue y joint les noms actuels des poses.
- `ICatalogPublisher.PublishTransition` transmet les étiquettes retenues ; `catalog.tag-not-in-list` → `contribution.tag-not-in-list`.

Ordre des verrous : couple de poses, puis `tag-list` partagé ; le retrait ne prend que `tag-list` exclusif. Aucun cycle, donc aucun interblocage.

Persistance (migration `AddTags`, avec la liste de l'ADR 0032) : `catalog.transitions.tag_ids uuid[] NOT NULL DEFAULT '{}'` (index GIN) ; `contribution.transition_proposals.proposed_tag_ids uuid[] NOT NULL DEFAULT '{}'` (index GIN partiel `WHERE status = 'pending'`) et `retained_tag_ids uuid[] NULL` (renseigné avec la décision d'acceptation). Les transitions déjà publiées et les propositions existantes reçoivent un ensemble vide (P1).

Erreurs porteuses de détails : `Error` devient un record **non scellé** ; les refus qui doivent en dire plus en dérivent : `TagCarriedError(TagCarriers)`, `TagImpliedError(IReadOnlyList<TagId> impliedBy)`, `TagNotInListError(TagSet tags)` (Catalogue) et son pendant Contribution. Le code reste stable et la correspondance HTTP les traduit en extensions de ProblemDetails (ADR 0034).

## Conséquences
- Pas de clé étrangère des transitions vers les étiquettes : l'appartenance à la liste est garantie par le choix (`TagList.Choose`), par la revérification du Catalogue à la publication et par le verrou ; un test d'intégration vérifie qu'un retrait et une proposition simultanés ne laissent jamais une proposition en attente porter une étiquette retirée.
- Relation nouvelle : le Catalogue lit une donnée de Contribution (propositions en attente qui portent une étiquette). Elle est étroite, en lecture seule, isolée derrière un port du Catalogue et un adaptateur d'intégration ; la context map la documente.
- Toute future écriture d'étiquettes (étiquettes des poses, modification d'une transition) devra prendre le verrou `tag-list` partagé et alimenter `TagCarriers`.
- Un étiquetage direct ne touche pas la proposition d'origine : « Mes propositions » continue de présenter la transition retenue à l'acceptation (Q143).
- Rendre `Error` non scellé : les comparaisons d'égalité existantes (`error == XErrors.Y`) restent valables pour les erreurs simples ; une erreur dérivée ne se compare qu'à son code.
