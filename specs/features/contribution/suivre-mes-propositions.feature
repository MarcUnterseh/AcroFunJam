# language: fr
@Integration
Fonctionnalité: Suivre mes propositions
  Afin de savoir ce que sont devenues les poses que j'ai proposées
  En tant que contributeur connecté
  Je veux consulter la liste de mes propositions de pose, avec le statut de chacune et, selon le cas, le détail des
  ajustements, le message d'ajustement ou le motif de refus

  # Story 5, contexte Contribution, cibles @api et @web. Livrée dans la même mise en production que la story 4
  # « Valider une proposition ». Carte d'example mapping et décisions du porteur du produit (2026-11-09) :
  # decouverte.md, « Story 5 Suivre mes propositions ».
  # Décisions du 2026-11-04 : le contributeur voit le détail des ajustements champ par champ (proposé → retenu), le
  # message d'ajustement facultatif et le motif de refus ; il ne voit pas quel validateur a décidé.
  # Décisions du 2026-11-09 : une proposition acceptée (avec ou sans ajustements) présente la pose retenue, celle du
  # catalogue ; une proposition en attente, refusée ou publiée directement présente la pose proposée. Les publications
  # directes figurent dans la liste, sans date de décision. La plus récemment soumise d'abord.
  # Personnages, comme dans valider-une-proposition.feature : Alice et Chloé sont utilisatrices, Bruno est validateur,
  # Paul administrateur.
  # Hors périmètre : entrée dans l'en-tête (refonte à concevoir), notification d'une décision, retirer ou amender sa
  # proposition, formulaire prérempli pour reproposer une pose refusée, lien vers la pose publiée, pagination,
  # propositions de transition, de modification ou de photos, écran mobile.
  # Les règles sont vérifiées une fois côté @api ; @web vérifie le parcours sur le site.

  # ---------------------------------------------------------------------------------------------------
  # Qui consulte, et quelles propositions
  # ---------------------------------------------------------------------------------------------------

  # Toute personne qui peut proposer peut suivre ses propositions : utilisateur, validateur, administrateur.
  Règle: Une personne connectée consulte ses propositions, quel que soit son rôle

    @api
    Plan du Scénario: Un <rôle> consulte ses propositions
      Soit Alice est <rôle>
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice consulte ses propositions
      Alors ses propositions présentent exactement les poses suivantes :
        | pose   |
        | Throne |

      Exemples:
        | rôle           |
        | utilisateur    |
        | validateur     |
        | administrateur |

    @api
    Scénario: Un visiteur ne peut pas consulter de propositions
      Quand un visiteur consulte ses propositions
      Alors la consultation est refusée car il faut être connecté

    # Décision de la story 3 : un compte supprimé est traité comme une session expirée.
    @api
    Scénario: Une personne dont le compte a été supprimé ne peut plus consulter ses propositions
      Soit Alice est utilisateur, connectée
      Et le compte d'Alice a été supprimé
      Quand Alice consulte ses propositions
      Alors la consultation est refusée car le compte n'existe plus et il faut se reconnecter

  Règle: Le contributeur ne voit que ses propres propositions

    @api
    Scénario: Les propositions d'un autre contributeur ne sont pas présentées
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Chloé a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Alice consulte ses propositions
      Alors ses propositions présentent exactement les poses suivantes :
        | pose   |
        | Throne |

    @api
    Scénario: Un contributeur qui n'a rien proposé est informé qu'il n'a encore proposé aucune pose
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Chloé a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Alice consulte ses propositions
      Alors Alice est informée qu'elle n'a encore proposé aucune pose

  # ---------------------------------------------------------------------------------------------------
  # Ce que présente chaque proposition
  # ---------------------------------------------------------------------------------------------------

  # Décision du 2026-11-09 : une proposition acceptée présente la pose retenue, celle du catalogue, nom retenu compris.
  Règle: Une proposition présente la pose retenue si elle est acceptée, la pose proposée sinon

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une proposition en attente présente la pose proposée et sa date de soumission
      Soit Alice a proposé le 2026-11-03 la pose "Hand-to-Hand (L-base)" de difficulté base "avancé" et de difficulté flyer "avancé", qui ne peut pas commencer un flow et ne peut pas terminer un flow
      Quand Alice consulte ses propositions
      Alors ses propositions présentent exactement les propositions suivantes :
        | pose                  | difficulté base | difficulté flyer | commencer   | terminer    | soumise le |
        | Hand-to-Hand (L-base) | avancé          | avancé           | ne peut pas | ne peut pas | 2026-11-03 |

    @api
    Scénario: Une proposition acceptée avec ajustements présente la pose retenue, celle du catalogue
      Soit Alice a proposé le 2026-11-03 la pose "throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Bruno a accepté la proposition de la pose "throne" par Alice en corrigeant le nom en "Throne" et la difficulté flyer en "découverte"
      Quand Alice consulte ses propositions
      Alors ses propositions présentent exactement les propositions suivantes :
        | pose   | difficulté base | difficulté flyer | soumise le |
        | Throne | débutant        | découverte       | 2026-11-03 |

    @api
    Scénario: Une proposition refusée présente la pose proposée
      Soit Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "intermédiaire"
      Et Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Quand Alice consulte ses propositions
      Alors ses propositions présentent exactement les propositions suivantes :
        | pose       | difficulté base | difficulté flyer |
        | Front Bird | découverte      | intermédiaire    |

  Règle: Chaque proposition présente son statut et, une fois acceptée ou refusée, sa date de décision

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Chaque proposition présente son statut
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Alice a proposé la pose "Bird" de difficulté base "découverte" et de difficulté flyer "intermédiaire"
      Et Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Bruno a accepté la proposition de la pose "Star" par Alice
      Et Bruno a accepté la proposition de la pose "Bird" par Alice en corrigeant la difficulté flyer en "découverte"
      Et Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Quand Alice consulte ses propositions
      Alors les propositions d'Alice ont les statuts suivants :
        | pose       | statut                    |
        | Throne     | en attente de validation  |
        | Star       | acceptée                  |
        | Bird       | acceptée avec ajustements |
        | Front Bird | refusée                   |

    # Au jour près, sans heure.
    @api
    Scénario: Une proposition acceptée présente sa date de décision
      Soit Alice a proposé le 2026-11-03 la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno a accepté le 2026-11-05 la proposition de la pose "Throne" par Alice
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "Throne" est présentée à Alice comme acceptée le 2026-11-05

  # Décision du 2026-11-09 (Q19) : statut « publiée directement », sans date de décision.
  Règle: Une pose publiée directement figure parmi les propositions de son contributeur

    @api
    Scénario: La pose publiée directement par un validateur est présentée comme publiée directement, sans date de décision
      Soit Bruno est validateur
      Et Bruno a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno consulte ses propositions
      Alors la proposition de la pose "Throne" est présentée à Bruno comme publiée directement, sans date de décision

  # Décision du 2026-11-04 (Q13) : détail champ par champ. Comparaison après normalisation (Q15) : seuls les champs
  # réellement ajustés sont présentés ; une correction de casse du nom est un ajustement. Une proposition acceptée
  # avec ajustements est désignée par son nom retenu, et par son nom proposé quand ils diffèrent.
  Règle: Une proposition acceptée avec ajustements présente chaque champ ajusté, avec la valeur proposée et la valeur retenue

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Seuls les champs ajustés sont présentés, avec la valeur proposée et la valeur retenue
      Soit Alice a proposé la pose "throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Bruno a accepté la proposition de la pose "throne" par Alice en corrigeant le nom en "Throne" et la difficulté flyer en "découverte"
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "Throne", proposée sous le nom "throne", présente exactement les ajustements suivants :
        | champ            | proposé       | retenu     |
        | nom              | throne        | Throne     |
        | difficulté flyer | intermédiaire | découverte |

    # Enjeu de sécurité : « peut terminer » signifie que le flyer redescend au sol directement et sans danger.
    @api
    Scénario: Un indicateur de flow ajusté est présenté avec la valeur proposée et la valeur retenue
      Soit Alice a proposé la pose "Hand-to-Hand (L-base)" qui ne peut pas commencer un flow et peut terminer un flow
      Et Bruno a accepté la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow »
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "Hand-to-Hand (L-base)" présente exactement les ajustements suivants :
        | champ                 | proposé | retenu      |
        | peut terminer un flow | peut    | ne peut pas |

    @api
    Scénario: Une proposition acceptée sans ajustement ne présente aucun ajustement
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno a accepté la proposition de la pose "Throne" par Alice
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "Throne" est présentée à Alice comme acceptée, sans ajustement

  # Décision du 2026-11-04 (Q14) : le message est facultatif et n'accompagne qu'une acceptation avec ajustements.
  Règle: Une proposition acceptée avec ajustements présente le message d'ajustement du validateur, s'il y en a un

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Hand-to-Hand (L-base)" qui ne peut pas commencer un flow et peut terminer un flow

    @api
    Scénario: Le message d'ajustement est présenté au contributeur
      Soit Bruno a accepté la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow », avec le message « Le flyer ne redescend pas sans danger depuis cette pose. »
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "Hand-to-Hand (L-base)" présente le message d'ajustement « Le flyer ne redescend pas sans danger depuis cette pose. »

    @api
    Scénario: Une acceptation avec ajustements sans message ne présente aucun message
      Soit Bruno a accepté la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow »
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "Hand-to-Hand (L-base)" ne présente aucun message d'ajustement

  Règle: Une proposition refusée présente le motif de refus

    @api
    Scénario: Le motif de refus est présenté au contributeur
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "Front Bird" présente le motif de refus « Doublon de Bird, déjà au catalogue. »

  # Décision du 2026-11-04 (Q12) : le contributeur ne voit pas quel validateur a décidé, ni par son adresse, ni par
  # un « toi » (cas du validateur qui décide de sa propre proposition, story 4). L'absence à l'écran est vérifiée
  # par des tests unitaires du site.
  Règle: Rien ne désigne au contributeur le validateur qui a décidé

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur avec l'adresse "bruno@example.org"
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"

    @api
    Plan du Scénario: Une proposition <statut> ne désigne pas le validateur qui l'a traitée
      Soit Bruno a <décision>
      Quand Alice consulte ses propositions
      Alors la proposition de la pose "<pose>" ne désigne pas le validateur qui l'a traitée

      Exemples:
        | statut                    | pose       | décision                                                                                                      |
        | acceptée avec ajustements | Throne     | accepté la proposition de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte"        |
        | refusée                   | Front Bird | refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. » |

  # ---------------------------------------------------------------------------------------------------
  # Ordre de la liste
  # ---------------------------------------------------------------------------------------------------

  # Décision du 2026-11-09 (Q20) : la plus récemment soumise d'abord ; à date égale, l'ordre du catalogue sur le nom.
  Règle: Les propositions sont présentées de la plus récente à la plus ancienne

    @api
    Scénario: Les propositions du contributeur sont présentées de la plus récemment soumise à la plus ancienne
      Soit Alice est utilisateur
      Et Alice a proposé le 2026-11-01 la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Alice a proposé le 2026-11-03 la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé le 2026-11-02 la pose "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Quand Alice consulte ses propositions
      Alors ses propositions sont présentées dans cet ordre :
        | pose   |
        | Throne |
        | Bird   |
        | Star   |

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site (décisions du 2026-11-09, Q22 et Q23)
  # Entrée : le lien « Mes propositions » du catalogue, à côté de « Proposer une pose », et « Voir mes propositions »
  # dans la confirmation de « Proposer une pose ». Pas d'entrée dans l'en-tête dans cette story.
  # Vérifiés en tests unitaires du site, sans scénario : site à mettre à jour, « Réessayer » qui réussit,
  # absence d'adresse et de « toi », statut inconnu (« Statut indisponible. Recharge la page. »),
  # lien de confirmation pour un statut illisible, refus présenté en style information, format des dates
  # (« Proposée le 3 novembre 2026 », « Acceptée le 5 novembre 2026 »).
  # ---------------------------------------------------------------------------------------------------

  Règle: Le catalogue invite toute personne connectée à voir ses propositions

    @web
    Plan du Scénario: Le catalogue invite un <rôle> à voir ses propositions
      Soit Alice est <rôle>, connectée sur le site
      Quand Alice consulte les poses du catalogue
      Alors le catalogue invite Alice à voir ses propositions

      Exemples:
        | rôle        |
        | utilisateur |
        | validateur  |

    @web
    Scénario: Le catalogue n'invite pas un visiteur à voir des propositions
      Quand un visiteur consulte les poses du catalogue
      Alors le catalogue n'invite pas le visiteur à voir des propositions

  Règle: Un visiteur qui accède directement à la page « Mes propositions » doit d'abord se connecter

    @web
    Scénario: Un visiteur qui accède directement à la page « Mes propositions » est invité à se connecter
      Quand un visiteur accède directement à la page « Mes propositions »
      Alors le site invite le visiteur à se connecter, sans lui présenter de propositions

    @web
    Scénario: Après la connexion, la personne arrive sur ses propositions
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Et Alice a accédé directement à la page « Mes propositions » en tant que visiteur
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors le site présente ses propositions à Alice

  # Le lien figure aussi pour un statut illisible (vérifié en test unitaire), pas pour une publication directe.
  Règle: La confirmation d'une proposition en attente invite à voir ses propositions

    @web
    Scénario: Depuis la confirmation d'une proposition, le contributeur retrouve sa proposition en attente de validation
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et Alice a proposé sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice choisit de voir ses propositions
      Alors le site présente à Alice sa proposition de la pose "Throne" en attente de validation

    @web
    Scénario: La confirmation d'une publication directe n'invite pas à voir ses propositions
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno propose sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors la confirmation n'invite pas Bruno à voir ses propositions

  Règle: Sur le site, le contributeur voit ce que sont devenues ses propositions

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @web
    Scénario: Le site présente une proposition acceptée comme publiée dans le catalogue
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno a accepté la proposition de la pose "Throne" par Alice
      Et Alice est connectée sur le site
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la proposition de la pose "Throne" comme acceptée et publiée dans le catalogue

    @web
    Scénario: Le site présente une pose publiée directement
      Soit Bruno a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Bruno est connecté sur le site
      Quand Bruno consulte ses propositions sur le site
      Alors le site présente la proposition de la pose "Star" comme publiée directement dans le catalogue

    @web
    Scénario: Le site présente la pose retenue, les ajustements et le message d'une proposition acceptée avec ajustements
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Bruno a accepté la proposition de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte", avec le message « Throne se découvre dès la première séance côté flyer. »
      Et Alice est connectée sur le site
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la proposition de la pose "Throne" comme acceptée avec ajustements, de difficulté flyer "découverte"
      Et le site présente la difficulté flyer proposée "intermédiaire" et retenue "découverte"
      Et le site présente le message d'ajustement « Throne se découvre dès la première séance côté flyer. »

    @web
    Scénario: Le site présente le motif d'une proposition refusée
      Soit Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Et Alice est connectée sur le site
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la proposition de la pose "Front Bird" comme refusée, avec le motif « Doublon de Bird, déjà au catalogue. »

    @web
    Scénario: Le site signale qu'aucune pose n'a encore été proposée et invite à en proposer une
      Soit Alice est connectée sur le site
      Quand Alice consulte ses propositions sur le site
      Alors le site indique « Tu n'as encore proposé aucune pose. »
      Et le site invite Alice à proposer une pose

  # Un incident technique ne doit pas passer pour une liste vide.
  Règle: Le site signale que les propositions n'ont pas pu être chargées

    @web
    Scénario: Le site signale qu'AcroFunJam est injoignable et propose de réessayer
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et AcroFunJam est momentanément injoignable
      Quand Alice consulte ses propositions sur le site
      Alors le site indique que les propositions n'ont pas pu être chargées et qu'Alice peut réessayer

    # Sur cette page, un bloc durable de la page remplace le bandeau global « session expirée ».
    @web
    Scénario: La page signale une session expirée pendant la consultation
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et la session d'Alice a expiré
      Quand Alice consulte ses propositions sur le site
      Alors la page « Mes propositions » informe Alice que sa session a expiré et qu'elle peut se connecter de nouveau

  # Les propositions d'une personne ne restent pas à l'écran une fois qu'elle s'est déconnectée.
  Règle: Après une déconnexion, les propositions ne sont plus présentées

    @web
    Scénario: Après une déconnexion, les propositions ne sont plus présentées
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice consulte ses propositions sur le site
      Quand Alice se déconnecte
      Alors le site ne présente plus les propositions d'Alice
