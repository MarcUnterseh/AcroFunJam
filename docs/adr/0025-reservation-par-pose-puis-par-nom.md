# 0025. Réservation par pose, puis par nom

- Statut : accepté
- Date : 2026-11-12
- Complète : [0017](0017-cle-de-comparaison-et-unicite-du-nom.md)

## Contexte
La story 6 ajoute deux unicités à celle du nom (ADR 0017) :
- **une seule modification en attente par pose**, pour tous, validateurs compris (R9) ;
- le nom proposé par une modification en attente est **réservé** : ni une proposition de pose, ni une autre modification ne peut le prendre (R8).

Une publication directe de modification ne crée aucune ligne « en attente » : un index unique sur les modifications en attente ne la protège pas contre une soumission concurrente de la même pose. Il faut sérialiser par pose, en plus de sérialiser par nom quand le nom change.

## Options envisagées
1. **Généraliser la réservation** à plusieurs verrous consultatifs pris dans un ordre fixe : la pose (`pose:<id>`), puis la clé du nom (`pose-name:<clé>`) si elle change. Même mécanisme qu'aujourd'hui, ordre fixe pour éviter les interblocages.
2. **`SELECT … FOR UPDATE`** sur la ligne `catalog.poses` depuis Contribution : couple Contribution au schéma du Catalogue, ce que l'ADR 0016 interdit.
3. **Les seuls index uniques** : ne protègent pas une publication directe concurrente d'une soumission en attente.

## Décision
**Option 1, avec les index comme filets de sécurité.**
- `IPoseNameReservation` devient `IPoseReservation` (`PgPoseReservation`, `Infrastructure.ContextIntegration`), avec deux méthodes : `Run(PoseNameKey, travail)`, inchangée pour les usages existants (proposer une pose, accepter une proposition de pose), et `Run(PublishedPoseId pose, PoseNameKey? nameKey, travail)` pour les modifications. Une transaction, `pg_advisory_xact_lock` sur `pose:<id>` puis, si elle est donnée, sur `pose-name:<clé>`, travail, validation si le `Result` réussit. Les ADR 0016, 0017 et 0022 désignent ce port sous son ancien nom.
- La clé à réserver est calculée par le domaine : `ProposedRevision.ReservedNameKey` vaut `null` quand la clé du nom ne change pas (correction de casse ou d'espaces comprise), et le handler ne réserve alors que la pose.
- Index uniques partiels sur `contribution.pose_revision_proposals` : `(pose_id) WHERE status = 'pending'` → `contribution.pose-revision-already-pending` ; `(reserved_name_key) WHERE status = 'pending'` → `contribution.pose-name-already-pending`.
- La disponibilité d'un nom (`NameAvailability`) consulte désormais trois sources : poses publiées, propositions de pose en attente, noms réservés par des modifications en attente. Le catalogue reste prioritaire.
- L'ancien nom d'une pose renommée est libéré sans action particulière : la révision change `catalog.poses.name_key`, et la modification acceptée quitte l'index partiel.

## Conséquences
- Toute écriture d'un nom de pose passe toujours par la réservation (règle de l'ADR 0017), et toute écriture d'une pose existante passe par la réservation de la pose.
- L'ordre pose → nom doit être respecté par tout nouvel usage : un test d'intégration vérifie que deux soumissions concurrentes de la même pose n'en acceptent qu'une.
- `ProposePoseHandler` et `AcceptPoseProposalHandler` lisent un nom réservé de plus : un port de lecture supplémentaire, sans changement de comportement pour la story 3 et la story 4.
