# 0027. File de validation et « Mes propositions » hétérogènes

- Statut : accepté
- Date : 2026-11-12
- Complète : [0018](0018-contrat-http-de-contribution.md), [0022](0022-decider-d-une-proposition.md), [0023](0023-publication-directe-enregistree-et-mes-propositions.md)

## Contexte
Avec la story 6, la file de validation et « Mes propositions » présentent deux types de propositions : les propositions de pose et les propositions de modification. La file garde un seul ordre (la plus ancienne d'abord) et un seul compte ; « Mes propositions » garde une seule liste (la plus récente d'abord). Chaque type a sa propre forme : une modification présente la pose ciblée et les seuls champs changés.

## Options envisagées
1. **Une liste unique par endpoint, avec un discriminant `kind`**, triée par le domaine.
2. **Des endpoints séparés par type**, fusionnés et triés par le site : l'ordre et le compte seraient dupliqués côté client, et le web comme le mobile devraient le refaire.
3. **Une projection SQL `UNION`** : rapide, mais l'ordre et les comparaisons (avant → proposé après normalisation) sortiraient du domaine.

## Décision
**Option 1.**
- Domaine : objets de lecture fermés `PendingProposal` (`PendingPoseProposal` | `PendingPoseRevision`) et `MyProposal` (`MyPoseProposal` | `MyPoseRevision`) ; comparateurs `PendingProposalOrder` et `MyProposalsOrder` généralisés. Une modification se classe sur le nom de la pose au moment de la proposition.
- Ports de lecture par type (`IPendingPoseRevisionsReader`, `IMyPoseRevisionsReader`, à côté des existants) ; les handlers fusionnent et trient avec le comparateur du domaine.
- Dans la file, les « valeurs actuelles » d'une modification sont sa valeur d'avant : tant qu'elle attend, la pose ne peut pas changer ([0025](0025-reservation-par-pose-puis-par-nom.md)), et la version ([0024](0024-version-d-une-pose-publiee.md)) protège l'acceptation.
- Contrat HTTP (le site est le seul client, changement assumé) :
  - `GET /contribution/validation-queue` : chaque élément porte `kind` (`"pose-proposal"`, forme inchangée, ou `"pose-revision"`) ; `/count` compte les deux ;
  - `GET /contribution/my-proposals` **remplace** `GET /contribution/my-pose-proposals`, avec le même discriminant ;
  - décisions sur une modification : `POST /contribution/pose-revision-proposals/{id}/acceptance` et `/rejection`.
  Détail des corps : `docs/domain/context-map.md`.
- Le site traite un `kind` inconnu comme « site à mettre à jour », comme un statut inconnu (story 5).

## Conséquences
- Un seul détenteur de l'ordre et du compte : le domaine de l'API.
- Le site et le mobile futur lisent un type somme ; chaque nouveau type de proposition (transition, photos) ajoutera un `kind`.
- `GetMyPoseProposals` devient `GetMyProposals` ; l'ancien endpoint est supprimé dans la même livraison que le site.
