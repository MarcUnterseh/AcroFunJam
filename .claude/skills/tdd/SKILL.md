---
name: tdd
description: Exécute un ou plusieurs cycles stricts Red → Green → Refactor pour un comportement précis, en déléguant chaque phase à l'agent dédié (tdd-red, tdd-green, tdd-refactor). À utiliser pour ajouter ou corriger un comportement unitaire, ou pour corriger un bug (le test reproduit d'abord le bug).
argument-hint: "<comportement à implémenter ou bug à corriger>"
---

# /tdd : cycle Red → Green → Refactor

Comportement visé : $ARGUMENTS

## Préparation
1. Si aucune test list n'existe pour ce travail, rédige-la : comportements atomiques, du plus simple au plus complexe (cas dégénérés, cas nominal, limites, erreurs). Montre-la à l'utilisateur.
2. Identifie la couche concernée (Domain, Application, Infrastructure, présentation) et le projet ou package de tests.

## Cycle, à répéter pour chaque élément de la test list
| Phase | Agent | Sortie attendue | Fichier de phase |
|---|---|---|---|
| RED | `tdd-red` | un test qui échoue pour la bonne raison | `red` |
| GREEN | `tdd-green` | code minimal, toute la suite verte | `green` |
| REFACTOR | `tdd-refactor` | design amélioré, suite toujours verte | `refactor` |

Entre deux phases, vérifie toi-même le résultat annoncé (relance la commande de test) avant de passer à la suivante. Si GREEN modifie un test, ou si RED échoue pour une mauvaise raison, reprends la phase.

Pour un **bug** : le premier RED reproduit le bug exactement tel que signalé.

## Fin
- Supprime `.claude/.state/tdd-phase`.
- Résume les cycles réalisés (test → code) et ce qui reste de la test list.

## Rappels
- Un seul test en échec à la fois.
- Teste le comportement, pas l'implémentation.
- Les doublures se placent aux ports, jamais sur le domaine.
- Le hook Stop relance les tests rapides : en phase `red`, l'échec est attendu.
