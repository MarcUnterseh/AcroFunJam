# 0001. Stack technique

- Statut : accepté
- Date : 2026-11-02

## Contexte
Le produit comprend une API, un site web et une application mobile disponible sur Android et iOS. L'API est imposée en C#. Il faut limiter la duplication entre le site et l'app.

## Options envisagées
1. **React (Vite) + Expo (React Native), TypeScript, packages partagés** : un seul langage front, domaine client et client API partagés, écosystème mobile mature (EAS Build et mises à jour OTA), outillage de tests riche. Inconvénient : deux langages dans le dépôt (C# et TS).
2. **Blazor + .NET MAUI** : C# partout, contrats partagés avec l'API. Inconvénients : MAUI moins mature sur mobile, écosystème UI et tests e2e plus restreints.
3. **Flutter + site web séparé** : excellent rendu mobile, mais un troisième langage (Dart) et peu de partage avec le site.

## Décision
Option 1. API ASP.NET Core (.NET 10) + PostgreSQL ; front en monorepo npm workspaces : `apps/web` (React + Vite), `apps/mobile` (Expo + Expo Router), `packages/core`, `packages/api-client` (généré depuis l'OpenAPI), `packages/ui-tokens`.

## Conséquences
- Le contrat API ⇄ front est l'OpenAPI ; les types TS sont générés, jamais écrits à la main.
- Si le site exige du SEO ou du rendu serveur, réévaluer `apps/web` vers Next.js (les packages partagés restent valables).
