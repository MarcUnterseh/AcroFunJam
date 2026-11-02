# 0006. Données des scénarios d'acceptation

- Statut : proposé
- Date : 2026-11-02

## Contexte
Les premiers scénarios (story « Consulter les poses du catalogue ») supposent des poses déjà publiées, alors qu'aucun cas d'usage d'écriture (publication, contribution) n'existe encore. Il faut amorcer des données pour les specs `@api` et `@web` sans écrire de code non exigé par un test.

## Options envisagées
1. Base réelle (Testcontainers) remplie par SQL dans les steps : fidèle, mais lente et couplée au schéma.
2. **Faux en mémoire au niveau des ports** (`ConfigureTestServices` dans `AcroFunJamApiFactory`) : rapide, découplé du stockage ; l'adaptateur EF est couvert à part par des tests d'intégration.
3. Données de démo dans une migration (`HasData`) : met des données fictives en production et fige des identifiants.

## Décision
- `@api` : option 2. Les steps `Soit` remplissent un faux du port de lecture. Dès qu'un cas d'usage d'écriture existe (ex. publier une pose), les steps passent par la commande correspondante plutôt que par le faux.
- `@web` : l'API est simulée au niveau HTTP (`page.route`) par une fixture typée avec le schéma OpenAPI généré, pour détecter une dérive du contrat.
- Pas de données de démo dans les migrations. Si une démo est voulue, un seeder idempotent d'Infrastructure, limité à l'environnement Development et testé.

## Conséquences
- Les scénarios `@api` ne vérifient pas la persistance : les tests `Category=Integration` de l'Infrastructure en ont la charge.
- Les faux doivent rester triviaux (aucune règle métier dedans).
