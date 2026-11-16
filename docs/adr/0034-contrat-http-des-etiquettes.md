# 0034. Contrat HTTP des étiquettes

- Statut : proposé
- Date : 2026-11-13
- Complète : [0007](0007-contrat-http-et-persistance-modulaire.md), [0018](0018-contrat-http-de-contribution.md), [0027](0027-file-de-validation-et-mes-propositions-heterogenes.md), [0030](0030-page-d-une-pose-et-contrat-http-des-transitions.md), [0032](0032-liste-des-etiquettes.md), [0033](0033-etiquettes-d-une-transition-et-retrait-conditionnel.md)

## Contexte
La story 8 ajoute la page publique « Étiquettes » (`/etiquettes`), sa gestion par les validateurs et les administrateurs, avec « Portée par N transitions » (transitions publiées seulement) et le refus d'un retrait qui liste ses porteurs, l'étiquetage direct d'une transition publiée, et les étiquettes dans la proposition, l'acceptation, la file, « Mes propositions » et la page d'une pose. Le site doit expliquer que « pop » ajoute « dynamique » dès qu'on la coche, et lire, sur la page d'une pose, la description des étiquettes d'une transition.

## Options envisagées
1. **Une seule lecture publique de la liste** avec le nombre de transitions porteuses, que le site n'affiche qu'aux personnes qui gèrent : le nombre se déduit de données publiques, rien n'est divulgué.
2. Une lecture publique sans nombre et une lecture réservée avec : deux représentations de la même liste.

Pour les étiquettes d'une transition sur la page d'une pose :
- A. **identifiant, nom et description** dans chaque transition : une seule requête, un seul état d'erreur (ADR 0030) ;
- B. identifiant et nom, descriptions lues dans `GET /catalog/tags` : seconde requête et second état d'erreur.

Pour les requêtes : identifiants (`tagIds`) ou noms d'étiquettes. Les noms changent ; les identifiants sont stables.

## Décision
**Options 1 et A ; les requêtes envoient des identifiants.**

Catalogue :
- `GET /catalog/tags` (anonyme) : `200 { "tags": [ { "id", "name", "description", "impliedTagId": string | null, "transitionCount" } ] }`, dans l'ordre du catalogue sur le nom ; liste vide `[]`. `impliedTagId` : l'étiquette que celle-ci ajoute (« dynamique » pour « pop »). `transitionCount` : transitions **publiées** qui la portent.
- `POST /catalog/tags` (policy `CanManageTags`) : `{ "name", "description" }` → `201 { "id", "name", "description", "impliedTagId": null, "transitionCount": 0 }`.
- `PUT /catalog/tags/{id}` (`CanManageTags`) : `{ "name", "description" }` (les deux obligatoires ; le site renvoie la valeur inchangée) → `200 { … même forme }`.
- `DELETE /catalog/tags/{id}` (`CanManageTags`) → `204`.
- `PUT /catalog/transitions/{id}/tags` (`CanManageTags`) : `{ "tagIds": [ … ] }` (vide : toutes retirées ; doublons ignorés) → `200 { "id", "tags": [ Tag ] }`, ensemble complété (« dynamique » ajoutée).
- `GET /catalog/poses/{id}` : chaque transition `T` gagne `"tags": [ { "id", "name", "description" } ]`, dans l'ordre du catalogue sur le nom ; `[]` sans étiquette.

Avec `Tag = { "id", "name" }` partout ailleurs, dans l'ordre du catalogue sur le nom, sous le nom **actuel** (ou le dernier nom d'une étiquette retirée, pour l'historique d'une proposition décidée).

Contribution :
- `POST /contribution/transition-proposals` : `"tagIds"?: [ … ]` (absent, `null` ou vide : aucune) ; réponse `201` avec `"tags": [ Tag ]` (complétées).
- `POST /contribution/transition-proposals/{id}/acceptance` : `"tagIds"?: [ … ]` (absent ou `null` : inchangées ; `[]` : toutes retirées) ; réponse `200` avec `"tags"` retenues.
- `GET /contribution/validation-queue`, élément `transition-proposal` : `"tags": [ Tag ]` (proposées).
- `GET /contribution/my-proposals`, élément `transition-proposal` : `"tags": [ Tag ]` (retenues si acceptée, proposées sinon) ; `adjustments.tags : null | { "proposed": [ Tag ], "retained": [ Tag ] }`.

Erreurs (ProblemDetails, code stable dans `title`, détails en extensions) :
- 400 `tag.name-required`, `tag.name-without-letter-or-digit`, `tag.name-too-long`, `tag.description-required`, `tag.description-too-long` ;
- 404 `catalog.tag-not-found`, `catalog.transition-not-found` ;
- 409 `catalog.tag-name-taken` ;
- 409 `catalog.tag-carried`, extensions `"transitions": [ { "id", "fromPose": { "id", "name" }, "toPose": { "id", "name" }, "name": string | null } ]` et `"pendingProposals": [ même forme ]`, chacune dans l'ordre du catalogue (pose de départ, pose d'arrivée, nom) ;
- 409 `catalog.tag-implied`, extension `"impliedBy": [ Tag ]` (« dynamique » tant que « pop », « whip » ou « icarien » sont dans la liste) ;
- 409 `catalog.tag-not-in-list` et `contribution.tag-not-in-list`, extension `"tagIds": [ … ]` (les identifiants reçus qui ne sont pas dans la liste) : le site, qui connaît ce qu'il a envoyé, nomme l'étiquette (« l'étiquette « vrille » ne fait plus partie de la liste ») et la retire de la saisie conservée ;
- 401 visiteur ou `identity.account-deleted` ; 403 `identity.capability-required`.

`GET /me` : la liste `capabilities` gagne `manage-tags`, dans l'ordre `propose`, `validate-proposals`, `manage-tags`, `manage-roles`.

## Conséquences
- Ajouts compatibles : un site déjà déployé ignore `tags` ; un site plus ancien n'envoie pas `tagIds` (aucune étiquette). Le site et l'API sont tout de même livrés ensemble (ADR 0030).
- Le statut 409 pour une étiquette hors liste traduit le cas réel (la liste a changé pendant la saisie) ; un identifiant fantaisiste reçoit la même réponse.
- Les descriptions sont répétées pour chaque transition de la page d'une pose : volume négligeable.
- `transitionCount` est public : il ne dit rien qui ne se déduise des pages des poses.
