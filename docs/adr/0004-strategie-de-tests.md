# 0004. Stratégie de tests

- Statut : accepté
- Date : 2026-11-02

## Décision
- **Double boucle** : un scénario d'acceptation en échec, puis des cycles TDD unitaires jusqu'au vert.
- Pyramide : beaucoup de tests du domaine (purs, rapides) ; des tests d'application avec des fakes en mémoire des ports ; des tests d'intégration ciblés sur l'infrastructure (Testcontainers PostgreSQL, `Category=Integration`) ; peu de tests e2e.
- Outils : xUnit v3 + Shouldly, Reqnroll, ArchUnitNET (C#) ; Vitest, Testing Library, playwright-bdd, Jest + jest-expo, Maestro (TS).
- Doublures uniquement aux ports ; aucun mock du domaine.
- Les hooks Claude Code imposent le test d'abord (`tdd-guard`) et relancent les tests rapides à chaque fin de tour (`run-tests-on-stop`).
