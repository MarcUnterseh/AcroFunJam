# language: fr
@Integration
Fonctionnalité: Proposer une modification d'une pose publiée
  Afin que le catalogue reste juste quand une pose publiée contient une erreur
  En tant que contributeur connecté
  Je veux proposer une modification d'une pose publiée, qu'un validateur accepte (au besoin avec ajustements)
  ou refuse, comme une proposition de pose

  # Story 6, contexte Contribution → Catalogue, cibles @api et @web (pas de mobile, comme les stories 3 à 5).
  # Carte d'example mapping et décisions du porteur du produit (2026-11-12) : decouverte.md, « Story 6 Proposer une
  # modification d'une pose publiée ». Scénarios @api et @web implémentés (API le 2026-11-12, site le 2026-11-13).
  #
  # Vocabulaire :
  # - proposition de modification : la demande (agrégat distinct de la proposition de pose) ;
  # - modification proposée / modification retenue : le contenu, avant et après les ajustements du validateur ;
  # - valeur d'avant : valeur de la pose figée au moment de la proposition (« Mes propositions ») ;
  # - valeur actuelle : valeur de la pose publiée au moment où on la lit (formulaire, file de validation) ;
  # - message de modification : texte facultatif du contributeur, destiné au validateur ;
  # - réviser une pose : commande du Catalogue ; sur le site, on dit que la pose est « modifiée ».
  #
  # Décisions principales (2026-11-12) :
  # - les cinq champs d'une pose sont modifiables, nom compris ; seuls les champs changés sont proposés (au moins un) ;
  # - une modification identique à la pose publiée, après normalisation, est irrecevable (la casse du nom compte) ;
  # - une seule modification en attente par pose, pour tous (règle simple, à revoir peut-être plus tard) ;
  # - contrôle de version : si la pose a changé depuis le début de la modification, celle-ci est irrecevable ;
  # - un validateur ou un administrateur publie directement sa modification ;
  # - la charte de validation (et non le modèle) fait refuser un renommage vers un autre nom en usage, ou une
  #   modification qui transforme la pose en une autre (« Bird » → « High Bird ») : refus avec motif ;
  # - la modification d'un compte supprimé reste dans la file de validation ; le validateur la refuse.
  #
  # Personnages, comme dans valider-une-proposition.feature : Alice et Chloé sont utilisatrices, Bruno est validateur,
  # Paul administrateur. Adresses : alice@example.org, chloe@example.org.
  # Hors périmètre : retirer une modification en attente ; plusieurs modifications en attente d'une même pose ;
  # historique consultable des versions d'une pose ; mention « modifiée le » dans le catalogue ; alias ; modification
  # d'une transition ; ajout de photos ; description ; retrait ou fusion d'une pose ; notification ; écran mobile ;
  # définitions concrètes des niveaux de difficulté.
  # Les règles sont vérifiées une fois côté @api ; @web vérifie le parcours sur le site.

  # ---------------------------------------------------------------------------------------------------
  # Qui propose, et ce que devient la modification
  # ---------------------------------------------------------------------------------------------------

  Règle: Une modification proposée par un utilisateur est en attente de validation et ne change pas la pose publiée

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est utilisateur

    @api
    Scénario: La modification proposée par un utilisateur est en attente de validation
      Quand Alice propose de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors la proposition de modification de la pose "Throne" par Alice est en attente de validation

    @api
    Scénario: Une modification en attente de validation ne change pas la pose, même pour son contributeur
      Soit Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Alice consulte les poses du catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "débutant" et la difficulté flyer "intermédiaire"

  # Y compris un renommage ou un changement d'indicateur vers « peut ».
  Règle: Une modification proposée par un validateur ou un administrateur est publiée directement

    @api
    Plan du Scénario: Une modification proposée par un <rôle> est publiée directement dans le catalogue
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Bruno est <rôle>
      Et Bruno a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "débutant" et la difficulté flyer "découverte"

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  Règle: Seule une personne connectée peut proposer une modification

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"

    @api
    Scénario: La modification proposée par un visiteur est irrecevable
      Quand un visiteur propose de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors la proposition est irrecevable car il faut être connecté

    # Décision de la story 3 : un compte supprimé est traité comme une session expirée.
    @api
    Scénario: La modification proposée par une personne dont le compte a été supprimé est irrecevable
      Soit Alice est utilisateur, connectée
      Et le compte d'Alice a été supprimé
      Quand Alice propose de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors la proposition est irrecevable car le compte n'existe plus et il faut se reconnecter

  Règle: Seule une pose publiée peut faire l'objet d'une modification

    @api
    Scénario: La modification d'une pose inconnue du catalogue est irrecevable
      Soit Alice est utilisateur
      Quand Alice propose de modifier une pose qui n'existe pas dans le catalogue
      Alors la proposition est irrecevable car la pose est introuvable dans le catalogue

  # ---------------------------------------------------------------------------------------------------
  # Contenu d'une modification (vérifié avec Alice, utilisatrice)
  # ---------------------------------------------------------------------------------------------------

  # Les cinq champs sont modifiables : nom, difficulté base, difficulté flyer, « peut commencer un flow »,
  # « peut terminer un flow ». Seuls les champs changés sont proposés.
  Règle: Une modification change au moins un champ de la pose ; les autres gardent leur valeur

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Plan du Scénario: Une modification acceptée de <champ> ne change que ce champ
      Soit la pose publiée "<pose>" de difficulté base "avancé" et de difficulté flyer "avancé", qui ne peut pas commencer un flow et peut terminer un flow
      Et Alice a proposé de modifier la pose "<pose>" en changeant <changement>
      Et Bruno a accepté la proposition de modification de la pose "<pose>" par Alice
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "<pose présentée>" est présentée avec la difficulté base "<base>" et la difficulté flyer "avancé", qui ne peut pas commencer un flow et <terminer> terminer un flow

      Exemples:
        | champ                                     | pose                  | changement                                                     | pose présentée        | base          | terminer    |
        | nom                                       | Hand-to-Hnad (L-base) | le nom en "Hand-to-Hand (L-base)"                              | Hand-to-Hand (L-base) | avancé        | peut        |
        | difficulté base                           | Hand-to-Hand (L-base) | la difficulté base en "intermédiaire"                          | Hand-to-Hand (L-base) | intermédiaire | peut        |
        | l'indicateur « peut terminer un flow »    | Hand-to-Hand (L-base) | l'indicateur « peut terminer un flow » en « ne peut pas »      | Hand-to-Hand (L-base) | avancé        | ne peut pas |

    # Comparaison après normalisation, comme pour les ajustements (story 4, Q15).
    @api
    Scénario: Une modification qui ne change rien à la pose est irrecevable
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice propose de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors la proposition est irrecevable car la modification ne change rien à la pose

    @api
    Scénario: Un nom modifié qui ne diffère que par des espaces superflus ne change rien à la pose
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice propose de modifier la pose "Throne" en changeant le nom en "  Throne  "
      Alors la proposition est irrecevable car la modification ne change rien à la pose

    @api
    Scénario: Une correction de la casse du nom est une modification
      Soit la pose publiée "throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice propose de modifier la pose "throne" en changeant le nom en "Throne"
      Alors la proposition de modification de la pose "throne" par Alice est en attente de validation

  # Mêmes règles de contenu que la story 3, appliquées aux valeurs proposées.
  Règle: Les valeurs proposées respectent les règles de contenu d'une pose

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice est utilisateur

    @api
    Plan du Scénario: Une modification avec un nom <cas> est irrecevable
      Quand Alice propose de modifier la pose "Throne" en changeant le nom en <nom>
      Alors la proposition est irrecevable car <motif>

      Exemples:
        | cas                                | nom                     | motif                             |
        | vide                               | ""                      | le nom de la pose est obligatoire |
        | fait uniquement de ponctuation     | "---"                   | le nom de la pose est obligatoire |
        | plus long que la longueur maximale | un nom de 61 caractères | le nom de la pose est trop long   |

    @api
    Scénario: Une modification avec une difficulté hors de l'échelle est irrecevable
      Quand Alice propose de modifier la pose "Throne" en changeant la difficulté base en "expert"
      Alors la proposition est irrecevable car le niveau de difficulté "expert" n'existe pas

  # Même clé de comparaison que pour une pose proposée ; la pose elle-même est mise à part (« throne » → « Throne »).
  Règle: Un nom modifié ne peut pas être celui d'une autre pose du catalogue ni d'une proposition en attente

    Contexte:
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et la pose publiée "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"

    @api
    Scénario: Un nom modifié déjà pris par une autre pose du catalogue est irrecevable
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice propose de modifier la pose "Thron" en changeant le nom en "throne"
      Alors la proposition est irrecevable car une pose de ce nom existe déjà dans le catalogue

    @api
    Scénario: Un nom modifié déjà pris par une proposition de pose en attente est irrecevable
      Soit Chloé a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice propose de modifier la pose "Thron" en changeant le nom en "Throne"
      Alors la proposition est irrecevable car une pose de ce nom est déjà en attente de validation

  Règle: Le nom proposé par une modification en attente est réservé, et l'ancien nom est libéré une fois le renommage accepté

    Contexte:
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Bruno est validateur
      Et la pose publiée "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé de modifier la pose "Thron" en changeant le nom en "Throne"

    @api
    Scénario: Un nom proposé par une modification en attente ne peut pas être proposé pour une nouvelle pose
      Quand Chloé propose une pose nommée "Throne"
      Alors la proposition est irrecevable car une pose de ce nom est déjà en attente de validation

    @api
    Scénario: L'ancien nom d'une pose renommée peut de nouveau être proposé
      Soit Bruno a accepté la proposition de modification de la pose "Thron" par Alice
      Quand Chloé propose une pose nommée "Thron"
      Alors la proposition de la pose "Thron" par Chloé est en attente de validation

  # Décision du 2026-11-12 : une seule à la fois, pour tous, validateurs compris. Règle simple, à revoir peut-être
  # plus tard. Retirer une modification en attente : hors périmètre.
  Règle: Une pose ne peut avoir qu'une seule modification en attente de validation

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est utilisateur
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"

    @api
    Scénario: Une seconde modification de la même pose est irrecevable
      Soit Chloé est utilisateur
      Quand Chloé propose de modifier la pose "Throne" en changeant la difficulté base en "intermédiaire"
      Alors la proposition est irrecevable car une modification de cette pose est déjà en attente de validation

    @api
    Scénario: Un validateur ne publie pas directement une modification d'une pose qui en a déjà une en attente
      Soit Bruno est validateur
      Quand Bruno propose de modifier la pose "Throne" en changeant la difficulté base en "intermédiaire"
      Alors la proposition est irrecevable car une modification de cette pose est déjà en attente de validation

    @api
    Scénario: Une pose peut de nouveau être modifiée une fois sa modification traitée
      Soit Bruno est validateur
      Et Chloé est utilisateur
      Et Bruno a refusé la proposition de modification de la pose "Throne" par Alice avec le motif « Throne reste intermédiaire côté flyer. »
      Quand Chloé propose de modifier la pose "Throne" en changeant la difficulté base en "intermédiaire"
      Alors la proposition de modification de la pose "Throne" par Chloé est en attente de validation

  # Contrôle de version : la modification part des valeurs actuelles lues au début de la modification.
  Règle: Une modification commencée sur une pose qui a changé entre-temps est irrecevable

    @api
    Scénario: La modification d'une pose modifiée entre-temps est irrecevable
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est utilisateur
      Et Bruno est validateur
      Et Alice a commencé à modifier la pose "Throne"
      Et Bruno a proposé entre-temps de modifier la pose "Throne" en changeant la difficulté base en "intermédiaire"
      Quand Alice propose la modification commencée en changeant la difficulté flyer en "découverte"
      Alors la proposition est irrecevable car la pose a changé depuis le début de la modification

  # Décision du 2026-11-12 : facultatif, mêmes règles que le message d'ajustement.
  Règle: Un message de modification facultatif peut expliquer la modification au validateur

    Contexte:
      Soit la pose publiée "Hand-to-Hand (L-base)" de difficulté base "avancé" et de difficulté flyer "avancé", qui ne peut pas commencer un flow et peut terminer un flow
      Et Alice est utilisateur

    @api
    Scénario: Le message de modification est conservé
      Quand Alice propose de modifier la pose "Hand-to-Hand (L-base)" en changeant l'indicateur « peut terminer un flow » en « ne peut pas », avec le message « Le flyer ne redescend pas sans danger depuis cette pose. »
      Alors la proposition de modification de la pose "Hand-to-Hand (L-base)" par Alice porte le message de modification « Le flyer ne redescend pas sans danger depuis cette pose. »

    @api
    Scénario: Les espaces superflus du message de modification sont supprimés
      Quand Alice propose de modifier la pose "Hand-to-Hand (L-base)" en changeant l'indicateur « peut terminer un flow » en « ne peut pas », avec le message «   Descente   dangereuse.  »
      Alors la proposition de modification de la pose "Hand-to-Hand (L-base)" par Alice porte le message de modification « Descente dangereuse. »

    @api
    Scénario: Un message de modification fait seulement d'espaces vaut absence de message
      Quand Alice propose de modifier la pose "Hand-to-Hand (L-base)" en changeant l'indicateur « peut terminer un flow » en « ne peut pas », avec le message «    »
      Alors la proposition de modification de la pose "Hand-to-Hand (L-base)" par Alice ne porte aucun message de modification

    @api
    Scénario: Un message de modification de la longueur maximale est accepté
      Quand Alice propose de modifier la pose "Hand-to-Hand (L-base)" en changeant l'indicateur « peut terminer un flow » en « ne peut pas », avec un message de 500 caractères
      Alors la proposition de modification de la pose "Hand-to-Hand (L-base)" par Alice est en attente de validation

    @api
    Scénario: Une modification avec un message plus long que la longueur maximale est irrecevable
      Quand Alice propose de modifier la pose "Hand-to-Hand (L-base)" en changeant l'indicateur « peut terminer un flow » en « ne peut pas », avec un message de 501 caractères
      Alors la proposition est irrecevable car le message de modification est trop long

  # ---------------------------------------------------------------------------------------------------
  # File de validation
  # ---------------------------------------------------------------------------------------------------

  # Même file, même ordre (la plus ancienne d'abord) et même nombre que les propositions de pose. Les valeurs
  # actuelles sont lues au moment de la consultation.
  Règle: La file de validation présente chaque modification en attente avec les valeurs actuelles et proposées des seuls champs modifiés

    Contexte:
      Soit Alice est utilisateur avec l'adresse "alice@example.org"
      Et Bruno est validateur
      Et la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"

    @api
    Scénario: La file de validation présente la modification, son contributeur et sa date de soumission
      Soit Alice a proposé le 2026-11-12 de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente exactement les modifications suivantes :
        | pose   | champ            | valeur actuelle | valeur proposée | contributeur      | soumise le |
        | Throne | difficulté flyer | intermédiaire   | découverte      | alice@example.org | 2026-11-12 |

    @api
    Scénario: La file de validation présente le message de modification
      Soit Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte", avec le message « Throne se découvre dès la première séance côté flyer. »
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la modification de la pose "Throne" avec le message de modification « Throne se découvre dès la première séance côté flyer. »

    @api
    Scénario: Les modifications et les propositions de pose en attente sont présentées ensemble, la plus ancienne d'abord
      Soit Alice a proposé le 2026-11-12 de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Et Alice a proposé le 2026-11-10 la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno consulte la file de validation
      Alors les propositions sont présentées dans cet ordre :
        | proposition            |
        | pose Star              |
        | modification de Throne |

    @api
    Scénario: Le nombre de propositions en attente compte les modifications
      Soit Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Et Alice a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno consulte le nombre de propositions en attente de validation
      Alors 2 propositions sont en attente de validation

    # Décision du 2026-11-12 : elle reste dans la file ; le validateur la refuse.
    @api
    Scénario: La modification d'un contributeur dont le compte a été supprimé reste dans la file de validation
      Soit Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Et le compte d'Alice a été supprimé
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la modification de la pose "Throne"

  # ---------------------------------------------------------------------------------------------------
  # Accepter ou refuser une modification (règles de la story 4)
  # ---------------------------------------------------------------------------------------------------

  Règle: Seul un validateur ou un administrateur accepte ou refuse une modification

    @api
    Scénario: Un utilisateur ne peut pas accepter une modification
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est utilisateur
      Et Chloé est utilisateur
      Et Chloé a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Alice accepte la proposition de modification de la pose "Throne" par Chloé
      Alors la décision est refusée car seul un validateur ou un administrateur accepte ou refuse une proposition

  # La pose garde son identité : le Catalogue la révise, il n'en publie pas une nouvelle.
  Règle: Accepter une modification révise la pose publiée

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Après l'acceptation d'un renommage, le catalogue ne présente la pose que sous son nouveau nom
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et la pose publiée "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé de modifier la pose "Thron" en changeant le nom en "Throne"
      Et Bruno a accepté la proposition de modification de la pose "Thron" par Alice
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom    | difficulté base | difficulté flyer |
        | Bird   | découverte      | découverte       |
        | Throne | débutant        | découverte       |

    # Pas d'historique consultable : la proposition garde la valeur d'avant pour la traçabilité.
    @api
    Scénario: La modification acceptée garde la valeur d'avant, son contributeur et le validateur qui l'a acceptée
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Bruno accepte le 2026-11-13 la proposition de modification de la pose "Throne" par Alice
      Alors la proposition de modification de la pose "Throne" par Alice est acceptée sans ajustement par Bruno le 2026-11-13
      Et la proposition garde la difficulté flyer d'avant "intermédiaire" et la difficulté flyer proposée "découverte"

  # Le validateur peut ajuster tout champ de la pose, avec les règles de la story 4 (comparaison après
  # normalisation, règles de contenu, unicité du nom, message d'ajustement réservé aux ajustements).
  Règle: Une modification acceptée avec ajustements révise la pose avec la modification retenue

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "avancé"
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "intermédiaire"

    @api
    Scénario: Le validateur corrige la valeur proposée avant d'accepter
      Soit Bruno a accepté la proposition de modification de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "débutant" et la difficulté flyer "découverte"

    @api
    Scénario: Le validateur ajuste un champ que la modification ne changeait pas
      Soit Bruno a accepté la proposition de modification de la pose "Throne" par Alice en corrigeant la difficulté base en "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "découverte" et la difficulté flyer "intermédiaire"

    @api
    Scénario: La modification acceptée avec ajustements garde la valeur proposée et la valeur retenue
      Quand Bruno accepte la proposition de modification de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte"
      Alors la proposition de modification de la pose "Throne" par Alice est acceptée avec ajustements par Bruno
      Et la proposition garde la difficulté flyer proposée "intermédiaire" et la difficulté flyer retenue "découverte"

    # Ramener la pose à ses valeurs actuelles revient à refuser la modification.
    @api
    Scénario: Une acceptation dont la modification retenue ne change rien à la pose est impossible
      Quand Bruno accepte la proposition de modification de la pose "Throne" par Alice en corrigeant la difficulté flyer en "avancé"
      Alors l'acceptation est impossible car la modification retenue ne change rien à la pose

  # Une pose de ce nom peut entrer dans le catalogue sans passer par une proposition (amorçage de données).
  Règle: Une modification dont le nom est pris entre-temps dans le catalogue ne peut pas être acceptée

    @api
    Scénario: L'acceptation est impossible quand une autre pose de ce nom est publiée entre-temps
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et la pose publiée "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé de modifier la pose "Thron" en changeant le nom en "Throne"
      Et la pose publiée "throne" de difficulté base "intermédiaire" et de difficulté flyer "débutant"
      Quand Bruno accepte la proposition de modification de la pose "Thron" par Alice
      Alors l'acceptation est impossible car une pose de ce nom existe déjà dans le catalogue

  # Motif de refus : obligatoire, 500 caractères au plus (story 4) ; ses cas limites ne sont pas répétés ici.
  # Charte de validation (décision du 2026-11-12, pas une règle du modèle) : un renommage vers un autre nom en usage,
  # ou une modification qui transforme la pose en une autre, est refusé avec un motif.
  Règle: Refuser une modification laisse la pose publiée inchangée et en garde le motif

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Alice a proposé de modifier la pose "Bird" en changeant le nom en "High Bird"

    @api
    Scénario: Une modification qui transforme la pose en une autre est refusée avec son motif
      Quand Bruno refuse la proposition de modification de la pose "Bird" par Alice avec le motif « High Bird est une autre pose : propose-la comme nouvelle pose. »
      Alors la proposition de modification de la pose "Bird" par Alice est refusée par Bruno avec le motif « High Bird est une autre pose : propose-la comme nouvelle pose. »

    @api
    Scénario: La pose d'une modification refusée reste inchangée dans le catalogue
      Soit Bruno a refusé la proposition de modification de la pose "Bird" par Alice avec le motif « High Bird est une autre pose : propose-la comme nouvelle pose. »
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom  | difficulté base | difficulté flyer |
        | Bird | découverte      | découverte       |

    @api
    Scénario: Un refus de modification sans motif est impossible
      Quand Bruno refuse la proposition de modification de la pose "Bird" par Alice sans motif
      Alors le refus est impossible car le motif de refus est obligatoire

  Règle: Une modification déjà traitée ne peut plus être ni acceptée ni refusée

    @api
    Scénario: Une modification déjà acceptée ne peut plus être refusée
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Paul est administrateur
      Et la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Et Paul a accepté la proposition de modification de la pose "Throne" par Alice
      Quand Bruno refuse la proposition de modification de la pose "Throne" par Alice avec le motif « Throne reste intermédiaire côté flyer. »
      Alors la décision est impossible car la proposition a déjà été traitée

  # ---------------------------------------------------------------------------------------------------
  # Mes propositions
  # ---------------------------------------------------------------------------------------------------

  # Décisions du 2026-11-12 : liste unique avec les propositions de pose ; la modification porte le nom de la pose au
  # moment de la proposition ; la valeur d'avant est figée. Pour une modification acceptée avec ajustements, deux
  # blocs : « Ce qui change dans la pose » (avant → retenu) et « Ajustements apportés » (proposé → retenu).
  Règle: Le contributeur suit ses modifications dans « Mes propositions »

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une modification en attente présente la valeur d'avant et la valeur proposée des champs modifiés
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice a proposé le 2026-11-12 de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Alice consulte ses propositions
      Alors ses propositions présentent exactement les modifications suivantes :
        | pose   | champ            | valeur d'avant | valeur proposée | statut                   | soumise le |
        | Throne | difficulté flyer | intermédiaire  | découverte      | en attente de validation | 2026-11-12 |

    @api
    Scénario: Une modification acceptée garde le nom de la pose au moment de la proposition
      Soit la pose publiée "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé de modifier la pose "Thron" en changeant le nom en "Throne"
      Et Bruno a accepté la proposition de modification de la pose "Thron" par Alice
      Quand Alice consulte ses propositions
      Alors ses propositions présentent la modification de la pose "Thron", nom « Thron » → « Throne », acceptée

    @api
    Scénario: Une modification acceptée avec ajustements présente ce qui change dans la pose et les ajustements apportés
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "avancé"
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "intermédiaire"
      Et Bruno a accepté la proposition de modification de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte"
      Quand Alice consulte ses propositions
      Alors la modification de la pose "Throne" présente, dans ce qui change dans la pose, la difficulté flyer « avancé » → « découverte »
      Et la modification de la pose "Throne" présente, dans les ajustements apportés, la difficulté flyer « intermédiaire » → « découverte »

    @api
    Scénario: Une modification refusée présente le motif de refus
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Et Bruno a refusé la proposition de modification de la pose "Throne" par Alice avec le motif « Throne reste intermédiaire côté flyer. »
      Quand Alice consulte ses propositions
      Alors la modification de la pose "Throne" est présentée comme refusée avec le motif « Throne reste intermédiaire côté flyer. »

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # Entrée : le lien « Proposer une modification » de chaque carte du catalogue (nom accessible « Proposer une
  # modification de <nom> »), réservé aux personnes connectées. Page dédiée, préremplie avec les valeurs actuelles
  # (« Actuellement : … »), chaque champ changé marqué « Modifiée ».
  # ---------------------------------------------------------------------------------------------------

  Règle: Seule une personne connectée est invitée à proposer une modification depuis le catalogue

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"

    @web
    Scénario: Un visiteur n'est pas invité à proposer une modification
      Quand un visiteur consulte les poses du catalogue
      Alors le catalogue n'invite pas à proposer une modification de la pose "Throne"

    @web
    Scénario: Une personne connectée est invitée à proposer une modification d'une pose du catalogue
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte les poses du catalogue
      Alors le catalogue invite à proposer une modification de la pose "Throne"

    @web
    Scénario: Le formulaire de modification présente les valeurs actuelles de la pose
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice commence à proposer sur le site une modification de la pose "Throne"
      Alors le formulaire de modification présente la pose "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"

  Règle: Un visiteur qui accède directement au formulaire de modification doit d'abord se connecter

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"

    @web
    Scénario: Un visiteur qui accède directement au formulaire de modification est invité à se connecter
      Quand un visiteur accède directement à la page « Proposer une modification » de la pose "Throne"
      Alors le site invite le visiteur à se connecter, sans lui présenter le formulaire de modification

    @web
    Scénario: Après la connexion, la personne arrive sur le formulaire de modification de la pose
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Et Alice a accédé directement à la page « Proposer une modification » de la pose "Throne" en tant que visiteur
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors Alice peut proposer une modification de la pose "Throne"

    @web
    Scénario: Le site signale une pose introuvable
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice accède directement à la page « Proposer une modification » d'une pose qui n'existe pas dans le catalogue
      Alors le site indique « Cette pose n'est plus dans le catalogue. »

  # Décision du 2026-11-12 : signalé dès l'ouverture du formulaire ; l'API refuse aussi à l'envoi.
  Règle: Le site signale dès l'ouverture du formulaire qu'une modification de la pose est déjà en attente

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: Le site signale une modification déjà en attente proposée par une autre personne
      Soit Chloé a proposé de modifier la pose "Throne" en changeant la difficulté base en "intermédiaire"
      Quand Alice commence à proposer sur le site une modification de la pose "Throne"
      Alors le site indique « Une modification de cette pose est déjà en attente de validation. Tu pourras en proposer une autre une fois qu'elle aura été traitée. »

    @web
    Scénario: Le site signale au contributeur sa propre modification déjà en attente
      Soit Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Alice commence à proposer sur le site une modification de la pose "Throne"
      Alors le site indique « Tu as déjà proposé une modification de cette pose. Elle est en attente de validation. »
      Et le site propose à Alice de voir ses propositions

  # Pas de récapitulatif pour un utilisateur (décision du 2026-11-12).
  Règle: Sur le site, le contributeur sait ce que devient sa modification

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"

    @web
    Scénario: Un utilisateur qui propose une modification est informé qu'elle est envoyée
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice propose sur le site de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors le site indique « Merci, ta modification est envoyée. »

    @web
    Scénario: Un validateur voit un récapitulatif avant de publier directement sa modification
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno prépare sur le site la modification de la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors le site présente à Bruno, avant de publier, la difficulté flyer actuellement « intermédiaire » → nouvelle « découverte »

    @web
    Scénario: Un validateur qui publie directement sa modification est informé que la pose est modifiée
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno propose sur le site de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors le site indique « La pose « Throne » est modifiée dans le catalogue. »

  Règle: Le site explique pourquoi une modification n'est pas reçue

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: Le site signale une modification qui ne change rien avant de l'envoyer
      Quand Alice propose sur le site de modifier la pose "Throne" sans rien changer
      Alors le site indique « Tu n'as rien modifié. Change au moins une valeur pour proposer une modification. »

    @web
    Scénario: Le site signale sous le nom qu'une pose de ce nom existe déjà dans le catalogue
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Quand Alice propose sur le site de modifier la pose "Throne" en changeant le nom en "bird"
      Alors le site indique pour le nom « Une pose de ce nom existe déjà dans le catalogue. »

  # Contrôle de version : la saisie est gardée et les nouvelles valeurs actuelles sont affichées.
  Règle: Le site signale une pose qui a changé pendant la saisie, sans perdre la modification saisie

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et Bruno est validateur
      Et Alice a commencé à proposer sur le site une modification de la pose "Throne"
      Et Bruno a proposé entre-temps de modifier la pose "Throne" en changeant la difficulté base en "intermédiaire"

    @web
    Scénario: Le site signale que la pose a changé pendant la saisie
      Quand Alice propose sur le site sa modification en changeant la difficulté flyer en "découverte"
      Alors le site indique « Cette pose a changé pendant que tu la modifiais. Ses nouvelles valeurs sont affichées : vérifie ta modification, puis envoie-la de nouveau. »

    @web
    Scénario: Le formulaire présente les nouvelles valeurs de la pose et garde la modification saisie
      Quand Alice propose sur le site sa modification en changeant la difficulté flyer en "découverte"
      Alors le formulaire de modification présente la difficulté base actuelle "intermédiaire" et la difficulté flyer saisie "découverte"

  Règle: Le site conserve la modification saisie quand elle n'a pas pu aboutir

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: Le site signale qu'AcroFunJam est injoignable et conserve la modification saisie
      Soit AcroFunJam est momentanément injoignable
      Quand Alice propose sur le site de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors le site indique que la proposition n'a pas pu aboutir et qu'Alice peut réessayer
      Et la modification de la pose "Throne" saisie par Alice est conservée

    @web
    Scénario: Le formulaire de modification signale que la session a expiré pendant la saisie
      Soit la session d'Alice a expiré
      Quand Alice propose sur le site de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Alors le formulaire de modification informe Alice que sa session a expiré et qu'elle peut se connecter de nouveau

    @web
    Scénario: Après s'être reconnectée, la personne retrouve sa modification sur le formulaire de la même pose
      Soit la session d'Alice a expiré
      Et Alice a tenté de proposer sur le site de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Alice se connecte de nouveau sur le site
      Alors Alice retrouve dans le formulaire de modification de la pose "Throne" la difficulté flyer "découverte"

  # Carte « Modification de <nom> » ; boutons « Accepter la modification », « Ajuster avant d'accepter », « Refuser »
  # (règle d'interface, sans scénario dédié). Après l'acceptation, la carte présente la pose modifiée.
  Règle: Sur le site, le validateur voit ce que change une modification avant de décider

    Contexte:
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est utilisateur avec l'adresse "alice@example.org"
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Et Bruno est validateur, connecté sur le site

    @web
    Scénario: Le validateur voit sur le site la valeur actuelle et la valeur proposée
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la modification de la pose "Throne" par "alice@example.org", difficulté flyer « intermédiaire » → « découverte »

    @web
    Scénario: Le validateur qui accepte une modification est informé que la pose est modifiée
      Quand Bruno accepte sur le site la proposition de modification de la pose "Throne" par Alice
      Alors le site indique « La pose « Throne » est modifiée dans le catalogue. »

  Règle: Sur le site, le contributeur suit ses modifications dans « Mes propositions »

    @web
    Scénario: « Mes propositions » présente une modification en attente avec la valeur d'avant et la valeur proposée
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et Alice a proposé de modifier la pose "Throne" en changeant la difficulté flyer en "découverte"
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la modification de la pose "Throne", difficulté flyer « intermédiaire » → « découverte », en attente de validation
