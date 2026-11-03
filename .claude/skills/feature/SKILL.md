---
name: feature
description: Développe une fonctionnalité de bout en bout selon le flux BDD → DDD → double boucle TDD → revue d'architecture, en orchestrant les agents bdd-analyst, domain-expert, tdd-red, tdd-green, tdd-refactor et architecture-reviewer. À utiliser dès que l'utilisateur demande une nouvelle fonctionnalité ou user story (« ajoute… », « en tant que… je veux… »).
argument-hint: "<user story ou description du besoin>"
---

# /feature : flux complet d'une fonctionnalité

Besoin : $ARGUMENTS

Suis les étapes **dans l'ordre**. Ne saute pas d'étape et ne fusionne pas les phases TDD.

## 0. Prérequis
Si `api/AcroFunJam.slnx` ou `front/package.json` n'existent pas, propose d'abord `/bootstrap`.

## 1. Découverte BDD (agent `bdd-analyst`)
Délègue l'example mapping et l'écriture des scénarios `@wip`.
Soumets ensuite les règles, les exemples et le vocabulaire à l'agent `acroyoga-expert`, qui les confirme ou les challenge ; ses questions s'ajoutent aux questions ouvertes (inutile si la story ne contient aucun terme ni règle de l'acroyoga).
Si la story touche une interface (`@web`, `@mobile`) : soumets aussi les scénarios à l'agent `ux-expert` (parcours, états, libellés, accessibilité) ; ses questions s'ajoutent aux questions ouvertes.
**Point d'arrêt** : présente à l'utilisateur la carte, les questions ouvertes et les scénarios, puis attends sa validation avant de continuer. Les questions ouvertes doivent être tranchées par lui.

## 2. Modélisation (agent `domain-expert`)
Délègue la modélisation à partir des scénarios validés. Récupère la **test list** ordonnée.
Si un nouveau contexte délimité apparaît : `/new-bounded-context`. Si une décision structurante est prise : `/adr`.

### 2b. Conception visuelle (agent `ui-designer`), si la story touche une interface
Transmets-lui les scénarios validés et la sortie de l'`ux-expert`. Il ajoute ou ajuste les tokens de `@acrofunjam/ui-tokens` et spécifie les composants et les écrans dans `docs/design/`. Présente à l'utilisateur ses choix visuels structurants (identité, palette, police) avant de les implémenter.

## 3. Double boucle, pour chaque scénario (dans l'ordre conseillé)

### 3a. Boucle externe : RED d'acceptation
- Écris `red` dans `.claude/.state/tdd-phase`.
- Implémente les step definitions du scénario pour la cible taguée :
  - `@api` : Reqnroll dans `api/tests/AcroFunJam.Specs`. Les steps appellent l'API via `WebApplicationFactory` (HTTP en mémoire), avec des fakes ou Testcontainers derrière les ports ;
  - `@web` : playwright-bdd dans `front/apps/web/e2e`, avec l'API mockée par interception réseau ;
  - `@mobile` : flow Maestro dans `front/apps/mobile/e2e` (lancé manuellement ou en CI, pas dans le hook).
- Lance le scénario et vérifie qu'il échoue pour la bonne raison (fonctionnalité absente, pas une step manquante).

### 3b. Boucle interne : TDD, pour chaque élément de la test list nécessaire au scénario
1. `tdd-red` : un test unitaire en échec ;
2. `tdd-green` : le code minimal ;
3. `tdd-refactor` : nettoyage.

Ordre conseillé : domaine (agrégats, value objects) → application (handlers, avec des fakes de ports) → infrastructure (tests d'intégration `Category=Integration`) → présentation (endpoint, puis écran).
Relance le scénario d'acceptation après chaque cycle ; arrête la boucle interne dès qu'il passe.

### 3c. Scénario vert
Retire le tag `@wip` du scénario, puis lance toutes les suites rapides.

## 4. Revue (agent `architecture-reviewer`)
Corrige les points 🔴 et 🟠 (via de nouveaux cycles TDD si un comportement change).
Si la story touche une interface, lance en parallèle une revue `ux-expert` (parcours, états, accessibilité des écrans livrés) et une revue `ui-designer` (respect des tokens et des spécifications de `docs/design/`).

## 5. Clôture
- Supprime `.claude/.state/tdd-phase`.
- Vérifie que le glossaire et la context map sont à jour.
- Résume : scénarios livrés, fichiers clés, décisions prises, points restants. Ne commite pas sans demande explicite.
