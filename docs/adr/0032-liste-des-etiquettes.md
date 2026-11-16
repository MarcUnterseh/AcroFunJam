# 0032. Liste des étiquettes : agrégat `TagList` du Catalogue, implication portée par l'étiquette, amorçage unique

- Statut : proposé
- Date : 2026-11-13
- Complète : [0008](0008-identite-et-roles.md), [0015](0015-noyau-partage-catalogue-contribution.md), [0017](0017-cle-de-comparaison-et-unicite-du-nom.md), [0028](0028-transition-publiee-et-proposition-de-transition.md)

## Contexte
La story 8 « Étiquettes » (decouverte.md, décisions 1 à 9, et décisions mineures du 2026-11-13) crée la **liste fermée des étiquettes** du Catalogue :
- amorcée **une seule fois**, au premier déploiement, avec sept étiquettes et leurs descriptions ; un nouveau déploiement ne rétablit pas une étiquette retirée (L1) ;
- gérée par les validateurs et les administrateurs, sans proposition (nouvelle capacité « gérer les étiquettes »), consultable par tous (L2, L4) ;
- nom obligatoire, sans espaces superflus, 30 caractères au plus, unique au sens de la clé de comparaison du nom de pose ; description obligatoire, 200 caractères au plus ; ordre du catalogue sur le nom (L3, L5 à L7) ;
- renommage suivi partout (L8) : une transition et une proposition **référencent** leurs étiquettes ;
- « pop », « whip » et « icarien » ajoutent « dynamique », **même renommées** ; « dynamique » ne peut pas être retirée de la liste tant que l'une d'elles y figure ;
- retrait impossible tant qu'une transition publiée ou une proposition en attente porte l'étiquette (L10, voir ADR 0033).

Les noms se renomment : la règle d'implication ne peut pas s'appuyer sur un nom.

## Options envisagées
Frontière de cohérence :
1. **Un agrégat `Tag` par étiquette** (comme `Pose`) : unicité du nom par un index et une disponibilité fournie par le cas d'usage (ADR 0017). Mais l'implication (« dynamique » non retirable tant que « pop » existe, compléter un choix) et l'amorçage unique portent sur **toute la liste** : il faudrait les reconstituer dans les handlers.
2. **Un agrégat `TagList`** (singleton) qui contient les étiquettes : unicité, implication, retrait et choix sont des invariants internes. La liste est courte (une dizaine d'étiquettes) et rarement modifiée : la taille de l'agrégat et la contention sont négligeables.

Identification stable de l'implication :
- A. Identifiants fixes de « dynamique », « pop »… dans le code : constantes magiques, couplage du domaine à des données ;
- B. **Relation portée par l'étiquette** (`Tag.ImpliedTag : TagId?`), amorcée avec la liste : survit aux renommages, sans constante ; inerte si l'étiquette impliquée a été retirée (ce qui n'arrive que si celles qui l'impliquent l'ont été avant).

Retrait :
- a. suppression physique : un retrait n'est possible que si rien d'**actuel** ne porte l'étiquette, mais une proposition déjà décidée peut encore la référencer (étiquettes proposées d'une proposition refusée, ou ajustées). « Mes propositions » ne saurait plus la nommer et présenterait un faux ajustement (« dynamique → dynamique ») ;
- b. **retrait logique** : l'étiquette retirée sort de la liste (ni consultable, ni choisissable, son nom redevient libre) mais reste connue pour l'historique.

Amorçage :
- i. migration de données EF : exécutée une fois par base, mais figée dans la migration et impossible à rejouer dans les specs (Respawn vide les tables, pas l'historique des migrations) ;
- ii. **commande d'amorçage au démarrage**, idempotente, dont le marqueur est l'existence même de la liste, sur le modèle de l'amorçage du premier administrateur (ADR 0008).

## Décision
**Options 2, B, b et ii.**

Noyau partagé (ADR 0015, étendu), car Contribution présente et ordonne les étiquettes d'une transition comme le Catalogue :
- `TagId` ; `TagName` (`Create` → `tag.name-required`, `tag.name-without-letter-or-digit`, `tag.name-too-long` ; mêmes normalisation et calcul de clé que `PoseName`, fonctions internes du noyau, 30 points de code au plus) ; `TagNameKey` (même algorithme, type distinct) ; `TagName.CatalogOrder` (clé, puis nom exact) ; `TagContentErrors` ;
- `TagSet` : ensemble immuable de `TagId`, égalité indépendante de l'ordre, sans doublon (`Empty`, `Of`) ;
- `TagChoice(TagSet Tags, TagSet NotInList)` : résultat d'un choix d'étiquettes par la liste, les étiquettes reconnues **complétées de celles qu'elles impliquent**, et celles qui ne sont pas dans la liste ;
- `NamedTag(TagId, TagName)` et `TagSet.Present(IReadOnlyDictionary<TagId, TagName>)` → liste ordonnée par `TagName.CatalogOrder`.

Catalogue :
- `TagDescription` (`Create` → `tag.description-required`, `tag.description-too-long` ; espaces superflus retirés, y compris intérieurs, comme `ProposalText` ; 200 points de code au plus) ;
- entité `Tag` (`TagId`, `TagName`, `TagDescription`, `ImpliedTag : TagId?`, `RemovedAt : DateTimeOffset?`) ;
- agrégat `TagList` (identifiant fixe `TagListId.Catalog`) :
  - `Seed(InitialTagList, now)` → `TagListSeeded` ; `InitialTagList` (domaine) décrit les sept étiquettes, leurs descriptions et l'implication de « dynamique » par « pop », « whip » et « icarien » ;
  - `Add(id, name, description, now)` → `catalog.tag-name-taken` ; `TagAdded` ;
  - `Rename(id, name, now)` → `catalog.tag-not-found`, `catalog.tag-name-taken` (l'étiquette elle-même mise à part) ; `TagRenamed` ;
  - `Describe(id, description, now)` → `catalog.tag-not-found` ; `TagDescribed` ;
  - `Remove(id, TagCarriers carriers, now)` → `catalog.tag-not-found`, puis `catalog.tag-implied` (une étiquette de la liste l'implique), puis `catalog.tag-carried` (des transitions publiées ou des propositions en attente la portent, ADR 0033) ; `TagRemoved` ;
  - `Choose(IEnumerable<TagId>)` → `TagChoice` (une étiquette retirée n'est pas dans la liste) ;
  - `NamesOf(TagSet)` : noms des étiquettes, retirées comprises (historique).
- Commande `SeedInitialTagList` : sans effet si la liste existe déjà ; appelée au démarrage par un service hébergé de l'Api (`InitialTagListStartup`), avant le premier appel. Les cas d'usage de gestion créent une liste vide si elle n'existe pas (cas des specs, jamais en production).

Persistance : `catalog.tag_lists` (une ligne, `seeded_at`), `catalog.tags` (`name`, `name_key`, `description`, `implied_tag_id` clé étrangère vers `catalog.tags`, `removed_at`) ; contraintes `char_length(name) <= 30`, `name_key <> ''`, `char_length(description) <= 200`, `description <> ''` ; index unique partiel `ix_tags_name_key (name_key) WHERE removed_at IS NULL` → `catalog.tag-name-taken` (`CatalogUniqueConstraints`). Pas de jeton de concurrence sur la liste : les écritures concurrentes portent sur des lignes distinctes, l'index protège les noms, et le retrait est sérialisé (ADR 0033).

Identité : capacité `ManageTags` (code `manage-tags`, policy `CanManageTags`), accordée au validateur et donc à l'administrateur ; ordre des capacités : `propose`, `validate-proposals`, `manage-tags`, `manage-roles`. Le Catalogue n'a pas de notion d'acteur : la policy, qui relit le rôle courant à chaque appel, suffit (pas d'auteur enregistré, pas d'historique, décision 11).

## Conséquences
- « dynamique » reste dans la liste tant que « pop », « whip » ou « icarien » y sont ; si on les retire toutes, « dynamique » devient retirable. Une nouvelle étiquette « pop » créée après le retrait de l'ancienne n'implique rien : un nouveau sens est une nouvelle étiquette (charte). Aucun écran ne gère les implications : elles ne viennent que de l'amorçage.
- Le site connaît l'implication par le langage publié (`impliedTagId`) pour l'expliquer et cocher « dynamique » aussitôt (ADR 0034) ; l'API reste seule garante de la règle.
- Les étiquettes retirées s'accumulent dans `catalog.tags` : volume négligeable. Un nom retiré peut être repris par une nouvelle étiquette, d'identifiant distinct.
- Si un jour d'autres listes (étiquettes des poses, story 9) apparaissent, `TagList` pourra porter la cible (`transition`, `pose`) de chaque étiquette sans changer de frontière.
