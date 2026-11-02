# 0005. Outillage du squelette (runner de tests, câblage Reqnroll, version de TypeScript)

- Statut : proposé
- Date : 2026-11-02

## Contexte
Le `/bootstrap` a révélé des contraintes d'outillage non couvertes par les ADR 0001 à 0004 :
- xUnit v3 4.x ne fonctionne plus qu'avec **Microsoft Testing Platform (MTP) v2** ; la syntaxe `--filter "Category!=Integration"` (VSTest) n'est plus disponible.
- Reqnroll n'interprète pas un item `None` lié comme fichier feature ; les scénarios vivent hors du projet (`specs/features`) et sont partagés entre trois runners.
- TypeScript 7 (compilateur natif) est sorti, mais typescript-eslint (`<6.1`) et openapi-typescript (`^5`) ne le supportent pas encore ; Expo SDK 58 cible TypeScript 6.0.

## Options envisagées
1. Rester sur VSTest (xUnit v3 3.x, `xunit.runner.visualstudio`) : garde l'ancienne syntaxe de filtre, mais fige xUnit sur une version en fin de vie.
2. **Adopter MTP** (`global.json` → `"test": { "runner": "Microsoft.Testing.Platform" }`) : runner natif de .NET 10, plus rapide ; nouvelle syntaxe de filtre.
3. Pour les features : copie par cible MSBuild (duplication, risque de divergence) **ou item documenté `ReqnrollFeatureFile`** avec `Link`.
4. TypeScript 7 partout (casse le lint et la génération du client) **ou TypeScript 6.0** partout.

## Décision
- **MTP v2** pour tous les projets de tests .NET. Filtres : `--filter-not-trait "Category=Integration"`. `--ignore-exit-code 8` est ajouté via `Directory.Build.props` pour qu'un projet sans test exécuté (couche encore vide, trait filtré) ne fasse pas échouer la suite.
- **Reqnroll** : `<ReqnrollFeatureFile Include="..\..\..\specs\features\**\*.feature" Link="Features\..." />` et `ReqnrollUseIntermediateOutputPathForCodeBehind=true` (le code généré va dans `obj/`, rien n'est écrit dans `specs/`). Le filtre `@api and not @wip` est appliqué par un hook `BeforeScenario` (`Hooks/TagFilterHooks.cs`) qui marque les autres scénarios comme ignorés.
- **TypeScript ~6.0.3** dans tout le monorepo, avec un `overrides` npm pour la dépendance pair d'openapi-typescript. Réévaluer TypeScript 7 quand typescript-eslint le supportera.
- Les packages `@acrofunjam/*` sont consommés **en source** (`exports` → `src/index.ts`) : pas d'étape de build interne ; Vite, Metro, Vitest et Jest transpilent directement.
- **playwright-bdd** : `featuresRoot` pointe sur `specs/features` ; `playwright test --pass-with-no-tests` tant qu'aucun scénario `@web` n'existe.
- CI : **GitHub Actions** (`.github/workflows/ci.yml`).

## Conséquences
- Les commandes de `CLAUDE.md` et du hook `run-tests-on-stop` utilisent la syntaxe MTP.
- Un scénario sans `@api` apparaît « ignoré » dans le rapport Reqnroll : c'est attendu.
- Surveiller : support de TypeScript 7 par typescript-eslint et openapi-typescript ; évolution de Reqnroll v4 (code-behind dans `obj/` par défaut).
