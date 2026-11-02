# 0007. Conventions du contrat HTTP et persistance modulaire

- Statut : proposé
- Date : 2026-11-02

## Contexte
Première ressource exposée (`GET /catalog/poses`) : il faut fixer des conventions réutilisables par tous les contextes, et la façon de stocker les données d'un monolithe modulaire (un module par contexte délimité).

## Décision
**Contrat HTTP**
- Routes préfixées par le contexte (`/catalog/...`).
- Les énumérations métier sont exposées en **codes chaîne stables en anglais** (`discovery|beginner|intermediate|advanced`), déclarés comme enum dans l'OpenAPI. Les libellés (français) sont produits côté front par `@acrofunjam/core`, partagés par le web et le mobile.
- Les listes sont **enveloppées** (`{ "poses": [...] }`) pour pouvoir ajouter pagination et métadonnées sans casser le contrat ; une liste vide renvoie `200` avec un tableau vide.
- L'ordre d'une liste, quand il est spécifié par le métier, est **garanti par l'API** ; la règle de tri vit dans le domaine.
- Les erreurs métier attendues sont converties en ProblemDetails par l'Api.

**Persistance**
- Un **schéma PostgreSQL par contexte** (`catalog`, …) dans la même base et le même `DbContext` tant que le monolithe reste modulaire.
- Les lectures peuvent projeter directement en modèle de lecture (CQRS léger) ; un agrégat n'est créé que lorsqu'un comportement d'écriture l'exige.

## Conséquences
- Ajouter une valeur d'énumération est un changement de contrat : régénérer le client (`npm run generate`) et compléter les libellés.
- Un éventuel découpage en services se fera schéma par schéma.
