# 0002. Clean architecture et DDD

- Statut : accepté
- Date : 2026-11-02

## Contexte
On veut un domaine métier testable, indépendant des frameworks, et un code qui parle le langage métier.

## Décision
- Couches Domain → Application → Infrastructure → Api (API) ; core/domain → core/application → api-client → apps (front). Les dépendances pointent vers le domaine.
- DDD tactique : agrégats, value objects, événements de domaine, repositories (ports), erreurs métier via `Result`.
- Cas d'usage CQRS léger avec des interfaces `ICommandHandler` / `IQueryHandler` maison. **Pas de MediatR**, devenu commercial et inutile ici : des décorateurs couvrent les besoins transverses.
- Règles vérifiées par des tests d'architecture (ArchUnitNET), dependency-cruiser et le hook `architecture-guard`.

## Conséquences
Plus de types et de mapping qu'une architecture en couches classique ; en échange, un domaine testable sans infrastructure et des frameworks remplaçables.
