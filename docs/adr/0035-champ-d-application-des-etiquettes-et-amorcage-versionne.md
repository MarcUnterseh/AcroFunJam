# 0035. Champ d'application des étiquettes, choix par cible, amorçage versionné de la liste

- Statut : proposé
- Date : 2026-11-18
- Complète : [0032](0032-liste-des-etiquettes.md), [0033](0033-etiquettes-d-une-transition-et-retrait-conditionnel.md)

## Contexte
La story 9a « Étiqueter les poses » (decouverte.md, décisions du 2026-11-18) étend les étiquettes aux poses :
- toutes les étiquettes n'ont pas de sens pour une pose (« pop », « whip », « dynamique », « vrille » décrivent un mouvement) : chaque étiquette dit à quoi elle s'applique (poses, transitions, les deux), choix obligatoire à l'ajout, modifiable ;
- restreindre une étiquette est refusé tant qu'un élément de la cible retirée la porte, et l'implication doit rester cohérente (« pop » ajoute « dynamique » : « pop » ne s'applique que là où s'applique « dynamique ») ;
- au déploiement de la story, « inversion » et « lunaire » doivent s'étendre aux poses et recevoir une nouvelle description, sauf si un validateur l'a déjà changée ; la liste est déjà amorcée en production (ADR 0032 : le marqueur d'amorçage est l'existence de la liste).

## Options envisagées
1. **Toute la liste s'applique aux poses** : simple, mais permet « pop » sur une pose et brouille le futur générateur.
2. **Champ d'application porté par l'étiquette dans `TagList`, choix par cible** (`TagList.Choose(ids, TagTarget)`, `TagChoice.NotApplicable`) : l'agrégat garde tous les invariants (cible, implication, porteurs).
3. Deux listes séparées (poses, transitions) : duplique les étiquettes communes et leur renommage.

Pour l'amorçage :
- a. **Migration de données EF** qui modifie les deux étiquettes : invisible du domaine, non rejouable par les scénarios d'acceptation (Testcontainers sans amorçage).
- b. **Amorçage versionné dans le domaine** : `InitialTagList` décrit des révisions (1 : story 8 ; 2 : story 9a), `TagList.SeedRevision` marque la révision appliquée, `TagList.Upgrade` met une liste ancienne à niveau au démarrage.

## Décision
Option **2** et amorçage **b**.
- `TagScope` (value object, codes `poses`, `transitions`, `poses-and-transitions`) sur chaque `Tag` ; `TagTarget` (`Pose`, `Transition`) propre au Catalogue.
- `TagList.Choose(ids, cible)` renvoie `TagChoice(Tags, NotInList, NotApplicable)` ; une étiquette impliquée n'est ajoutée que si elle s'applique. Codes : `catalog.tag-not-applicable` et `contribution.tag-not-applicable` (409, extension `tagIds`), distincts de `tag-not-in-list`. Les transitions sont aussi choisies pour leur cible.
- `TagList.ChangeScope(id, scope, carriers)` : introuvable, puis implication (`catalog.tag-scope-exceeds-implied`, `catalog.tag-scope-needed-by-impliers` avec `impliedBy`), puis porteurs de la cible retirée (`catalog.tag-carried`).
- `TagList.Upgrade(revision)` : idempotent ; étend « inversion » et « lunaire » (retrouvées par la clé de leur nom) ; remplace leur description seulement si elle est restée celle de la révision 1 ; ne touche à aucune autre étiquette ; lève `TagListUpgraded`. Une liste existante prend `SeedRevision = 1` par migration, les étiquettes existantes le champ `transitions`.

## Conséquences
- Positif : un seul agrégat garantit cible, implication et porteurs ; l'amorçage se teste comme le reste du domaine et se rejoue dans les scénarios.
- Négatif : une « inversion » ou une « lunaire » renommée sous une autre clé n'est pas étendue par la mise à niveau (un validateur l'étend à la main depuis la page « Étiquettes »).
- À surveiller : chaque future révision de la liste amorcée ajoute une révision à `InitialTagList` ; le contrat `POST`/`PUT /catalog/tags` exige désormais `scope` (ADR 0036).
