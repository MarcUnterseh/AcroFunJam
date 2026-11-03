# 0021. Couche de présentation partagée du front (`core/src/presentation`)

- Statut : accepté
- Date : 2026-11-03
- Complète : [0002](0002-clean-architecture-et-ddd.md)

## Contexte
Les libellés français (niveaux de difficulté, nombre de poses, Oui / Non, messages du catalogue) sont partagés par le site et l'app mobile (ADR 0007). Jusqu'ici, ils vivaient dans `core/domain`, qui doit pourtant ne porter que le langage du domaine : la story 2b a reporté leur déplacement. La refonte du catalogue (story 3) en ajoute une dizaine.

## Décision
- Une troisième couche dans `@acrofunjam/core` : `src/presentation`. Elle contient les textes et les mises en forme partagés par les apps (`catalog-labels.ts`), et aucune logique métier.
- Elle dépend **uniquement** de `core/domain` (types et règles, comme l'ordre de l'échelle). Ni le domaine ni les cas d'usage n'en dépendent. Pas de framework, pas de paquet npm.
- Règle vérifiée par dependency-cruiser (`core-presentation-only-domain`) ; `core-domain-is-pure` empêche déjà le domaine de l'importer.
- Les apps l'utilisent comme le reste de `core`, par `@acrofunjam/core`.

## Conséquences
- Les nouveaux libellés vont directement dans `presentation`. Les anciens (`identity-labels.ts`, encore dans `core/domain/identity`) y seront déplacés au fil des stories qui les touchent.
- Le garde TDD (`tdd-guard`) ne couvre pas encore `presentation` : les tests y sont écrits par discipline, pas par contrainte.
