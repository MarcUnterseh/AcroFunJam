---
name: bootstrap
description: Génère le squelette du projet (solution .NET en clean architecture avec ses projets de tests, monorepo front avec web React/Vite, mobile Expo et packages partagés, outillage de tests, BDD, lint et architecture). À lancer une seule fois, quand api/AcroFunJam.slnx ou front/package.json n'existent pas encore.
disable-model-invocation: true
---

# /bootstrap : squelette du projet

Prérequis vérifiés : .NET SDK 10, Node 26, npm. Avance étape par étape et vérifie que chaque étape **compile et que ses tests passent** avant de passer à la suivante. Le garde TDD ne s'applique pas au squelette : crée `.claude/.state/tdd-guard-off` au début et **supprime-le à la fin**.

Avant d'ajouter un package, vérifie son nom exact et sa dernière version stable (`dotnet package search <nom>`, `npm view <nom> version`). Ne devine pas de version.

## 1. API

```bash
cd api
dotnet new sln -n AcroFunJam            # produit AcroFunJam.slnx
dotnet new classlib -n AcroFunJam.Domain          -o src/AcroFunJam.Domain
dotnet new classlib -n AcroFunJam.Application     -o src/AcroFunJam.Application
dotnet new classlib -n AcroFunJam.Infrastructure  -o src/AcroFunJam.Infrastructure
dotnet new web      -n AcroFunJam.Api             -o src/AcroFunJam.Api
# Tests : xUnit v3 (installer le template xunit.v3.templates si absent)
for p in Domain Application Infrastructure Architecture; do dotnet new xunit3 -n AcroFunJam.$p.Tests -o tests/AcroFunJam.$p.Tests; done
dotnet new xunit3 -n AcroFunJam.Specs -o tests/AcroFunJam.Specs
```
- Références : Application → Domain ; Infrastructure → Application ; Api → Application + Infrastructure ; chaque projet de tests → sa couche ; Architecture.Tests → toutes ; Specs → Api.
- Supprime les `Class1.cs` et `UnitTest1.cs` générés.
- `Directory.Build.props` : `net10.0`, `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`, `<AnalysisLevel>latest-recommended</AnalysisLevel>`.
- `Directory.Packages.props` : gestion centralisée des versions.
- Packages de tests : `Shouldly` ; Application.Tests : rien d'autre (fakes écrits à la main) ; Infrastructure.Tests : `Testcontainers.PostgreSql` ; Architecture.Tests : `TngTech.ArchUnitNET.xUnitV3` (ou `NetArchTest.Rules` si indisponible) ; Specs : `Reqnroll.xunit.v3` (vérifier le nom) + `Microsoft.AspNetCore.Mvc.Testing`.
- Infrastructure : `Npgsql.EntityFrameworkCore.PostgreSQL`. Api : `Microsoft.AspNetCore.OpenApi`, `Scalar.AspNetCore`.
- `InternalsVisibleTo` d'Application vers `AcroFunJam.Application.Tests` (handlers `internal sealed`).
- Dans `AcroFunJam.Api`, ajoute `public partial class Program;` pour `WebApplicationFactory`.
- Specs : relie les features partagées dans le csproj, puis **vérifie** que Reqnroll génère bien les classes de test :
  ```xml
  <ItemGroup>
    <None Include="..\..\..\specs\features\**\*.feature" Link="Features\%(RecursiveDir)%(Filename)%(Extension)" />
  </ItemGroup>
  ```
  Si le lien ne fonctionne pas avec la version de Reqnroll, utilise l'item `ReqnrollFeatureFiles` documenté, ou, en dernier recours, une cible MSBuild de copie ; documente le choix dans un ADR. Filtre de tags `@api and not @wip` via `reqnroll.json` ou un hook `BeforeScenario` qui ignore `@wip`.
- Building blocks de `Domain/Common` (voir skill `ddd-patterns`) **en TDD** : supprime d'abord `tdd-guard-off` pour cette partie.
- `AcroFunJam.Architecture.Tests` : un test par règle listée dans le skill `clean-architecture`.
- `api/.config/dotnet-tools.json` (`dotnet new tool-manifest`) ; `dotnet-ef` si nécessaire.
- Vérifie : `dotnet build api/AcroFunJam.slnx` puis `dotnet test api/AcroFunJam.slnx`.

## 2. Front

```bash
mkdir front && cd front
npm init -y   # puis "private": true, "workspaces": ["packages/*", "apps/*"]
```
- Racine : `typescript`, `vitest`, `eslint`, `typescript-eslint`, `prettier`, `dependency-cruiser` en devDependencies. Scripts :
  - `"test": "npm run test --workspaces --if-present"`
  - `"lint": "eslint . && depcruise packages apps --config .dependency-cruiser.cjs"`
  - `"typecheck": "tsc -b"`
- `tsconfig.base.json` en mode strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), avec des project references.
- `packages/core` (`@acrofunjam/core`) : `src/domain/common/result.ts`, `src/application/`, Vitest (environnement node). Aucune dépendance runtime.
- `packages/api-client` (`@acrofunjam/api-client`) : `openapi-typescript` (dev) + `openapi-fetch` ; script `generate` qui lit `http://localhost:5xxx/openapi/v1.json` ou un fichier exporté.
- `packages/ui-tokens`.
- `apps/web` : `npm create vite@latest web -- --template react-ts` ; ajoute `@tanstack/react-query`, Vitest + `@testing-library/react` + `jsdom`, `@playwright/test` + `playwright-bdd` (config pointant sur `../../../specs/features`, tags `@web and not @wip`, langue `fr`), et un script `e2e`.
- `apps/mobile` : `npx create-expo-app@latest mobile --template default` (TypeScript, Expo Router) ; ajoute `@tanstack/react-query`, `jest-expo` + `@testing-library/react-native` et un script `test`. Crée `e2e/` pour les flows Maestro, avec un README qui explique l'installation de Maestro et `maestro test e2e/`. Builds de stores : EAS (`eas.json`, profils development, preview et production) pour Android et iOS.
- `.dependency-cruiser.cjs` : règles `no-circular`, `core-domain-is-pure`, `core-application-only-domain`, `api-client-not-apps`, `apps-not-cross-import` (cf. skill `clean-architecture`).
- Vérifie : `npm install`, `npm test`, `npm run lint`, `npm run typecheck` depuis `front/`.

## 3. Transverse
- `.github/workflows/ci.yml` (ou GitLab CI, à demander à l'utilisateur) : jobs `api` (build et test, y compris Integration avec service Docker), `front` (lint, typecheck, test) et `e2e-web` (playwright-bdd).
- `docker-compose.yml` : PostgreSQL pour le développement local.
- Mets à jour `CLAUDE.md` (commandes réelles) et ajoute un ADR si un choix diffère des ADR existants.
- Supprime `.claude/.state/tdd-guard-off`.

## Fin
Résume l'arborescence créée, les versions installées et les commandes vérifiées (avec leur résultat réel).
