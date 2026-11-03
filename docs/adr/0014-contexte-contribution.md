# 0014. Contexte Contribution : un agrégat par type de proposition

- Statut : accepté
- Date : 2026-11-03

## Contexte
La story 3 « Proposer une pose » introduit les propositions : celle d'un utilisateur reste en attente de validation, celle d'un validateur ou d'un administrateur est publiée directement. La carte des contextes (option A) place le cycle de vie des propositions hors du Catalogue, qui ne contient que du publié. D'autres types suivront : transition, modification d'une pose publiée, ajout de photos. La story suivante ajoutera la file de validation.

## Options envisagées
1. **Un agrégat par type de proposition** (`PoseProposal` maintenant, `TransitionProposal` plus tard) : invariants propres à chaque contenu, agrégats petits. Les traitements communs (statut, contributeur, dates) se répètent un peu.
2. Un agrégat générique `Proposal` avec un contenu polymorphe : un seul cycle de vie, mais des invariants qui dépendent du type, un mapping complexe et une tentation de `switch` partout.
3. Statut « proposé » dans l'agrégat `Pose` du Catalogue : écarté par la carte des contextes (fuite de contenu non validé, agrégat gros).

## Décision
- Contexte **Contribution** (*supporting*), créé selon `/new-bounded-context` : `Domain/Contribution`, `Application/Contribution`, `Infrastructure/Persistence/Contribution`, `Api/Endpoints/Contribution` et leurs miroirs de tests. Schéma PostgreSQL `contribution` (ADR 0007).
- Option 1 : `PoseProposal` est l'agrégat de la proposition de pose. Il porte la pose proposée (`ProposedPose`), son contributeur (`ContributorId`), son statut (`Pending` ou `Accepted`), sa date de soumission et, s'il y a lieu, qui l'a acceptée et quand.
- `PoseProposal.Submit` décide seul du statut d'après le contributeur : un validateur (ou un administrateur) obtient une proposition acceptée aussitôt, par lui-même. Ni l'endpoint ni le handler ne choisissent.
- La file de validation (story suivante) sera un **modèle de lecture** qui réunit les propositions en attente de tous les types, pas un agrégat.

## Conséquences
- Chaque nouveau type de proposition ajoute un agrégat, une table et un cas d'usage ; les codes d'erreur restent préfixés `contribution.`.
- « Mes propositions » et la file de validation liront plusieurs tables : une vue SQL ou une requête d'union suffira tant que les volumes restent faibles.
