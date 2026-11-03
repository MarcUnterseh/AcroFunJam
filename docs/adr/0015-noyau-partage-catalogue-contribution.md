# 0015. Noyau partagé Catalogue / Contribution

- Statut : accepté
- Date : 2026-11-03

## Contexte
Une pose proposée doit être publiable telle quelle, et l'unicité de son nom s'apprécie **à travers** le catalogue et les propositions en attente, avec la même clé de comparaison. Les deux contextes manipulent donc exactement le même contenu de pose : nom, clé, difficulté base et flyer, indicateurs de flow. Jusqu'ici, `PoseName` et `DifficultyLevel` vivaient dans `Domain/Catalog`, et le test d'isolation interdit à Contribution d'y accéder.

## Options envisagées
1. **Noyau partagé** (*Shared Kernel*) : un seul code, donc une seule clé et une seule règle de contenu. Couple les deux contextes sur ce périmètre, ce qui est acceptable avec une seule équipe.
2. Duplication du contenu dans Contribution, traduite par l'ACL : isolation stricte, mais deux implémentations de la clé de comparaison qui dériveraient justement sur l'invariant commun.
3. Contribution appelle le Catalogue pour valider le contenu : le Catalogue deviendrait responsable de règles de saisie qui ne le concernent pas.

## Décision
- Option 1. `AcroFunJam.Domain.SharedKernel` contient `PoseName`, `PoseNameKey`, `DifficultyLevel` (avec `FromCode` / `ToCode`), `Difficulty`, `FlowBoundaries` et `PoseContentErrors` (codes `pose.*`). Côté front : `core/src/domain/shared-kernel` (étapes suivantes).
- Le noyau reste **minimal** : des value objects, ni agrégat, ni port, ni dépendance vers un contexte. Le Catalogue (core) en est le propriétaire.
- `PoseName` et `DifficultyLevel` quittent `Domain/Catalog` (refactoring sous tests verts).
- Un test d'architecture vérifie que `SharedKernel` ne dépend d'aucun contexte ; le test d'isolation des contextes autorise `Common` et `SharedKernel`.
- Côté front (story 3, étape C) : `core/src/domain/shared-kernel` contient `DifficultyLevel` (échelle et rang) et `pose-name` (`normalizePoseName`, `poseNamePolicy`, `poseNameLength` en points de code NFC, `checkPoseName`) ; ses libellés sont dans `core/src/presentation/shared-kernel`. La règle dependency-cruiser `bounded-contexts-isolated` interdit à `catalog`, `contribution` et `identity` de s'importer entre eux, dans chaque couche de `core` et dans `api-client` : seuls `shared-kernel` et `common` sont partagés. Un besoin entre contextes passe par les apps (composition root, `routes.tsx`) ou par un type déclaré du côté qui en a besoin (`ForgottenOnSignOut` dans Identity, capacités en chaînes dans `publishesDirectly`).
- Les codes de difficulté (`discovery`…) ont une seule correspondance, `DifficultyLevel.FromCode` / `ToCode`, utilisée par l'Infrastructure. L'Api garde son enum `DifficultyCode` (déclaré comme enum dans l'OpenAPI, ADR 0007), déplacé dans `Endpoints/Common`.

## Conséquences
- Toute évolution du noyau concerne les deux contextes : elle se fait avec leurs tests.
- Si une seconde équipe reprend un des contextes, il faudra réévaluer ce choix (passage à une duplication traduite par l'ACL).
