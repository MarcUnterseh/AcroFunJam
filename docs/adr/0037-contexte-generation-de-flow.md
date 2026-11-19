# 0037. Contexte Génération de flow : graphe publié lu au Catalogue, recherche aléatoire bornée, contrat HTTP

- Statut : proposé
- Date : 2026-11-19
- Complète : [0002](0002-clean-architecture-et-ddd.md), [0007](0007-contrat-http-et-persistance-modulaire.md), [0015](0015-noyau-partage-catalogue-contribution.md), [0016](0016-integration-contribution-catalogue.md), [0034](0034-contrat-http-des-etiquettes.md), [0036](0036-etiquettes-d-une-pose-et-contrat-http.md)

## Contexte
Story 9 « Générer un flow » (decouverte.md, règles G1 à G17 et K1 à K9, décisions du 2026-11-19) : tout le monde, visiteur compris, tire au hasard dans le catalogue publié un flow exécutable d'exactement 1 à 10 transitions, sous deux plafonds de difficulté (base, flyer) appliqués à chaque pose et à chaque transition, avec des étiquettes demandées (OU, par étape : la transition ou sa pose d'arrivée) et des étiquettes exclues (aucune pose ni transition). Une pose peut revenir, une transition (washing machine comprise) sert au plus une fois. Rien n'est enregistré. Deux échecs distincts : « critères trop restrictifs » et « catalogue insuffisant » (aucun flow de 1 à 10 transitions, même sans critère de difficulté ni d'étiquette). La context map prévoyait un contexte core `FlowGeneration` avec un modèle `FlowGraph` minimal, sans nom, lu par `IPublishedGraphSource` ; or la présentation du flow a besoin des noms, des descriptions, des difficultés et des étiquettes (Q182).

## Options envisagées
1. **Où vit la génération** : (a) contexte `FlowGeneration` ; (b) une query du Catalogue.
2. **Présentation du flow** : (a) `FlowGraph` porte noms et descriptions ; (b) `FlowGraph` minimal, puis seconde lecture du Catalogue pour les seuls éléments tirés ; (c) `FlowGraph` minimal dans le domaine, et une seule lecture du Catalogue qui livre, à côté du graphe, les détails de présentation (modèle de lecture de la couche Application).
3. **Algorithme** : (a) énumérer tous les flows possibles puis en tirer un (uniforme, mais exponentiel : un catalogue de 200 transitions dépasse vite le million de chemins de longueur 10) ; (b) parcours en profondeur aléatoire avec retour arrière, élagué par une table d'atteignabilité, sous un budget d'exploration ; (c) marche aléatoire simple avec nouvelles tentatives (incomplète : un « trop restrictifs » pourrait être faux).
4. **Verbe HTTP** : (a) `GET` avec les critères en paramètres d'adresse ; (b) `POST` d'un corps de critères.

## Décision
**1(a), 2(c), 3(b), 4(b).**

### Contexte et relations
- Contexte **Génération de flow** (`FlowGeneration`), core, **sans état ni persistance** : ni agrégat, ni repository, ni événement de domaine (rien ne change, rien n'est enregistré). Dossiers `Domain/FlowGeneration`, `Application/FlowGeneration`, `Api/Endpoints/FlowGeneration` ; `specs/features/generation-de-flow/`.
- **Catalogue → Génération de flow : Open Host Service + Published Language**, en lecture seule. Le Catalogue publie une query `GetPublishedGraph` (port `IPublishedGraphReader`, adaptateur EF qui projette `catalog.poses`, `catalog.transitions` et la liste des étiquettes) ; la Génération de flow la consomme par son port `IPublishedGraphSource`, implémenté par la couche anti-corruption `CatalogPublishedGraph` (`Infrastructure.ContextIntegration`), qui traduit les identifiants du Catalogue (`PoseId`, `TransitionId`) en `FlowPoseId`, `FlowTransitionId`. Seul le publié est lu : une proposition en attente n'existe pas pour la génération (G10).
- **Noyau partagé, en conformiste** : la Génération de flow réutilise `DifficultyLevel`, `Difficulty`, `FlowBoundaries`, `TagId`, `TagSet` et, dans son modèle de lecture, `PoseName`, `TransitionName`, `TransitionDescription`, `TagName` ; elle n'en est pas copropriétaire (ADR 0015 inchangé : propriété du Catalogue). Le test d'isolation des contextes l'autorise déjà.
- Les **implications** d'étiquettes ne sont pas recalculées : les ensembles d'étiquettes publiés sont déjà complétés par la liste (`TagChoice`, ADR 0033), si bien qu'exclure « dynamique » écarte « pop », « whip », « icarien » par simple intersection. Le scénario K6 « dynamique » garde cette dépendance.

### Modèle (domaine `FlowGeneration`)
- Value objects : `FlowLength` (1 à 10), `DifficultyCeiling` (plafonds base et flyer, « au plus » inclusif, `Admits(Difficulty)`), `TagCriteria` (étiquettes demandées et exclues, `Admits(TagSet)` pour une pose ou une transition, `IsSatisfiedBy(transition, pose d'arrivée)` pour une étape), `FlowCriteria` (les trois) ; `FlowGraph` (nœuds `FlowPose` : indicateurs, difficulté, étiquettes ; arêtes `FlowTransition` : poses, difficulté, étiquettes ; ensemble des étiquettes de la liste), `Flow` (départ et étapes `FlowStep`, chaînées, sans transition répétée).
- Service de domaine sans état `FlowGenerator.Generate(FlowGraph, FlowCriteria, IRandomSource) → Result<Flow>`, dans cet ordre : étiquettes hors de la liste (`flow-generation.tag-not-in-list`), catalogue insuffisant, puis recherche dans le graphe restreint par les critères (`flow-generation.criteria-too-restrictive` si elle échoue).
- La règle des étiquettes demandées ne dépend que de la transition et de sa pose d'arrivée : toutes les contraintes deviennent des **filtres de nœuds et d'arêtes** (`FlowGraph.RestrictedTo(FlowCriteria)`), et la recherche ne garde que la structure (longueur exacte, début, fin, transitions distinctes).
- **Catalogue insuffisant** = le plus court flow du graphe non restreint (au moins une transition, d'une pose « peut commencer » vers une pose « peut terminer ») est absent ou dépasse 10 transitions. Un plus court chemin ne répète jamais une transition : un parcours en largeur suffit, exact.
- Source de hasard **injectable** (`IRandomSource.NextIndex(count)`, abstraction du domaine) ; adaptateur `SystemRandomSource` (`Random.Shared`) ; aucune graine exposée (Q195).

### Algorithme
1. Restreindre le graphe aux poses et transitions admises par les plafonds et les exclusions, et aux transitions dont l'étape est conforme aux étiquettes demandées.
2. Table d'atteignabilité `peutFinir[r][p]` : existe-t-il, depuis la pose `p`, une marche d'exactement `r` transitions vers une pose « peut terminer » (programmation dynamique, `r` ≤ 10, coût O(L × T)), en ignorant la règle « une transition au plus une fois ».
3. Parcours en profondeur depuis les poses « peut commencer » admises avec `peutFinir[L][p]`, en **mélangeant** les candidats à chaque niveau par la source de hasard, en ne descendant que dans les transitions encore inutilisées vers une pose `q` avec `peutFinir[r-1][q]`, et en revenant en arrière sur une impasse. Le premier chemin complet est le flow.
4. Tout flow possible peut sortir (chaque chemin a une probabilité non nulle), sans garantie d'uniformité (Q194).
5. **Limites** : longueur ≤ 10 ; l'élagage rend les impasses rares (elles ne naissent que de la règle de non-répétition) ; un **budget d'exploration** (100 000 transitions essayées, réglable) borne le pire cas, et son épuisement est traité comme « critères trop restrictifs » et journalisé. Le graphe entier est lu à chaque génération : acceptable jusqu'à quelques milliers de poses et transitions ; au-delà, une projection alimentée par les événements du Catalogue (context map) ou un cache court.

### Présentation (option 2c)
- `IPublishedGraphSource.Read()` renvoie un `PublishedGraph` (modèle de lecture de `Application/FlowGeneration`) : le `FlowGraph` du domaine et les **détails de présentation** (`FlowElementDetails` : nom de chaque pose, nom et description de chaque transition, étiquettes de chaque élément avec leur nom, dans l'ordre du catalogue), lus **en une seule fois**, idéalement dans un instantané en lecture seule (`REPEATABLE READ`). Le flow présenté est donc exactement celui que le générateur a vérifié : mêmes difficultés, mêmes étiquettes.
- Le handler `GenerateFlowHandler` compose le `GeneratedFlow` (départ, puis étapes numérotées : transition, washing machine ou non, pose d'arrivée) à partir du `Flow` et des détails. Le domaine reste sans nom.

### Contrat HTTP (complète l'ADR 0007)
- `POST /flow-generation/flows`, **anonyme**. `POST` : les critères forment un corps typé (listes d'étiquettes), rien n'est mis en cache par erreur, et « Générer un autre flow » renvoie la même requête ; l'adresse partageable est celle de la page du site (`/generer-un-flow?…`), pas celle de l'API. Réponse **200** (rien n'est créé).
- Corps : `{ "length": 3, "baseDifficultyCeiling": "beginner", "flyerDifficultyCeiling": "beginner", "requestedTagIds": [], "excludedTagIds": [] }` ; les listes sont facultatives (absentes ou `null` : aucune).
- Réponse : `{ "start": P, "steps": [ { "number": 1, "transition": { "id", "name": string | null, "baseDifficulty", "flyerDifficulty", "description": string | null, "tags": [ { "id", "name" } ] }, "isWashingMachine": bool, "arrival": P } ] }`, avec `P = { "id", "name", "baseDifficulty", "flyerDifficulty", "tags": [ { "id", "name" } ] }` ; étiquettes dans l'ordre du catalogue, complétées (« dynamique, pop »).
- Erreurs (ProblemDetails, code dans `title`) :
  - 400 `flow-generation.length-required`, `flow-generation.length-out-of-range`, `flow-generation.base-difficulty-ceiling-required`, `flow-generation.flyer-difficulty-ceiling-required`, `pose.unknown-difficulty-level` (code du noyau partagé, comme pour les transitions) ;
  - 409 `flow-generation.tag-not-in-list`, extension `tagIds` (comme `catalog.tag-not-in-list`) : le site nomme l'étiquette retirée et garde les critères ;
  - 422 `flow-generation.criteria-too-restrictive` et `flow-generation.catalog-insufficient` (règle métier, statut par défaut de `ProblemResults`). Une même étiquette demandée et exclue donne `criteria-too-restrictive` (Q190).
- Ordre des contrôles : longueur, plafond base, plafond flyer, étiquettes hors de la liste, catalogue insuffisant, critères trop restrictifs.

## Conséquences
- Positif : le Catalogue reste la seule source du publié et ne porte aucun algorithme ; la génération est testable sans base (graphe en mémoire, hasard scripté) ; les critères pourront grossir (pose imposée, duo, répertoire) en ajoutant des filtres au graphe restreint.
- Négatif : chaque génération lit tout le catalogue publié, descriptions comprises ; le générateur fait confiance aux ensembles d'étiquettes complétés par la liste.
- À surveiller : temps de réponse de `GetPublishedGraph` quand le catalogue grossit (projection si besoin) ; budget d'exploration jamais atteint en pratique (journal) ; un flow exact plus « juste » (tirage uniforme) reste possible plus tard par comptage de chemins, sans changer le contrat.
