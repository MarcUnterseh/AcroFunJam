# 0021. Couche de présentation partagée du front (`core/src/presentation`)

- Statut : accepté
- Date : 2026-11-03 (mise à jour à l'étape C de la story 3)
- Complète : [0002](0002-clean-architecture-et-ddd.md)

## Contexte
Les libellés français (niveaux de difficulté, nombre de poses, Oui / Non, messages du catalogue) sont partagés par le site et l'app mobile (ADR 0007). Jusqu'ici, ils vivaient dans `core/domain`, qui doit pourtant ne porter que le langage du domaine : la story 2b a reporté leur déplacement. La refonte du catalogue (story 3) en ajoute une dizaine.

## Décision
- Une troisième couche dans `@acrofunjam/core` : `src/presentation`. Elle contient les textes et les mises en forme partagés par les apps, et aucune logique métier.
- Elle est **rangée par contexte**, comme `domain` et `application` : `presentation/catalog/catalog-labels.ts`, `presentation/contribution/proposal-labels.ts`, et `presentation/shared-kernel/difficulty-level-labels.ts` pour les libellés du noyau partagé (ADR 0015), utilisés par plusieurs contextes (nom des niveaux).
- Elle dépend **uniquement** de `core/domain` (types et règles, comme l'ordre de l'échelle). Ni le domaine ni les cas d'usage n'en dépendent. Pas de framework, pas de paquet npm.
- Règles vérifiées par dependency-cruiser : `core-presentation-only-domain`, `core-domain-is-pure` (le domaine ne l'importe pas), et `bounded-contexts-isolated` (un contexte n'importe pas les libellés d'un autre ; `shared-kernel` est partagé).
- Les apps l'utilisent comme le reste de `core`, par `@acrofunjam/core`.
- Le garde TDD (`tdd-guard`, `.claude/hooks/config.json`) couvre `presentation` comme `domain` et `application` : pas de nouveau fichier de libellés sans test qui le référence.

## Conséquences
- Les nouveaux libellés vont directement dans `presentation/<contexte>`. Les anciens (`identity-labels.ts`, encore dans `core/domain/identity`) y seront déplacés au fil des stories qui les touchent.
