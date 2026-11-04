# 0022. Décider d'une proposition : une seule décision, publication dans la même transaction

- Statut : accepté
- Date : 2026-11-04
- Complète : [0014](0014-contexte-contribution.md), [0016](0016-integration-contribution-catalogue.md), [0017](0017-cle-de-comparaison-et-unicite-du-nom.md), [0018](0018-contrat-http-de-contribution.md)

## Contexte
La story 4 « Valider une proposition » permet à un validateur ou à un administrateur d'accepter (au besoin avec ajustements) ou de refuser une proposition de pose. Une décision est irréversible : la première enregistrée l'emporte, y compris quand deux validateurs décident au même moment ou quand le même validateur renvoie sa décision après une perte de réseau. Accepter publie la pose dans le catalogue, qui peut refuser (nom publié entre-temps). La file de validation présente l'adresse e-mail du contributeur, qui appartient à Identité.

Deux pièges du code existant :
- `PublishPoseHandler` appelle lui-même `IUnitOfWork.SaveChanges` : si la mise à jour de la proposition et l'insertion de la pose partent dans la même sauvegarde, l'ordre des commandes SQL n'est pas maîtrisé, et le perdant d'une course peut échouer sur l'index unique du catalogue (`contribution.pose-name-already-in-catalog`) au lieu de « déjà traitée » ;
- un refus ne touche pas au catalogue : sans protection sur la ligne de la proposition, un refus et une acceptation simultanés réussiraient tous les deux (le dernier écrit gagne).

## Options envisagées
1. **Mise à jour conditionnelle sur le statut** : la colonne `status` est un jeton de concurrence EF ; la sauvegarde émet `UPDATE … WHERE id = @id AND status = 'pending'`. Zéro ligne : la décision a déjà été prise. Sous `READ COMMITTED`, PostgreSQL fait attendre la seconde mise à jour jusqu'à la fin de la première, puis réévalue la condition.
2. Jeton de version générique (`xmin`) : même mécanique, mais un conflit signale « quelque chose a changé », pas « déjà traitée » ; il faudrait relire pour choisir l'erreur.
3. Verrou consultatif par proposition, ou `SELECT … FOR UPDATE` : verrou explicite à prendre dans chaque cas d'usage, facile à oublier pour le refus.
4. Transaction `Serializable` : faux conflits, réessais, et le refus n'aurait pas d'erreur métier propre.

Pour l'adresse e-mail :
- A. **Port de lecture de Contribution, adaptateur d'intégration qui appelle une query d'Identité, en un seul lot** ;
- B. jointure SQL entre `contribution.pose_proposals` et `identity.users` : plus rapide à écrire, mais couple les schémas et contourne l'isolation des contextes ;
- C. copier l'adresse dans la proposition : donnée personnelle dupliquée, périmée si l'adresse change.

## Décision
- **Option 1.** `PoseProposalRecord.Status` devient un jeton de concurrence. `EfUnitOfWork` traduit `DbUpdateConcurrencyException` en erreur métier, sur le modèle des index uniques (ADR 0017) : chaque contexte déclare, par type d'enregistrement, l'erreur d'un conflit (`ContributionConcurrencyConflicts` : `PoseProposalRecord` → `contribution.proposal-already-decided`).
- **La décision est revendiquée avant la publication.** `AcceptPoseProposalHandler` :
  1. lit le validateur (`IValidators`) et la proposition (`IPoseProposalRepository.GetById`) ;
  2. ouvre la réservation du nom **retenu** (`IPoseNameReservation`, ADR 0017 : toute écriture d'un nom passe par elle) ;
  3. fait décider l'agrégat (`PoseProposal.Accept`), enregistre la proposition (`Update` puis `SaveChanges` : mise à jour conditionnelle) ;
  4. publie la pose retenue via `ICatalogPublisher.PublishPose`, comme la publication directe ;
  5. un échec à l'une de ces étapes annule toute la transaction : la proposition reste en attente.
- `RejectPoseProposalHandler` n'ouvre pas de réservation (aucun nom n'est écrit) : une seule sauvegarde, protégée par la même mise à jour conditionnelle.
- L'agrégat reste seul juge : `Accept` et `Reject` refusent une proposition déjà traitée (`ProposalAlreadyDecided`) et un décideur qui n'a plus la capacité (`ValidatorRequired`). La mise à jour conditionnelle n'est que le filet de sécurité des décisions concurrentes, comme l'index unique pour le nom.
- **Option A** pour l'adresse : port `IContributorEmails` (Contribution.Application), adaptateur `IdentityContributorEmails` (`Infrastructure.ContextIntegration`) qui appelle la query `GetAccountEmails` d'Identité pour toute la file en une requête. L'adresse ne quitte Identité que pour la réponse HTTP. « Toi » est calculé par le cas d'usage (`isYou`), le site ne compare pas d'adresses.
- Contrat HTTP (complète l'ADR 0018) : `GET /contribution/validation-queue`, `GET /contribution/validation-queue/count`, `POST /contribution/pose-proposals/{id}/acceptance`, `POST /contribution/pose-proposals/{id}/rejection`, tous sous la policy `CanValidate` (capacité existante `validate-proposals`, rôles validateur et administrateur). Détail des corps et des codes : `docs/domain/context-map.md`.

## Conséquences
- Toute future décision sur une proposition (autres types de propositions, retrait par le contributeur) doit passer par la même mise à jour conditionnelle.
- Une acceptation ouvre deux sauvegardes dans une transaction ; les événements de domaine ne pourront être diffusés qu'après le commit (rappel de l'ADR 0016).
- Le rôle est vérifié deux fois (policy, puis agrégat) : redondance assumée, qui ferme la fenêtre entre la policy et le cas d'usage et garde la règle testable dans le domaine.
- Migration `RecordProposalDecisions` : statut `rejected`, colonnes de décision, contraintes de cohérence.
- `EfUnitOfWork.SaveChanges` vide les événements de domaine des agrégats suivis dès qu'il sauvegarde : pour une acceptation, ceux de la proposition sont vidés à la sauvegarde de la revendication, **avant** le commit de la réservation du nom. Aucun événement n'est diffusé aujourd'hui, donc rien n'est perdu ; mais un futur dispatcher « après commit » devra déplacer ce vidage après le commit (ou collecter les événements à chaque sauvegarde), sans quoi il ne verrait rien.
- La file de validation est lue par un port qui renvoie des agrégats `PoseProposal` (`IPendingPoseProposalsReader`), triés ensuite par `PendingProposalOrder` du domaine, plutôt que par une projection dédiée : compromis assumé (une seule source de l'ordre, volume faible), à revoir si la file grossit.
