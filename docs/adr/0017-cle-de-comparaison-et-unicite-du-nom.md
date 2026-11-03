# 0017. Clé de comparaison du nom de pose et unicité

- Statut : accepté
- Date : 2026-11-03
- Révise : l'ordre du catalogue de la story 1 (`SortKey`, qui retirait les traits d'union)

## Contexte
Un nom de pose est unique, « à la casse, aux espaces, aux accents et à la ponctuation près », parmi les poses publiées **et** les propositions en attente. La même comparaison sert à l'ordre alphabétique du catalogue. Deux propositions concurrentes du même nom ne doivent pas aboutir toutes les deux, y compris quand l'une est en attente et l'autre publiée directement, c'est-à-dire dans deux tables différentes.

## Options envisagées
1. Calcul de la clé en SQL (`unaccent`, `lower`) dans un index d'expression : `unaccent` n'est pas `IMMUTABLE`, l'index n'est pas fiable.
2. **Clé calculée dans le domaine et stockée en colonne**, index uniques, verrou consultatif par clé.
3. Transactions `Serializable` : faux conflits, réessais à gérer, et ne protège pas mieux deux tables.

## Décision
- `PoseNameKey.From(PoseName)` : nom en NFC → décomposition NFD → marques diacritiques retirées → **tout caractère qui n'est ni lettre ni chiffre** compte comme un espace (trait d'union, apostrophe, parenthèses, mais aussi `&`, `+`, `/`) → espaces réduits et rognés → `ToLowerInvariant`.
- Une clé vide (nom fait uniquement de ponctuation ou de symboles) rend le nom irrecevable : `pose.name-required`.
- `PoseName.Create` : NFC, espaces rognés et réduits, **60 points de code** au plus après normalisation (même mesure que `char_length` de PostgreSQL et que le site).
- Ordre du catalogue : clé en ordinal, puis nom exact en ordinal.
- Garanties en base, filets de sécurité de la règle du domaine :
  - `catalog.poses(name_key)` unique ;
  - `contribution.pose_proposals(name_key) WHERE status = 'pending'` unique (index partiel) ;
  - `IPoseNameReservation.Run(clé, travail)` (`PgPoseNameReservation`, dans `Infrastructure.ContextIntegration`) ouvre une transaction, prend `pg_advisory_xact_lock` sur un hachage de `'pose-name:' || clé`, exécute le travail et ne valide que si le `Result` réussit ;
  - une violation 23505 est traduite par l'unité de travail (`EfUnitOfWork.SaveChanges` renvoie un `Result`) : chaque contexte déclare ses index et leur erreur (`CatalogUniqueConstraints` → `catalog.pose-name-taken`, `ContributionUniqueConstraints` → `contribution.pose-name-already-pending`). Les noms d'index sont des `static readonly`, et non des `const` recopiées par le compilateur, pour que les tests d'isolation voient tout usage depuis un autre contexte ;
  - `PublishPose` appelé **hors réservation** (seeder, outil d'administration) s'appuie sur l'index unique du catalogue : un doublon concurrent donne `catalog.pose-name-taken` (409), jamais une erreur 500. Appelé par la publication directe, ce code est traduit par l'ACL en `contribution.pose-name-already-in-catalog`.
- La règle elle-même (catalogue prioritaire sur l'attente) vit dans `NameAvailability.From` et `PoseProposal.Submit` ; le handler ne choisit pas l'erreur.

## Conséquences
- Changer l'algorithme de la clé impose une migration de données qui recalcule `name_key`.
- Le verrou consultatif ne couvre que les écritures qui passent par `IPoseNameReservation` : toute future écriture de nom (révision, acceptation) doit l'utiliser.
