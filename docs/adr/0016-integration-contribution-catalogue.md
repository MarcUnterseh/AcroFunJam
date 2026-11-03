# 0016. Intégration Contribution → Catalogue et Identité → Contribution

- Statut : accepté
- Date : 2026-11-03

## Contexte
La publication directe (story 3), puis l'acceptation d'une proposition (story suivante), doivent créer une pose dans le Catalogue, qui reste maître de ses invariants (nom unique). Contribution doit aussi savoir si le contributeur est validateur, d'après son rôle **courant**, sans lire les claims. Aucun dispatcher d'événements n'existe encore. Le test d'isolation interdit à un contexte de référencer les types d'un autre.

## Options envisagées
1. **Appel synchrone en processus**, via un port de Contribution implémenté par un adaptateur qui invoque la commande du Catalogue, dans **la même transaction** : jamais d'état « acceptée mais non publiée ». Deux agrégats sont modifiés par une même commande.
2. Événement `PoseProposalAccepted` consommé par le Catalogue (cohérence à terme) : découplage, mais il faut un dispatcher, une boîte d'envoi et une compensation quand le Catalogue refuse.

## Décision
- Option 1, relation Customer / Supplier. Ports définis dans `Application/Contribution` :
  - `ICatalogPublisher.PublishPose(PoseProposalId, ProposedPose)` : publie via `ICommandHandler<PublishPose, PoseId>` du Catalogue ; l'erreur `catalog.pose-name-taken` est traduite en `contribution.pose-name-already-in-catalog` ;
  - `ICatalogPoseNames.IsPublished(PoseNameKey)` : interroge la query `IsPoseNamePublished` du Catalogue ;
  - `IContributors.Find(ContributorId)` → `Contributor(ContributorId, IsValidator)` ou `null` : interroge `GetMyAccount` d'Identité et traduit `Role.Grants(ValidateProposals)` (relation Conformist).
- Les adaptateurs qui voient deux contextes vivent dans `AcroFunJam.Infrastructure.ContextIntegration`, hors de tout espace de noms de contexte : c'est la seule couche autorisée à connaître les deux côtés.
- Publication directe : `ProposePoseHandler` soumet la proposition, appelle `ICatalogPublisher` si elle est acceptée, ajoute la proposition, puis sauvegarde, le tout dans la transaction ouverte par `IPoseNameReservation` (ADR 0017). Si le Catalogue refuse, rien n'est enregistré. Exception assumée à « une commande, un agrégat », limitée à la publication.
- `IUnitOfWork` est câblé (`EfUnitOfWork`) : il sauvegarde le `DbContext`, renvoie en erreur métier la violation d'un index unique déclaré par un contexte (ADR 0017) et efface les événements de domaine des agrégats ajoutés. Aucun abonné pour l'instant.
- `PgPoseNameReservation` vit aussi dans `ContextIntegration` : la réservation sérialise des noms qui appartiennent aux deux contextes.

## Conséquences
- Si un abonné apparaît (projection, notification), les événements seront diffusés **après le commit** de la transaction, et non après `SaveChanges` : dans une réservation, plusieurs `SaveChanges` précèdent un commit qui peut ne jamais avoir lieu. Il faudra donc une boîte d'envoi (*outbox*) écrite dans la transaction, ou une diffusion déclenchée par le commit.
- Un découpage en services imposerait de passer à l'option 2.
