# Architecture Decision Records

| # | Décision | Statut |
|---|---|---|
| [0001](0001-stack-technique.md) | Stack technique : API .NET, web React/Vite, mobile Expo | accepté |
| [0002](0002-clean-architecture-et-ddd.md) | Clean architecture + DDD, cas d'usage sans MediatR | accepté |
| [0003](0003-bdd-specs-partagees.md) | Spécifications Gherkin partagées en français | accepté |
| [0004](0004-strategie-de-tests.md) | Stratégie de tests et double boucle TDD | accepté |
| [0005](0005-outillage-du-squelette.md) | Outillage du squelette : MTP, câblage Reqnroll, TypeScript 6.0 | proposé |
| [0006](0006-donnees-des-scenarios-d-acceptation.md) | Données des scénarios d’acceptation : faux aux ports (@api), API simulée (@web) | proposé |
| [0007](0007-contrat-http-et-persistance-modulaire.md) | Conventions du contrat HTTP et persistance modulaire | proposé |
| [0008](0008-identite-et-roles.md) | Identité : comptes ASP.NET Core Identity et rôles cumulatifs | accepté |
| [0009](0009-specs-adossees-a-une-bibliotheque.md) | Specs d’acceptation adossées à une bibliothèque : vraie base PostgreSQL | accepté |
| [0010](0010-routeur-du-site-web.md) | Routeur du site web (React Router) et pages dédiées | accepté |
| [0011](0011-session-web-et-mots-de-passe.md) | Session du site en cookies, règle de mot de passe (10 caractères) | accepté |
| [0012](0012-tokens-en-variables-css.md) | Design tokens exposés au web en variables CSS | accepté |
| [0013](0013-expiration-et-onglets.md) | Expiration de session et synchronisation entre onglets (indice en localStorage) | accepté |
| [0014](0014-contexte-contribution.md) | Contexte Contribution : un agrégat par type de proposition | accepté |
| [0015](0015-noyau-partage-catalogue-contribution.md) | Noyau partagé Catalogue / Contribution | accepté |
| [0016](0016-integration-contribution-catalogue.md) | Intégration Contribution → Catalogue (appel synchrone, une transaction) et Identité → Contribution | accepté |
| [0017](0017-cle-de-comparaison-et-unicite-du-nom.md) | Clé de comparaison du nom de pose et unicité (index, verrou consultatif) | accepté |
| [0018](0018-contrat-http-de-contribution.md) | Contrat HTTP de Contribution (complète 0007) | accepté |
| [0019](0019-capacites-et-saisie-conservee-cote-site.md) | Côté site : capacités plutôt que rôle, saisie conservée dans l’onglet | accepté |
| [0020](0020-specs-de-contribution-sur-une-vraie-base.md) | Specs @api de Contribution sur une vraie base (amende 0006 et 0009) | accepté |
| [0021](0021-couche-presentation-du-front-partage.md) | Couche de présentation partagée du front (`core/src/presentation`, complète 0002) | accepté |
| [0022](0022-decider-d-une-proposition.md) | Décider d'une proposition : mise à jour conditionnelle sur le statut, publication dans la même transaction, adresse e-mail lue à Identité | accepté |
