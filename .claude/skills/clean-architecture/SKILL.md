---
name: clean-architecture
description: Organisation en couches de l'API C# et du monorepo front TypeScript, règle de dépendance, emplacement de chaque type de code, cas d'usage CQRS sans MediatR, tests d'architecture. À consulter avant de créer un fichier ou de décider où placer du code.
user-invocable: false
---

# Clean architecture du projet

## API (.NET)

```
api/
├── AcroFunJam.slnx
├── Directory.Build.props          # net10.0, Nullable, TreatWarningsAsErrors, analyzers
├── Directory.Packages.props       # versions centralisées
├── src/
│   ├── AcroFunJam.Domain/         # aucune PackageReference (sauf exception justifiée par un ADR)
│   │   ├── Common/                # Entity, AggregateRoot, Result, Error, IDomainEvent
│   │   └── <Contexte>/            # agrégats, VO, événements, erreurs, services de domaine
│   ├── AcroFunJam.Application/    # → Domain
│   │   ├── Common/                # ICommandHandler<,>, IQueryHandler<,>, IUnitOfWork, IClock…
│   │   └── <Contexte>/<CasDUsage>/  # XxxCommand, XxxHandler, ports (IXxxRepository), DTO de lecture
│   ├── AcroFunJam.Infrastructure/ # → Application, Domain
│   │   ├── Persistence/           # DbContext, configurations EF, repositories, migrations
│   │   └── <Adaptateurs externes>/
│   └── AcroFunJam.Api/            # → Application, Infrastructure (composition root uniquement)
│       ├── Endpoints/<Contexte>/  # minimal APIs minces : mapping HTTP ⇄ commande/query, Result → ProblemDetails
│       └── Program.cs
└── tests/
    ├── AcroFunJam.Domain.Tests/
    ├── AcroFunJam.Application.Tests/       # handlers + fakes en mémoire des ports
    ├── AcroFunJam.Infrastructure.Tests/    # [Trait("Category","Integration")], Testcontainers PostgreSQL
    ├── AcroFunJam.Architecture.Tests/      # règles de dépendance (ArchUnitNET ou NetArchTest)
    └── AcroFunJam.Specs/                   # Reqnroll, scénarios @api, WebApplicationFactory
```

### Cas d'usage, sans MediatR
```csharp
public interface ICommandHandler<in TCommand, TResult> { Task<Result<TResult>> Handle(TCommand command, CancellationToken ct); }
public interface IQueryHandler<in TQuery, TResult>   { Task<Result<TResult>> Handle(TQuery query, CancellationToken ct); }
```
Un handler : charger l'agrégat via le port, appeler **un** comportement du domaine, sauvegarder via l'unit of work, retourner un `Result`. Aucune règle métier dans le handler.
Les handlers sont enregistrés par scan d'assembly (Scrutor) ou explicitement dans `DependencyInjection.cs`.
Les préoccupations transverses (logs, validation d'entrée, transactions) passent par des décorateurs.

### Endpoint type
```csharp
group.MapPost("/{id:guid}/registrations", async (Guid id, RegisterRequest body, ICommandHandler<RegisterToSession, RegistrationDto> handler, CancellationToken ct) =>
    (await handler.Handle(new RegisterToSession(new SessionId(id), body.ParticipantId), ct)).ToHttpResult());
```

### Tests d'architecture (obligatoires)
- Domain ne dépend d'aucun autre projet ni de `Microsoft.EntityFrameworkCore`, `Microsoft.AspNetCore` ou `System.Text.Json`.
- Application ne dépend ni d'Infrastructure ni d'Api.
- Les agrégats sont `sealed` et n'ont pas de setter public.
- Les classes `*Handler` sont dans Application et sont `internal sealed`.

## Front (TypeScript, workspaces npm)

```
front/
├── package.json                 # workspaces, scripts test/lint/typecheck
├── .dependency-cruiser.cjs      # règles de dépendance
├── packages/
│   ├── core/                    # @acrofunjam/core : AUCUNE dépendance runtime de framework
│   │   └── src/
│   │       ├── domain/<contexte>/       # VO, règles d'UX pures, Result
│   │       └── application/<contexte>/  # cas d'usage + ports (XxxGateway.ts / XxxPort.ts)
│   ├── api-client/              # @acrofunjam/api-client : client généré depuis l'OpenAPI (openapi-typescript + openapi-fetch) + adaptateurs qui implémentent les ports de core
│   └── ui-tokens/               # couleurs, typographie, espacements partagés web/mobile
└── apps/
    ├── web/                     # React + Vite, React Query ; e2e/ = playwright-bdd
    └── mobile/                  # Expo + Expo Router, React Query ; e2e/ = Maestro
```

Dépendances autorisées :
`apps/*` → `api-client`, `core`, `ui-tokens` ; `api-client` → `core` ; `core/application` → `core/domain` ; `core/domain` → rien.

- Les composants React n'appellent jamais `fetch` : ils passent par un hook qui invoque un cas d'usage de `core`, avec l'adaptateur injecté via un contexte (*composition root* dans `apps/*/src/main.tsx` / `app/_layout.tsx`).
- Tests : `core` en Vitest pur (sans DOM) avec des fakes des ports ; composants web avec Vitest + Testing Library ; composants mobile avec Jest + jest-expo + Testing Library React Native.
- dependency-cruiser fait échouer `npm run lint` si une règle est violée.

## Contrat API ⇄ front
L'API publie son OpenAPI (`Microsoft.AspNetCore.OpenApi`) ; `npm run generate --prefix front/packages/api-client` régénère les types. Les DTO HTTP ne fuient jamais dans `core` : l'adaptateur les mappe vers les types du domaine client.

## Où placer quoi ?
| Code | Emplacement |
|---|---|
| Règle métier, invariant | Domain (agrégat ou VO) |
| Orchestration d'un cas d'usage | Application (handler) |
| Interface vers l'extérieur (DB, mail, horloge) | Application (port) |
| Implémentation EF, HTTP, SMTP | Infrastructure |
| Mapping HTTP, auth, ProblemDetails | Api |
| Validation de saisie pour l'UX | core/domain (VO partagés) |
| Appel réseau front | api-client (adaptateur) |
| État d'écran, navigation | apps/* |
