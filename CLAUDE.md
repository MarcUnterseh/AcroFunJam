# AcroFunJam — guide pour Claude

Produit composé de trois livrables qui partagent **un même langage métier** :

| Livrable | Stack | Dossier |
|---|---|---|
| API | C# / .NET 10, ASP.NET Core (minimal APIs), EF Core | `api/` |
| Site web | TypeScript, React + Vite | `front/apps/web` |
| App mobile (Android + iOS) | TypeScript, Expo (React Native) | `front/apps/mobile` |
| Code front partagé | TypeScript (domaine client, cas d'usage, client API) | `front/packages/*` |
| Spécifications exécutables | Gherkin (français) | `specs/features/` |

Les choix sont justifiés dans `docs/adr/`. Le langage omniprésent est dans `docs/domain/glossary.md`.

## Méthode de travail (non négociable)

1. **BDD d'abord** : toute fonctionnalité part d'une user story → *example mapping* → scénarios Gherkin dans `specs/features/<contexte>/`. Skill : `/feature`.
2. **Double boucle TDD** :
   - boucle externe : un scénario d'acceptation qui échoue ;
   - boucle interne : cycles **Red → Green → Refactor** unitaires jusqu'à ce que le scénario passe. Skill : `/tdd`.
3. **Jamais de code de production sans test qui échoue au préalable.** Le hook `tdd-guard` bloque la création d'un fichier du domaine ou de l'application sans test qui le référence.
4. **DDD** : modèle riche, invariants protégés par les agrégats, value objects plutôt que des types primitifs, événements de domaine. Référence : skill `ddd-patterns`.
5. **Clean architecture** : les dépendances pointent **vers le domaine**. Référence : skill `clean-architecture`. Le hook `architecture-guard` rejette les imports interdits ; des tests d'architecture le vérifient aussi en CI.
6. Mettre à jour `docs/domain/glossary.md` dès qu'un terme métier apparaît ou change.
7. Toute décision structurante → ADR (skill `/adr`).

## Règle de dépendance

```
API (C#)                                Front (TS)
Api ──► Infrastructure ──► Application ──► Domain      apps/web, apps/mobile ──► packages/api-client ──► packages/core/application ──► packages/core/domain
  └──────────────────────────► Application                    └───────────────────────────────────────► packages/core/application
```

- `Domain` : aucune dépendance (ni EF, ni ASP.NET, ni React, ni `fetch`).
- `Application` : cas d'usage (commands/queries + handlers), **ports** (interfaces) ; dépend uniquement du domaine.
- `Infrastructure` / `api-client` : adaptateurs qui implémentent les ports.
- `Api` / `apps/*` : présentation + *composition root* (injection de dépendances).

## Conventions

- Code, identifiants et noms de tests en **anglais** ; Gherkin, docs et glossaire en **français** (`# language: fr`).
- Noms de tests : `Method_Should_ExpectedBehavior_When_Condition` (C#) / `it("should … when …")` (TS).
- Tests unitaires : xUnit v3 + Shouldly (C#), Vitest (packages TS), Jest + jest-expo (mobile).
- Acceptation : Reqnroll (API), playwright-bdd (web), Maestro (mobile).
- Pas de MediatR : handlers simples injectés. Pas d'exceptions pour les erreurs métier attendues : type `Result`.
- Tags Gherkin : `@api`, `@web`, `@mobile` (cibles), `@wip` (en cours, exclu de la CI).
- Tests lents : `[Trait("Category", "Integration")]` (C#) ou fichier `*.int.test.ts`.

## Commandes

```bash
# Infra locale
docker compose up -d                 # PostgreSQL (Docker Desktop doit tourner, aussi pour Testcontainers)

# API (.NET 10, tests sur Microsoft Testing Platform, cf. ADR 0005)
dotnet build api/AcroFunJam.slnx
dotnet test --solution api/AcroFunJam.slnx --filter-not-trait "Category=Integration"   # rapide
dotnet test --solution api/AcroFunJam.slnx                                             # complet (Docker requis)
dotnet test --project api/tests/AcroFunJam.Domain.Tests                                # un seul projet
dotnet run --project api/src/AcroFunJam.Api --launch-profile http                      # http://localhost:5252 (/scalar, /openapi/v1.json)

# Front (TypeScript 6.0, workspaces npm)
npm install --prefix front
npm test --prefix front              # tous les tests unitaires (Vitest + Jest mobile)
npm run lint --prefix front          # ESLint + dependency-cruiser
npm run typecheck --prefix front     # tsc -b + tsc mobile
npm run generate --prefix front/packages/api-client   # régénère le contrat depuis l'API lancée (ou -- <fichier>)
npm run e2e --prefix front/apps/web  # playwright-bdd (une fois : npx playwright install chromium)
npm start --prefix front/apps/mobile # Expo ; e2e mobile : maestro test front/apps/mobile/e2e/
```

CI : `.github/workflows/ci.yml` (jobs `api`, `front`, `e2e-web`).

## Outillage Claude de ce dépôt

- **Agents** (`.claude/agents/`) : `acroyoga-expert` (confirme ou challenge ce que l'utilisateur dit du métier), `bdd-analyst`, `domain-expert`, `tdd-red`, `tdd-green`, `tdd-refactor`, `architecture-reviewer`.
- **Skills** (`.claude/skills/`) : `/feature`, `/tdd`, `/bootstrap`, `/new-bounded-context`, `/adr`, et les références `ddd-patterns`, `clean-architecture`, `gherkin`.
- **Hooks** (`.claude/hooks/`, configuration dans `.claude/hooks/config.json`) :
  - `session-context` : rappelle la phase TDD courante au démarrage ;
  - `tdd-guard` : bloque un nouveau fichier de production sans test ;
  - `architecture-guard` : rejette les imports qui violent la règle de dépendance ;
  - `format` : formate avec Prettier les fichiers TS modifiés ;
  - `run-tests-on-stop` : lance les tests rapides des zones modifiées avant de rendre la main.
- Phase TDD courante : `.claude/.state/tdd-phase` (`red` | `green` | `refactor`). En phase `red`, les tests en échec sont attendus et n'empêchent pas de s'arrêter.
- Désactiver ponctuellement le garde TDD (spike, code généré) : créer `.claude/.state/tdd-guard-off`, puis le supprimer.
