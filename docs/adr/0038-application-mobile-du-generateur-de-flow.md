# 0038. Application mobile du générateur de flow : navigation, adresse de l'API, flow gardé sur l'appareil, écran allumé, données Maestro

- Statut : proposé
- Date : 2026-11-19
- Complète : [0002](0002-clean-architecture-et-ddd.md), [0004](0004-strategie-de-tests.md), [0021](0021-couche-presentation-du-front-partage.md), [0037](0037-contexte-generation-de-flow.md)

## Contexte
Story 9b « Générer un flow sur mobile » (decouverte.md, règles M1 à M9, décisions du 2026-11-19). L'application (`front/apps/mobile`, Expo SDK 58, expo-router) n'est qu'un squelette. Elle doit : s'ouvrir sur le dernier flow gardé, sinon sur le générateur, « AcroFunJam » en en-tête, avec une navigation prête pour le catalogue et le compte (M1, Q212) ; garder le flow affiché et ses critères sur l'appareil, lisibles hors ligne (M3, Q214) ; proposer un moment de « Revenir au flow précédent » (M9) ; maintenir l'écran allumé quand le flow est au premier plan (Q215). Q218 et Q220 renvoient à cet ADR : l'adresse de l'API par profil de build, les données des scénarios Maestro.

## Options envisagées
1. **Où vit la règle « Revenir au flow précédent »** : (a) dans l'écran (état React) ; (b) dans `@acrofunjam/core`, fonctions pures du domaine et cas d'usage, l'application ne gardant que le minuteur.
2. **Navigation** : (a) une pile unique ; (b) des onglets dès la 9b ; (c) une pile racine et un groupe de routes `(generateur)`, à placer plus tard dans un groupe `(onglets)` sans changer les adresses.
3. **Stockage du flow gardé** : (a) `@react-native-async-storage/async-storage` ; (b) `expo-sqlite/kv-store` (clé-valeur d'Expo, API calquée sur `localStorage`, variantes synchrones) ; (c) un fichier JSON par `expo-file-system` ; (d) `expo-secure-store` (taille limitée, chiffrement inutile ici).
4. **Adresse de l'API** : (a) codée en dur par plateforme ; (b) variable `EXPO_PUBLIC_API_URL` par profil de build ; (c) saisie dans l'application.
5. **« AcroFunJam injoignable » dans Maestro** : (a) build dédié à adresse morte ; (b) adresse surchargée par lien profond dans un build de test ; (c) un relais TCP entre l'application et l'API, que le flow Maestro coupe et rétablit.

## Décision
**1(b), 2(c), 3(b), 4(b), 5(c)** (5(c) remplacé à l’implémentation par le mode avion, voir « Écarts »).

### Ce qui va dans `@acrofunjam/core` (partagé, réutilisable par le site)
- **Domaine** (`domain/flow-generation/shown-flow.ts`) : `ShownFlow` (un `GeneratedFlow` et ses `FlowCriteria`) et `ShownFlowState` (`shown`, `previous`, au plus un précédent). Fonctions pures : `showDrawn` (un flow différent devient affiché et l'ancien devient le précédent ; le même flow ressorti, selon `sameFlow`, ne laisse aucun précédent), `showPrevious` (rétablit flow et critères, plus de précédent), `forgetPrevious` (« Modifier les critères », tirage échoué, délai écoulé), `canShowPrevious`. Dans `flow-criteria.ts` : `fewerTransitions`, `moreTransitions`, bornés de 1 à 10 (compteur, M7).
- **Application** : port `LastShownFlowStore` (`load(): Promise<ShownFlow | null>`, `keep(ShownFlow): Promise<void>`, au mieux : un échec d'écriture n'empêche jamais d'afficher le flow) ; cas d'usage `lastShownFlow(store)` (M1, M3) et `drawFlow(gateway, store, state, criteria)` : en cas de succès, `showDrawn` puis `keep` du **seul** flow affiché (le précédent n'est jamais gardé, M9) ; en cas d'échec, le flow affiché reste, le précédent est oublié, rien n'est écrit (M6).
- **Présentation** (`flowGenerationLabels`, ADR 0021) : « Revenir au flow précédent », texte du message éphémère (Q223, proposé), noms accessibles du compteur, échec « mise à jour » sans le mot « site » (Q222).

### Ce qui reste dans l'application (adaptateurs, écrans)
- **Navigation** : `src/app/_layout.tsx`, pile racine, en-tête « AcroFunJam », composition root (passerelles d'`api-client`, magasin du flow gardé) ; groupe `src/app/(generateur)/` : `index.tsx` (critères) et `flow.tsx` (flow). À l'ouverture, l'écran de démarrage reste affiché le temps de lire le flow gardé ; s'il existe, la pile est `[critères, flow]` : le retour arrière depuis le flow présente ses critères, depuis les critères il quitte l'application. Le catalogue et le compte viendront en onglets (groupe `(onglets)`), sans changer ces adresses.
- **Adresse de l'API** : `EXPO_PUBLIC_API_URL`, lue une fois, par accès statique (`process.env.EXPO_PUBLIC_API_URL`, seule forme inlinée par Expo), dans `src/flow-generation/api-address.ts` (le seul contexte qui l’utilise pour l’instant), qui refuse une adresse absente ou invalide au démarrage. Profils de `eas.json` : `development` (API locale ; émulateur Android `http://10.0.2.2:5252`, simulateur iOS `http://localhost:5252`, appareil physique : adresse du poste dans `.env.local`), `preview` et `production` (adresses à fixer au déploiement), `e2e` (API de test, émulateur Android `http://10.0.2.2:5253`). Avec `expo start`, les fichiers `.env` / `.env.local` (non versionné) fournissent la valeur.
- **Flow gardé** : adaptateur `kvLastShownFlowStore` sur `expo-sqlite/kv-store`, une clé `flow-generation.last-shown-flow`, JSON versionné `{ "version": 1, "flow", "criteria" }`, descriptions comprises ; une valeur illisible ou d'une autre version vaut « aucun flow gardé ». Confirmé pour le SDK 58 (export par défaut `Storage` de `expo-sqlite/kv-store`).
- **Écran allumé** : `expo-keep-awake` (déjà présent par dépendance transitive, à déclarer par `npx expo install expo-keep-awake`), activé par `useFocusEffect` à l'arrivée sur l'écran du flow, relâché en le quittant ; le système le relâche en arrière-plan. Vérifié à la main (test Jest à ajouter), pas par Maestro.
- **Minuteur** du message éphémère : dans l'écran du flow ; à expiration, `forgetPrevious`.

### Données des scénarios Maestro (Q220)
- API réelle sur la base du `docker compose`, lancée avec un administrateur initial (ADR 0008).
- Un **lanceur** Node (`front/apps/mobile/e2e/run.mjs`) exécute chaque flow : remise à zéro du Catalogue et de Contribution (script SQL, la liste amorcée des étiquettes est gardée), préparation du catalogue du scénario par l'API publique en administrateur (publication directe, étiquetage) depuis un fichier `<flow>.catalog.json` voisin du flow, puis `maestro test`.
- Le build `e2e` vise un **relais TCP** démarré par le lanceur ; un flow Maestro le coupe (`runScript`, `http.post` vers le port de contrôle du relais) : l'adresse ne répond plus, « AcroFunJam est momentanément injoignable » ; il le rétablit pour « de nouveau joignable ». L'application ne contient aucun code de test.
- Chaque flow commence par `launchApp` avec `clearState: true` (aucun flow gardé) ; « fermer puis rouvrir » : `stopApp` puis `launchApp` sans effacer l'état. Sélecteurs par texte. Ces flows ne tournent pas encore en CI (émulateur requis) : lancement local, CI à décider plus tard.

## Conséquences
- Positif : la règle du flow précédent et le flow gardé sont testés sans écran (Vitest), réutilisables par le site ; l'application ne porte que des adaptateurs, des écrans et un minuteur ; les scénarios mobiles s'exécutent sur la vraie API, comme les specs `@api` (ADR 0009, 0020).
- Négatif : un lanceur à maintenir hors de Maestro (et un amorçage SQL lié au schéma) ; un build `e2e` en plus ; une dépendance native (`expo-sqlite`) ajoutée à l'application.
- À surveiller : le format gardé évolue avec `GeneratedFlow` (incrémenter `version`) ; l'adresse de production devra passer en HTTPS ; la durée et le texte du message éphémère (Q223).

## Écarts constatés à l'implémentation (2026-11-20)
- **Maestro** : « injoignable » est obtenu par le **mode avion** de l'émulateur (`setAirplaneMode`), pas par un relais TCP ; le lanceur rétablit le réseau avant chaque flow. L'option 5(c) est abandonnée.
- **Données des scénarios** : base dédiée `acrofunjam_e2e` (créée et migrée par le lanceur) et API de test sur le port 5253 (configuration `api-e2e` de `.claude/launch.json`), plutôt que la remise à zéro de la base de développement. Le catalogue de chaque scénario est **amorcé en SQL** (`catalog.poses`, `catalog.transitions`, étiquettes comprises) depuis `<flow>.catalog.json`, et non par l'API publique : plus rapide, mais dépendant du schéma EF (à revoir à chaque migration du Catalogue).
- **Sélecteurs** : par texte, et par `testID` (`id:`) pour les boutons de la barre d'actions, dont le libellé change pendant un tirage.
- **Délais d'accessibilité** : le lanceur porte à 120 s les délais d'accessibilité d'Android (`accessibility_interactive_ui_timeout_ms`, `accessibility_non_interactive_ui_timeout_ms`) pendant les flows, puis les restaure : le message « Revenir au flow précédent » suit `getRecommendedTimeoutMillis` et ne doit pas expirer pendant les assertions.
- **Hors ligne à la réouverture** : un build de développement recharge son bundle depuis Metro ; le flow concerné est dans `e2e/release/` et demande un build release.
- **CI** : les flows Maestro restent une **vérification manuelle** (émulateur requis) ; ils ne tournent pas dans `.github/workflows/ci.yml`.
- **Développement** : `LogBox.ignoreLogs(['Cannot connect to Expo CLI'])` sous `__DEV__`, le bandeau masquant la barre d'actions.
- **Revenir au flow précédent** : cas d'usage `showPreviousFlow(store, state)` dans le cœur ; le flow rétabli est aussi gardé sur l'appareil (au mieux).
- **Focus** : React Native 0.88 n'a plus `InteractionManager` ; le focus des lecteurs d'écran est posé après `focusDelayMillis` (300 ms), une fois la transition de la pile passée.
- **Profils** : `production` pointe sur `https://acrofunjam.fr` (ADR 0040) ; `preview` n'a pas encore d'adresse d'API ; l'écran de démarrage n'est pas encore retenu pendant la lecture du flow gardé.
- **Build Android sous Windows** : chemins longs activés (`LongPathsEnabled`), CMake 3.31.6 désigné par `cmake.dir` dans `android/local.properties` (généré, non versionné), `JAVA_HOME` sur le JDK embarqué d'Android Studio (`jbr`).
