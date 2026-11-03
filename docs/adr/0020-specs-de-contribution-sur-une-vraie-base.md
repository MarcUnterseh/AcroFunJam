# 0020. Specs @api de Contribution sur une vraie base

- Statut : accepté
- Date : 2026-11-03
- Amende : [0006](0006-donnees-des-scenarios-d-acceptation.md), [0009](0009-specs-adossees-a-une-bibliotheque.md)

## Contexte
Les scénarios de `contribution/proposer-une-pose.feature` mettent en jeu des rôles réels (Identité), l'unicité d'un nom à travers deux tables et une transaction qui touche deux contextes. Un faux au port de lecture du catalogue (ADR 0006) ne verrait pas les poses publiées directement, et l'unicité repose en dernier ressort sur la base.

## Décision
- La feature `contribution/proposer-une-pose.feature` est taguée `@Integration` (vraie base PostgreSQL, Respawn avant chaque scénario, ADR 0009).
- Dans une feature `@Integration` :
  - « Alice est utilisateur » passe par la vraie bibliothèque d'identité ;
  - « Soit la pose publiée … » passe par la commande `PublishPose` résolue depuis les services, sans HTTP ;
  - `AcroFunJamApiFactory` ne remplace plus `IPublishedPosesReader` par le faux : le catalogue est lu dans la base.
- Les features sans `@Integration` (`catalogue/consulter-les-poses.feature`) gardent le faux au port de lecture, rempli par les mêmes étapes : elles restent dans la boucle rapide.
- L'état « en attente de validation » s'observe par une lecture de test de `contribution.pose_proposals`, faute de « mes propositions » ou de file de validation.
- Les features `@Integration` partagent un seul conteneur : elles s'exécutent **l'une après l'autre** (verrou pris avant la feature et rendu après), pour que la remise à zéro de l'une n'efface pas les données de l'autre. Les features sans base restent parallèles.

## Conséquences
- Les scénarios de Contribution ne tournent pas dans la boucle rapide (`--filter-not-trait "Category=Integration"`) : lancer la suite complète avant de livrer.
- L'étape « Soit la pose publiée » a deux chemins (commande ou faux) selon la feature ; ils doivent rester triviaux, sans règle métier.
