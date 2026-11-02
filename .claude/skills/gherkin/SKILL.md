---
name: gherkin
description: Conventions d'écriture des scénarios Gherkin (français) du projet et câblage vers Reqnroll, playwright-bdd et Maestro. À consulter avant d'écrire ou de relire un fichier .feature ou des step definitions.
user-invocable: false
---

# Conventions Gherkin

## Emplacement et format
- Source de vérité unique : `specs/features/<contexte-délimité>/<capacité>.feature`.
- En-tête obligatoire : `# language: fr`.
- Mots-clés : `Fonctionnalité`, `Règle`, `Contexte`, `Scénario`, `Plan du Scénario`, `Exemples`, `Soit`, `Étant donné que`, `Quand`, `Alors`, `Et`, `Mais`.

## Tags
| Tag | Sens |
|---|---|
| `@api` | exécuté par Reqnroll (`api/tests/AcroFunJam.Specs`) |
| `@web` | exécuté par playwright-bdd (`front/apps/web/e2e`) |
| `@mobile` | couvert par un flow Maestro (`front/apps/mobile/e2e`) |
| `@wip` | pas encore implémenté, exclu de la CI |
| `@slow` | nécessite une infrastructure réelle (Testcontainers) |

Un scénario peut cibler plusieurs canaux. Le comportement métier est vérifié une fois côté `@api` ; `@web` et `@mobile` vérifient le parcours utilisateur.

## Règles d'écriture
1. **Déclaratif** : décrire l'intention métier, jamais l'interface (pas de « je clique », de sélecteur, d'URL, de JSON ou de code HTTP).
2. Vocabulaire strictement issu de `docs/domain/glossary.md`.
3. Un scénario = un comportement = une raison d'échouer. Au plus 5 à 7 étapes.
4. `Soit` décrit un état, `Quand` un seul événement, `Alors` un résultat observable.
5. Utiliser `Règle:` pour regrouper les scénarios par règle métier (issues de l'example mapping).
6. Données concrètes et parlantes (« Alice », « 25 € ») plutôt que « utilisateur1 ».
7. Le titre du scénario énonce la règle illustrée, pas les étapes.

## Exemple

```gherkin
# language: fr
@api @web
Fonctionnalité: Inscription à une session
  Afin de pratiquer avec d'autres
  En tant que participant
  Je veux m'inscrire à une session ouverte

  Règle: Une session ne dépasse pas sa capacité

    Scénario: Un participant s'inscrit à une session qui a encore des places
      Soit une session "Jam du samedi" de capacité 2 avec 1 inscrit
      Quand Alice s'inscrit à la session "Jam du samedi"
      Alors Alice fait partie des inscrits de "Jam du samedi"

    Scénario: L'inscription est refusée quand la session est complète
      Soit une session "Jam du samedi" de capacité 2 avec 2 inscrits
      Quand Alice s'inscrit à la session "Jam du samedi"
      Alors l'inscription est refusée car la session est complète
```

## Câblage des runners
- **Reqnroll** : le projet `AcroFunJam.Specs` inclut `specs/features/**/*.feature` en lien (voir `/bootstrap`). Filtre de tags : `@api and not @wip`. Une classe de steps par concept métier, pas par fichier `.feature`. Les steps appellent l'API via `WebApplicationFactory`.
- **playwright-bdd** : `defineBddConfig({ features: '../../../specs/features/**/*.feature', tags: '@web and not @wip', language: 'fr' })`. Steps dans `front/apps/web/e2e/steps`, organisés en *page objects*.
- **Maestro** : un flow YAML par scénario `@mobile` dans `front/apps/mobile/e2e/`, nommé d'après le titre du scénario. Maestro ne lit pas le Gherkin : garde la correspondance par le nom.
