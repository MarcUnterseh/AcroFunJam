# E2E mobile (Maestro)

Maestro ne lit pas le Gherkin : chaque scénario `@mobile` de `specs/features/**` a un flow YAML ici, **nommé d'après le
titre du scénario** (ADR 0003, skill `gherkin`), avec, s'il en faut un, le catalogue du scénario dans
`<flow>.catalog.json`.

**Vérification manuelle** : ces flows demandent un émulateur Android et ne tournent pas dans la CI GitHub (ADR 0038). Un
scénario `@mobile` perd son tag `@wip` quand son flow est passé sur l'émulateur.

## Installation (Windows)

- Android Studio, avec un émulateur (Device Manager) ; `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`, et dans le `Path`
  `%ANDROID_HOME%\platform-tools` et `%ANDROID_HOME%\emulator`.
- `JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr` (le Java d'Android Studio : son chemin ne change pas avec
  les mises à jour).
- Les chemins longs de Windows activés (`LongPathsEnabled`) et CMake 3.31 (SDK Tools d'Android Studio), indiqué à Gradle
  par `cmake.dir` dans `android/local.properties` : la compilation C++ de react-native-reanimated dépasse 260 caractères.
- Maestro : `curl -fsSL "https://get.maestro.mobile.dev" | bash` (dans Git Bash).

## Exécution

1. Docker (PostgreSQL), puis l'API de test : configuration de lancement `api-e2e` (port 5253, base `acrofunjam_e2e`, qui
   ne touche jamais la base de développement).
2. L'émulateur démarré, l'app installée une fois : `npx expo run:android`.
3. Metro, avec l'adresse de l'API de test vue depuis l'émulateur :
   ```powershell
   $env:EXPO_PUBLIC_API_URL = 'http://10.0.2.2:5253'; npx expo start --clear
   ```
4. Les flows :
   ```bash
   node e2e/run.mjs              # tous
   node e2e/run.mjs <flow>…      # certains, par leur nom de fichier sans .yaml
   ```

Le lanceur crée et migre la base `acrofunjam_e2e`, remplace le catalogue avant chaque flow, coupe le mode avion entre deux
flows et porte « Délai pour agir » (accessibilité Android) à 2 minutes pendant les passages : Maestro lit l'écran
lentement, et l'app garde « Revenir au flow précédent » le temps de ce réglage (Q223). « AcroFunJam injoignable » : les
flows mettent le téléphone en mode avion.

La mise en veille de l'ordinateur arrête l'API de test et Metro : relance-les avant un nouveau passage.

`release/` : les flows qui rouvrent l'app hors ligne ; ils demandent une version release (voir `release/README.md`).
