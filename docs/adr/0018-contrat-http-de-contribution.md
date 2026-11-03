# 0018. Contrat HTTP de Contribution

- Statut : accepté
- Date : 2026-11-03
- Complète : [0007](0007-contrat-http-et-persistance-modulaire.md)

## Contexte
Première écriture métier exposée : la proposition d'une pose. Il faut fixer la route, les statuts, la forme des erreurs et la manière de faire évoluer `GET /catalog/poses` sans casser le site.

## Décision
- `POST /contribution/pose-proposals`, policy `CanPropose`.
- Corps **permissif** : `{ name: string?, baseDifficulty: string?, flyerDifficulty: string?, canStartFlow: bool?, canEndFlow: bool? }`. Un enum JSON rejetterait « expert » ou une valeur absente à la désérialisation, sans code métier ; ici, l'endpoint construit `ProposedPose.Create` et chaque erreur a son code `pose.*`.
- Réponses :
  - `201 { id, status: "pending" | "accepted", name, baseDifficulty, flyerDifficulty, canStartFlow, canEndFlow }`, le nom étant le nom **normalisé**. Pas d'en-tête `Location` tant qu'aucune ressource n'est lisible en `GET` ;
  - `400` pour un contenu irrecevable (`pose.name-required`, `pose.name-too-long`, `pose.base-difficulty-required`, `pose.flyer-difficulty-required`, `pose.unknown-difficulty-level`, `pose.can-start-flow-required`, `pose.can-end-flow-required`) ; la première erreur dans l'ordre nom, base, flyer, début, fin ;
  - `409` pour un nom déjà pris (`contribution.pose-name-already-in-catalog`, `contribution.pose-name-already-pending`) ;
  - `401` pour un visiteur, et pour `contribution.unknown-contributor` (compte supprimé entre la connexion et l'envoi), que le site traite comme une session expirée. En pratique, la policy `CanPropose` relit le compte avant le cas d'usage : un compte supprimé y est refusé par un 401 `identity.account-deleted` (et non plus par un 403 `identity.capability-required`), valable pour toutes les policies de capacité ; `contribution.unknown-contributor` ne survient que si la suppression a lieu entre la policy et le cas d'usage.
- Les erreurs sont des ProblemDetails avec le code dans `title` ; la correspondance code → statut est centralisée dans `ProblemResults`.
- `GET /catalog/poses` reçoit `canStartFlow` et `canEndFlow`, booléens **requis** : ajout non cassant, difficultés toujours à plat, pas de `count`. L'ordre suit la clé de comparaison (ADR 0017).
- `/me` ne change pas : il expose déjà les capacités (ADR 0019).

## Conséquences
- Le client du front (`api-client`) doit être régénéré (`npm run generate`) pour les deux évolutions.
