# language: fr
@Integration
Fonctionnalité: Valider une proposition
  Afin que seules des poses vérifiées entrent dans le catalogue
  En tant que validateur ou administrateur
  Je veux consulter les propositions de pose en attente de validation, puis accepter chacune, au besoin après
  l'avoir ajustée (elle est publiée dans le catalogue), ou la refuser

  # Story 4, contexte Contribution → Catalogue, cibles @api et @web. Carte d'example mapping et décisions du porteur
  # du produit (2026-11-04) : decouverte.md, « Story 4 Valider une proposition ». Étape A (consulter, accepter
  # telle quelle, refuser) et étape B (ajustements, message d'ajustement) implémentées côté @api ; restent @wip les
  # scénarios @web et les décisions simultanées (vérifiées par un test d'intégration).
  # Personnages, comme dans proposer-une-pose.feature : Alice et Chloé sont utilisatrices, Bruno est validateur,
  # Paul administrateur. Adresses : alice@example.org, chloe@example.org, bruno@example.org.
  # Exemples d'indicateurs relus par l'expert acroyoga : Bird, Throne et Star peuvent commencer et terminer un flow ;
  # Hand-to-Hand (L-base) (avancé / avancé) ne peut ni l'un ni l'autre.
  # Hors périmètre : « Suivre mes propositions » (story 5, même mise en production : le contributeur y voit le statut,
  # les ajustements et le motif de refus) ; retirer sa propre proposition ; propositions de transition, de
  # modification ou de photos ; avertir le contributeur par e-mail ; retirer une pose publiée.
  # Accepter = publier dans le catalogue, dans la même transaction (context-map.md) : si le catalogue refuse,
  # rien n'est publié et la proposition reste en attente de validation.
  # À l'écran, on parle de « Propositions à valider » (en acroyoga, « valider une figure » veut dire la réussir).
  # Les règles sont vérifiées une fois côté @api ; @web vérifie le parcours sur le site.
  # @Integration : rôles réels, publication et décisions concurrentes vérifiées sur un vrai PostgreSQL.

  # ---------------------------------------------------------------------------------------------------
  # Qui consulte la file de validation et décide
  # ---------------------------------------------------------------------------------------------------

  Règle: Seul un validateur ou un administrateur consulte la file de validation

    @api
    Plan du Scénario: Un <rôle> consulte la file de validation
      Soit Alice est utilisateur
      Et Bruno est <rôle>
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Throne" par Alice

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api
    Scénario: Un utilisateur ne peut pas consulter la file de validation
      Soit Alice est utilisateur
      Quand Alice consulte la file de validation
      Alors la consultation est refusée car seul un validateur ou un administrateur consulte la file de validation

    @api
    Scénario: Un visiteur ne peut pas consulter la file de validation
      Quand un visiteur consulte la file de validation
      Alors la consultation est refusée car il faut être connecté

    # Décision de la story 3 : un compte supprimé est traité comme une session expirée.
    @api
    Scénario: Un validateur dont le compte a été supprimé ne peut plus consulter la file de validation
      Soit Bruno est validateur, connecté
      Et le compte de Bruno a été supprimé
      Quand Bruno consulte la file de validation
      Alors la consultation est refusée car le compte n'existe plus et il faut se reconnecter

  Règle: Seul un validateur ou un administrateur accepte ou refuse une proposition

    Contexte:
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Chloé a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"

    @api
    Plan du Scénario: Un utilisateur ne peut pas <décider> une proposition
      Quand Alice <décision>
      Alors la décision est refusée car seul un validateur ou un administrateur accepte ou refuse une proposition

      Exemples:
        | décider  | décision                                                                                           |
        | accepter | accepte la proposition de la pose "Throne" par Chloé                                               |
        | refuser  | refuse la proposition de la pose "Throne" par Chloé avec le motif « Ce n'est pas une pose tenable. » |

    @api
    Scénario: La proposition reste en attente de validation quand un utilisateur tente de l'accepter
      Soit Bruno est validateur
      Et Alice a tenté d'accepter la proposition de la pose "Throne" par Chloé
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Throne" par Chloé

    # Le retrait d'un rôle prend effet dès l'action suivante (comptes-et-roles.feature). Ce refus est distinct de
    # celui d'une session expirée ou d'un compte supprimé : la personne reste connectée, sans la capacité.
    @api
    Scénario: Un validateur à qui le rôle a été retiré ne peut plus accepter une proposition
      Soit Paul est administrateur
      Et Bruno est validateur avec l'adresse "bruno@example.org"
      Et Bruno est connecté
      Et Paul a retiré le rôle validateur à "bruno@example.org"
      Quand Bruno accepte la proposition de la pose "Throne" par Chloé
      Alors la décision est refusée car seul un validateur ou un administrateur accepte ou refuse une proposition

    @api
    Scénario: Un visiteur ne peut pas accepter une proposition
      Quand un visiteur accepte la proposition de la pose "Throne" par Chloé
      Alors la décision est refusée car il faut être connecté

    @api
    Scénario: Un validateur dont le compte a été supprimé ne peut plus accepter une proposition
      Soit Bruno est validateur, connecté
      Et le compte de Bruno a été supprimé
      Quand Bruno accepte la proposition de la pose "Throne" par Chloé
      Alors la décision est refusée car le compte n'existe plus et il faut se reconnecter

  # ---------------------------------------------------------------------------------------------------
  # Contenu, ordre et nombre des propositions en attente
  # ---------------------------------------------------------------------------------------------------

  # Décision du 2026-11-04 : le contributeur est présenté par son adresse e-mail.
  Règle: La file de validation présente chaque proposition en attente avec la pose proposée, l'adresse e-mail de son contributeur et sa date de soumission

    @api
    Scénario: La file de validation présente le contenu complet de chaque proposition en attente
      Soit Alice est utilisateur avec l'adresse "alice@example.org"
      Et Bruno est validateur
      Et Alice a proposé le 2026-11-03 la pose "Hand-to-Hand (L-base)" de difficulté base "avancé" et de difficulté flyer "avancé", qui ne peut pas commencer un flow et ne peut pas terminer un flow
      Quand Bruno consulte la file de validation
      Alors la file de validation présente exactement les propositions suivantes :
        | pose                  | difficulté base | difficulté flyer | commencer   | terminer    | contributeur      | soumise le |
        | Hand-to-Hand (L-base) | avancé          | avancé           | ne peut pas | ne peut pas | alice@example.org | 2026-11-03 |

    @api
    Scénario: La file de validation ne présente que les propositions en attente de validation
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Bruno a accepté la proposition de la pose "Star" par Alice
      Et Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Et Bruno a proposé la pose "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente exactement les propositions de pose suivantes :
        | pose   |
        | Throne |

    @api
    Scénario: Une file de validation sans proposition en attente est signalée
      Soit Bruno est validateur
      Et aucune proposition n'est en attente de validation
      Quand Bruno consulte la file de validation
      Alors Bruno est informé qu'aucune proposition n'est en attente de validation

  # Décision du 2026-11-04 : la plus ancienne d'abord ; à date égale, ordre du catalogue sur le nom.
  Règle: La file de validation présente d'abord la proposition soumise depuis le plus longtemps

    @api
    Scénario: Les propositions en attente sont présentées de la plus ancienne à la plus récente
      Soit Bruno est validateur
      Et les propositions suivantes sont en attente de validation :
        | pose   | contributeur | soumise le       |
        | Throne | Alice        | 2026-11-03 10:00 |
        | Star   | Chloé        | 2026-11-01 09:00 |
        | Bird   | Alice        | 2026-11-02 18:30 |
      Quand Bruno consulte la file de validation
      Alors les propositions sont présentées dans cet ordre :
        | pose   |
        | Star   |
        | Bird   |
        | Throne |

  # Sert au nombre affiché dans l'en-tête du site (retour UX du 2026-11-04).
  Règle: Un validateur ou un administrateur connaît le nombre de propositions en attente de validation

    @api
    Scénario: Le nombre de propositions en attente ne compte que celles qui ne sont pas encore traitées
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Alice a proposé la pose "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Bruno a accepté la proposition de la pose "Bird" par Alice
      Et Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Quand Bruno consulte le nombre de propositions en attente de validation
      Alors 2 propositions sont en attente de validation

    @api
    Scénario: Un utilisateur ne peut pas connaître le nombre de propositions en attente
      Soit Alice est utilisateur
      Quand Alice consulte le nombre de propositions en attente de validation
      Alors la consultation est refusée car seul un validateur ou un administrateur consulte la file de validation

  # ---------------------------------------------------------------------------------------------------
  # Accepter une proposition telle quelle
  # ---------------------------------------------------------------------------------------------------

  Règle: Accepter une proposition sans ajustement publie la pose dans le catalogue, telle que proposée

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: La pose d'une proposition acceptée apparaît dans le catalogue consulté par les visiteurs
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno a accepté la proposition de la pose "Throne" par Alice
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom    | difficulté base | difficulté flyer |
        | Bird   | découverte      | découverte       |
        | Throne | débutant        | découverte       |

    @api
    Plan du Scénario: La pose "<nom>" acceptée est publiée avec ses indicateurs de début et de fin de flow
      Soit Alice a proposé la pose "<nom>" qui <commencer> commencer un flow et <terminer> terminer un flow
      Et Bruno a accepté la proposition de la pose "<nom>" par Alice
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "<nom>" est présentée comme une pose qui <commencer> commencer un flow et <terminer> terminer un flow

      Exemples:
        | nom                   | commencer   | terminer    |
        | Bird                  | peut        | peut        |
        | Hand-to-Hand (L-base) | ne peut pas | ne peut pas |

    @api
    Scénario: La pose acceptée est publiée sous le nom proposé, tel que saisi
      Soit Alice a proposé la pose "Hand-to-Hand (L-base)" de difficulté base "avancé" et de difficulté flyer "avancé"
      Et Bruno a accepté la proposition de la pose "Hand-to-Hand (L-base)" par Alice
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Hand-to-Hand (L-base)" est présentée avec la difficulté base "avancé" et la difficulté flyer "avancé"

  # Crédit public du contributeur dans le catalogue : non (décision du 2026-11-04). La pose publiée garde la
  # référence de sa proposition d'origine.
  Règle: Une proposition acceptée garde la trace de son contributeur et du validateur qui l'a acceptée

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"

    @api
    Scénario: La proposition acceptée sans ajustement indique son contributeur et le validateur qui l'a acceptée
      Quand Bruno accepte le 2026-11-05 la proposition de la pose "Throne" par Alice
      Alors la proposition de la pose "Throne" par Alice est acceptée sans ajustement par Bruno le 2026-11-05

    @api
    Scénario: Une proposition acceptée quitte la file de validation
      Soit Bruno a accepté la proposition de la pose "Throne" par Alice
      Quand Bruno consulte la file de validation
      Alors Bruno est informé qu'aucune proposition n'est en attente de validation

  # ---------------------------------------------------------------------------------------------------
  # Accepter avec ajustements (décision du 2026-11-04)
  # Le validateur peut corriger le nom (orthographe, casse), les deux difficultés et les deux indicateurs de flow.
  # Le refus reste réservé au fond : doublon ou alias, position non tenable, hors champ, contenu inapproprié.
  # ---------------------------------------------------------------------------------------------------

  Règle: Une proposition acceptée avec ajustements publie la pose avec les valeurs retenues par le validateur

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Le validateur corrige la difficulté flyer avant d'accepter
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Et Bruno a accepté la proposition de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "débutant" et la difficulté flyer "découverte"

    # Enjeu de sécurité : « peut terminer » signifie que le flyer redescend au sol directement et sans danger.
    @api
    Scénario: Le validateur corrige l'indicateur « peut terminer un flow » avant d'accepter
      Soit Alice a proposé la pose "Hand-to-Hand (L-base)" qui ne peut pas commencer un flow et peut terminer un flow
      Et Bruno a accepté la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow »
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Hand-to-Hand (L-base)" est présentée comme une pose qui ne peut pas commencer un flow et ne peut pas terminer un flow

    # Le nom corrigé a la même clé de comparaison que la proposition elle-même : ce n'est pas un conflit.
    @api
    Scénario: Le validateur corrige la casse du nom avant d'accepter
      Soit Alice a proposé la pose "throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno a accepté la proposition de la pose "throne" par Alice en corrigeant le nom en "Throne"
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom    | difficulté base | difficulté flyer |
        | Throne | débutant        | découverte       |

  Règle: Une proposition acceptée avec ajustements garde les valeurs proposées et les valeurs retenues

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"

    @api
    Scénario: La proposition acceptée avec ajustements garde la valeur proposée et la valeur retenue
      Quand Bruno accepte la proposition de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte"
      Alors la proposition de la pose "Throne" par Alice est acceptée avec ajustements par Bruno
      Et la proposition garde la difficulté flyer proposée "intermédiaire" et la difficulté flyer retenue "découverte"

  # Décision du 2026-11-04 : valeurs proposées et retenues comparées après normalisation ; la casse du nom compte.
  Règle: Seule une valeur retenue différente de la valeur proposée est un ajustement

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une correction identique à la valeur proposée n'est pas un ajustement
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno accepte la proposition de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte"
      Alors la proposition de la pose "Throne" par Alice est acceptée sans ajustement par Bruno

    # Les espaces superflus sont supprimés par la normalisation du nom : « Throne » entouré d'espaces reste « Throne ».
    @api
    Scénario: Un nom corrigé qui ne diffère que par des espaces superflus n'est pas un ajustement
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno accepte la proposition de la pose "Throne" par Alice en corrigeant le nom en "  Throne  "
      Alors la proposition de la pose "Throne" par Alice est acceptée sans ajustement par Bruno

    @api
    Scénario: Une correction de la casse du nom est un ajustement
      Soit Alice a proposé la pose "throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno accepte la proposition de la pose "throne" par Alice en corrigeant le nom en "Throne"
      Alors la proposition de la pose "throne" par Alice est acceptée avec ajustements par Bruno

  # Décision du 2026-11-04 : message facultatif, mêmes règles que le motif de refus (500 caractères au plus, espaces
  # superflus supprimés, un message fait seulement d'espaces vaut absence de message). Présenté au contributeur
  # dans « Suivre mes propositions » (story 5). Réservé aux acceptations avec ajustements.
  Règle: Un message facultatif peut accompagner une acceptation avec ajustements

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Hand-to-Hand (L-base)" qui ne peut pas commencer un flow et peut terminer un flow

    @api
    Scénario: Le message qui accompagne les ajustements est conservé
      Quand Bruno accepte la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow », avec le message « Le flyer ne redescend pas sans danger depuis cette pose. »
      Alors la proposition de la pose "Hand-to-Hand (L-base)" par Alice est acceptée avec ajustements et le message « Le flyer ne redescend pas sans danger depuis cette pose. »

    @api
    Scénario: Les espaces superflus du message sont supprimés
      Quand Bruno accepte la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow », avec le message «   Descente   dangereuse.  »
      Alors la proposition de la pose "Hand-to-Hand (L-base)" par Alice est acceptée avec ajustements et le message « Descente dangereuse. »

    @api
    Scénario: Un message fait seulement d'espaces vaut absence de message
      Quand Bruno accepte la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow », avec le message «    »
      Alors la proposition de la pose "Hand-to-Hand (L-base)" par Alice est acceptée avec ajustements, sans message

    @api
    Scénario: Un message de la longueur maximale est accepté
      Quand Bruno accepte la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow », avec un message de 500 caractères
      Alors la proposition de la pose "Hand-to-Hand (L-base)" par Alice est acceptée avec ajustements

    @api
    Scénario: Une acceptation avec un message plus long que la longueur maximale est impossible
      Quand Bruno accepte la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow », avec un message de 501 caractères
      Alors l'acceptation est impossible car le message est trop long

    @api
    Scénario: Une acceptation sans ajustement accompagnée d'un message est impossible
      Quand Bruno accepte la proposition de la pose "Hand-to-Hand (L-base)" par Alice sans ajustement, avec le message « Belle proposition. »
      Alors l'acceptation est impossible car un message n'accompagne qu'une acceptation avec ajustements

    @api
    Scénario: Une proposition dont l'acceptation avec message est impossible reste en attente de validation
      Soit Bruno a tenté d'accepter la proposition de la pose "Hand-to-Hand (L-base)" par Alice en corrigeant l'indicateur en « ne peut pas terminer un flow », avec un message de 501 caractères
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Hand-to-Hand (L-base)" par Alice

  # Mêmes règles de contenu que la story 3, appliquées aux valeurs retenues.
  Règle: Les valeurs retenues respectent les règles de contenu d'une pose

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"

    # Les cellules d'un tableau Gherkin sont rognées : « --- » est un nom dont la clé de comparaison est vide.
    @api
    Plan du Scénario: Une acceptation avec un nom corrigé <cas> est impossible
      Quand Bruno accepte la proposition de la pose "Thron" par Alice en corrigeant le nom en <nom corrigé>
      Alors l'acceptation est impossible car <motif>

      Exemples:
        | cas                                | nom corrigé                 | motif                             |
        | vide                               | ""                          | le nom de la pose est obligatoire |
        | fait uniquement de ponctuation     | "---"                       | le nom de la pose est obligatoire |
        | plus long que la longueur maximale | un nom de 61 caractères     | le nom de la pose est trop long   |

    @api
    Scénario: Une acceptation avec une difficulté corrigée hors de l'échelle est impossible
      Quand Bruno accepte la proposition de la pose "Thron" par Alice en corrigeant la difficulté base en "expert"
      Alors l'acceptation est impossible car le niveau de difficulté "expert" n'existe pas

    @api
    Scénario: Une proposition dont les valeurs retenues sont invalides reste en attente de validation
      Soit Bruno a tenté d'accepter la proposition de la pose "Thron" par Alice en corrigeant le nom en ""
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Thron" par Alice

  # Unicité contre le catalogue ET les autres propositions en attente, pas contre la proposition elle-même.
  Règle: Un nom corrigé ne peut pas être celui d'une pose du catalogue ni d'une autre proposition en attente

    Contexte:
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une acceptation avec un nom corrigé déjà pris dans le catalogue est impossible
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno accepte la proposition de la pose "Thron" par Alice en corrigeant le nom en "Throne"
      Alors l'acceptation est impossible car une pose de ce nom existe déjà dans le catalogue

    @api
    Scénario: Une acceptation avec un nom corrigé déjà pris par une autre proposition en attente est impossible
      Soit Chloé a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Alice a proposé la pose "Starr" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno accepte la proposition de la pose "Starr" par Alice en corrigeant le nom en "Star"
      Alors l'acceptation est impossible car une pose de ce nom est déjà en attente de validation

    @api
    Scénario: Une proposition dont le nom corrigé est déjà pris reste en attente de validation
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno a tenté d'accepter la proposition de la pose "Thron" par Alice en corrigeant le nom en "Throne"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Thron" par Alice

  # Une pose de même nom peut entrer dans le catalogue sans passer par cette proposition (amorçage de données,
  # future modification d'une pose publiée). Le catalogue revérifie l'unicité du nom à la publication.
  Règle: Une proposition dont le nom est pris entre-temps dans le catalogue ne peut pas être acceptée

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et la pose publiée "throne" de difficulté base "intermédiaire" et de difficulté flyer "débutant"

    @api
    Scénario: L'acceptation est impossible quand une pose de même nom est publiée entre-temps
      Quand Bruno accepte la proposition de la pose "Throne" par Alice
      Alors l'acceptation est impossible car une pose de ce nom existe déjà dans le catalogue

    @api
    Scénario: Une proposition impossible à accepter reste en attente de validation
      Soit Bruno a tenté d'accepter la proposition de la pose "Throne" par Alice
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Throne" par Alice

  # ---------------------------------------------------------------------------------------------------
  # Refuser une proposition
  # ---------------------------------------------------------------------------------------------------

  # Décision du 2026-11-04 : motif en texte libre, sans catégories, destiné au contributeur (story 5).
  Règle: Refuser une proposition ne publie rien et en garde le motif

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"

    @api
    Scénario: Une proposition refusée l'est avec son motif
      Quand Bruno refuse la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Alors la proposition de la pose "Front Bird" par Alice est refusée par Bruno avec le motif « Doublon de Bird, déjà au catalogue. »

    @api
    Scénario: La pose d'une proposition refusée n'apparaît pas dans le catalogue
      Soit Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom  | difficulté base | difficulté flyer |
        | Bird | découverte      | découverte       |

    @api
    Scénario: Une proposition refusée quitte la file de validation
      Soit Bruno a refusé la proposition de la pose "Front Bird" par Alice avec le motif « Doublon de Bird, déjà au catalogue. »
      Quand Bruno consulte la file de validation
      Alors Bruno est informé qu'aucune proposition n'est en attente de validation

  # Décision du 2026-11-04 : obligatoire, 500 caractères au plus, espaces superflus supprimés.
  # Côté site, la longueur maximale est vérifiée par un test unitaire.
  Règle: Le motif de refus est obligatoire et compte au plus 500 caractères

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Front Bird" de difficulté base "découverte" et de difficulté flyer "découverte"

    @api
    Scénario: Un refus sans motif est impossible
      Quand Bruno refuse la proposition de la pose "Front Bird" par Alice sans motif
      Alors le refus est impossible car le motif de refus est obligatoire

    @api
    Scénario: Un refus dont le motif ne contient que des espaces est impossible
      Quand Bruno refuse la proposition de la pose "Front Bird" par Alice avec le motif «    »
      Alors le refus est impossible car le motif de refus est obligatoire

    @api
    Scénario: Les espaces superflus du motif de refus sont supprimés
      Quand Bruno refuse la proposition de la pose "Front Bird" par Alice avec le motif «   Doublon   de Bird.  »
      Alors la proposition de la pose "Front Bird" par Alice est refusée par Bruno avec le motif « Doublon de Bird. »

    @api
    Scénario: Un motif de refus de la longueur maximale est accepté
      Quand Bruno refuse la proposition de la pose "Front Bird" par Alice avec un motif de 500 caractères
      Alors la proposition de la pose "Front Bird" par Alice est refusée

    @api
    Scénario: Un motif de refus plus long que la longueur maximale est impossible
      Quand Bruno refuse la proposition de la pose "Front Bird" par Alice avec un motif de 501 caractères
      Alors le refus est impossible car le motif de refus est trop long

    @api
    Scénario: Une proposition dont le refus est impossible reste en attente de validation
      Soit Bruno a tenté de refuser la proposition de la pose "Front Bird" par Alice sans motif
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Front Bird" par Alice

  # Décision du 2026-11-04 : pas d'amendement, on fait une nouvelle proposition. Le nom n'est réservé que par une
  # proposition en attente (story 3).
  Règle: Le nom d'une proposition refusée peut de nouveau être proposé

    @api
    Scénario: Une pose refusée peut être proposée de nouveau sous le même nom
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "avancé"
      Et Bruno a refusé la proposition de la pose "Throne" par Alice avec le motif « Contenu inapproprié dans le nom. »
      Quand Chloé propose la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors la proposition de la pose "Throne" par Chloé est en attente de validation

  # ---------------------------------------------------------------------------------------------------
  # Une seule décision par proposition
  # ---------------------------------------------------------------------------------------------------

  # Décision du 2026-11-04 : une décision est irréversible ; toute seconde décision est impossible, même du même
  # validateur (nouvelle tentative après une perte de réseau, double envoi). Couvre deux validateurs concurrents.
  Règle: Une proposition déjà traitée ne peut plus être ni acceptée ni refusée

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Paul est administrateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"

    @api
    Plan du Scénario: Une proposition déjà <première décision> ne peut plus être <seconde décision>
      Soit Paul a <décision passée>
      Quand Bruno <tentative>
      Alors la décision est impossible car la proposition a déjà été traitée

      Exemples:
        | première décision | seconde décision | décision passée                                                                                     | tentative                                                                                        |
        | acceptée          | acceptée         | accepté la proposition de la pose "Throne" par Alice                                                | accepte la proposition de la pose "Throne" par Alice                                             |
        | acceptée          | refusée          | accepté la proposition de la pose "Throne" par Alice                                                | refuse la proposition de la pose "Throne" par Alice avec le motif « Ce n'est pas une pose tenable. » |
        | refusée           | acceptée         | refusé la proposition de la pose "Throne" par Alice avec le motif « Contenu inapproprié. »          | accepte la proposition de la pose "Throne" par Alice                                             |
        | refusée           | refusée          | refusé la proposition de la pose "Throne" par Alice avec le motif « Contenu inapproprié. »          | refuse la proposition de la pose "Throne" par Alice avec le motif « Ce n'est pas une pose tenable. » |

    @api
    Scénario: Un validateur ne peut pas accepter deux fois la même proposition
      Soit Bruno a accepté la proposition de la pose "Throne" par Alice
      Quand Bruno accepte la proposition de la pose "Throne" par Alice
      Alors la décision est impossible car la proposition a déjà été traitée

    # Vérifié par des décisions réellement simultanées (vrai PostgreSQL) : la proposition n'est publiée qu'une fois.
    # Reste @wip : la simultanéité n'est pas reproductible de façon déterministe par des étapes Gherkin ; la règle est
    # vérifiée par le test d'intégration PoseProposalDecisionTransactionTests (AcroFunJam.Api.Tests).
    @api @wip
    Scénario: Quand deux validateurs décident au même moment, une seule décision est retenue
      Quand Bruno et Paul acceptent au même moment la proposition de la pose "Throne" par Alice
      Alors la pose "Throne" est publiée une seule fois dans le catalogue

    @api
    Scénario: Accepter une proposition inconnue est impossible
      Quand Bruno accepte une proposition qui n'existe pas
      Alors la décision est impossible car la proposition est introuvable

  # ---------------------------------------------------------------------------------------------------
  # Le contributeur devenu validateur
  # ---------------------------------------------------------------------------------------------------

  # Décision du 2026-11-04 : autorisé, par cohérence avec la publication directe (acceptation par le contributeur
  # lui-même) ; l'interdire bloquerait un AcroFunJam qui n'a qu'un seul validateur.
  Règle: Un validateur peut accepter ou refuser une proposition qu'il a faite avant de devenir validateur

    @api
    Scénario: Un utilisateur devenu validateur accepte la proposition qu'il avait faite
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice est devenue validateur
      Quand Alice accepte la proposition de la pose "Throne" par Alice
      Alors la proposition de la pose "Throne" par Alice est acceptée sans ajustement par Alice

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # Entrée : le lien « Propositions à valider » de l'en-tête, réservé aux validateurs et aux administrateurs,
  # avec le nombre de propositions en attente (masqué à 0).
  # ---------------------------------------------------------------------------------------------------

  Règle: Seul un validateur ou un administrateur est invité par l'en-tête à consulter les propositions à valider

    @web @wip
    Plan du Scénario: L'en-tête invite un <rôle> à consulter les propositions à valider
      Soit Bruno est <rôle>, connecté sur le site
      Quand Bruno consulte les poses du catalogue
      Alors l'en-tête invite Bruno à consulter les propositions à valider

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @web @wip
    Scénario: L'en-tête n'invite pas un utilisateur à consulter les propositions à valider
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte les poses du catalogue
      Alors l'en-tête n'invite pas Alice à consulter les propositions à valider

  Règle: L'en-tête annonce le nombre de propositions en attente de validation, sauf s'il n'y en a aucune

    @web @wip
    Scénario: L'en-tête annonce le nombre de propositions en attente de validation
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Bruno est validateur, connecté sur le site
      Quand Bruno consulte les poses du catalogue
      Alors l'en-tête annonce 2 propositions à valider

    @web @wip
    Scénario: Le nombre annoncé par l'en-tête baisse après une décision
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Star" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Bruno est validateur, connecté sur le site
      Quand Bruno accepte sur le site la proposition de la pose "Throne" par Alice
      Alors l'en-tête annonce 1 proposition à valider

    @web @wip
    Scénario: L'en-tête n'annonce aucun nombre quand aucune proposition n'est en attente
      Soit aucune proposition n'est en attente de validation
      Et Bruno est validateur, connecté sur le site
      Quand Bruno consulte les poses du catalogue
      Alors l'en-tête invite Bruno à consulter les propositions à valider, sans annoncer de nombre

  Règle: Seul un validateur ou un administrateur accède à la page « Propositions à valider »

    @web @wip
    Scénario: Un visiteur qui accède directement à la page « Propositions à valider » est invité à se connecter
      Quand un visiteur accède directement à la page « Propositions à valider »
      Alors le site invite le visiteur à se connecter, sans lui présenter la file de validation

    @web @wip
    Scénario: Après la connexion, le validateur arrive sur la file de validation
      Soit Bruno est validateur avec l'adresse "bruno@example.org" et le mot de passe "Throne-Bird-2026"
      Et Bruno a accédé directement à la page « Propositions à valider » en tant que visiteur
      Quand Bruno se connecte sur le site avec l'adresse "bruno@example.org" et le mot de passe "Throne-Bird-2026"
      Alors le site présente la file de validation à Bruno

    # Même comportement que pour « Proposer une pose » : une personne sans la capacité est ramenée au catalogue.
    @web @wip
    Scénario: Un utilisateur qui accède directement à la page « Propositions à valider » est ramené au catalogue
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice accède directement à la page « Propositions à valider »
      Alors le site présente le catalogue à Alice, sans la file de validation

  Règle: Sur le site, le validateur voit les propositions en attente de validation et leur contributeur

    @web @wip
    Scénario: Le validateur voit sur le site le contenu d'une proposition et l'adresse de son contributeur
      Soit Alice est utilisateur avec l'adresse "alice@example.org"
      Et Alice a proposé la pose "Hand-to-Hand (L-base)" qui ne peut pas commencer un flow et ne peut pas terminer un flow
      Et Bruno est validateur, connecté sur le site
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la proposition de la pose "Hand-to-Hand (L-base)" par "alice@example.org", qui ne peut pas commencer un flow et ne peut pas terminer un flow

    # Décision du 2026-11-04 : « toi » pour sa propre proposition.
    @web @wip
    Scénario: Le site présente au validateur sa propre proposition comme la sienne
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice est devenue validateur, connectée sur le site
      Quand Alice consulte la file de validation sur le site
      Alors le site présente la proposition de la pose "Throne" comme proposée par toi

    @web @wip
    Scénario: Le site signale une file de validation vide
      Soit aucune proposition n'est en attente de validation
      Et Bruno est validateur, connecté sur le site
      Quand Bruno consulte la file de validation sur le site
      Alors le site indique qu'aucune proposition n'est en attente de validation

  # Une proposition traitée est remplacée sur place par un compte rendu jusqu'au prochain chargement de la page.
  Règle: Sur le site, le validateur accepte ou refuse une proposition et en voit aussitôt le résultat

    Contexte:
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno est validateur, connecté sur le site

    @web @wip
    Scénario: Le validateur qui accepte une proposition est informé que la pose est publiée
      Quand Bruno accepte sur le site la proposition de la pose "Throne" par Alice
      Alors le site indique à Bruno que la pose "Throne" est publiée dans le catalogue

    @web @wip
    Scénario: Le validateur qui refuse une proposition est informé du refus
      Quand Bruno refuse sur le site la proposition de la pose "Throne" par Alice avec le motif « Ce n'est pas une pose tenable. »
      Alors le site indique à Bruno que la proposition de la pose "Throne" est refusée

    @web @wip
    Scénario: Le site ne propose plus de décider d'une proposition traitée
      Quand Bruno accepte sur le site la proposition de la pose "Throne" par Alice
      Alors le site ne propose plus à Bruno d'accepter ni de refuser la proposition de la pose "Throne"

    @web @wip
    Scénario: Une proposition traitée n'est plus présentée à la consultation suivante
      Soit Bruno a accepté sur le site la proposition de la pose "Throne" par Alice
      Quand Bruno consulte de nouveau la file de validation sur le site
      Alors le site indique qu'aucune proposition n'est en attente de validation

    @web @wip
    Scénario: Le site signale un refus sans motif avant de l'envoyer
      Quand Bruno refuse sur le site la proposition de la pose "Throne" par Alice sans motif
      Alors le site indique que le motif de refus est obligatoire

  # Règle d'interface (décision du 2026-11-04, sans scénario dédié) : une acceptation telle quelle n'est pas confirmée ;
  # une acceptation avec ajustements présente un récapitulatif « proposé → retenu » avant l'envoi, avec le message
  # facultatif. Les étapes « accepte sur le site … en corrigeant … » passent par ce récapitulatif.
  Règle: Sur le site, le validateur ajuste une proposition avant de l'accepter

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur, connecté sur le site

    @web @wip
    Scénario: Le validateur qui accepte une proposition avec ajustements est informé que la pose est publiée avec ses ajustements
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Quand Bruno accepte sur le site la proposition de la pose "Throne" par Alice en corrigeant la difficulté flyer en "découverte", avec le message « Throne se découvre dès la première séance côté flyer. »
      Alors le site indique à Bruno que la pose "Throne" est publiée dans le catalogue avec ses ajustements

    @web @wip
    Scénario: Le site signale un nom corrigé vide avant d'envoyer l'acceptation
      Soit Alice a proposé la pose "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno accepte sur le site la proposition de la pose "Thron" par Alice en corrigeant le nom en ""
      Alors le site indique que le nom de la pose est obligatoire

    @web @wip
    Scénario: Le site signale qu'un nom corrigé est déjà pris dans le catalogue
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé la pose "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno accepte sur le site la proposition de la pose "Thron" par Alice en corrigeant le nom en "Throne"
      Alors le message du site contient « Une pose de ce nom existe déjà dans le catalogue. »

  # Une seule règle vérifiée par l'API suffit à montrer que le site relaie le motif.
  Règle: Le site explique pourquoi une décision n'a pas été prise

    Contexte:
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno est validateur, connecté sur le site

    # Le message ne dit pas « par un autre validateur » : la première décision peut être celle de Bruno lui-même,
    # envoyée avant une perte de réseau.
    @web @wip
    Scénario: Le site signale une proposition déjà traitée
      Soit Bruno consulte la file de validation sur le site
      Et Paul a accepté entre-temps la proposition de la pose "Throne" par Alice
      Quand Bruno refuse sur le site la proposition de la pose "Throne" par Alice avec le motif « Ce n'est pas une pose tenable. »
      Alors le site indique à Bruno que la proposition a déjà été traitée

    # Décision du 2026-11-04 : distinct d'une session expirée ; la personne reste connectée.
    @web @wip
    Scénario: Le site signale au validateur dont le rôle a été retiré qu'il ne peut plus décider
      Soit Bruno consulte la file de validation sur le site
      Et le rôle validateur a été retiré à Bruno entre-temps
      Quand Bruno accepte sur le site la proposition de la pose "Throne" par Alice
      Alors le site indique « Tu ne peux plus accepter ni refuser de proposition : ton rôle a changé. »
      Et le site propose à Bruno de revenir au catalogue

    @web @wip
    Scénario: Le site signale qu'une pose de ce nom a été publiée entre-temps
      Soit la pose publiée "throne" de difficulté base "intermédiaire" et de difficulté flyer "débutant"
      Quand Bruno accepte sur le site la proposition de la pose "Throne" par Alice
      Alors le message du site contient « Une pose de ce nom existe déjà dans le catalogue. »

  # Un incident technique ou une session expirée ne doivent ni passer pour une décision, ni faire perdre le motif saisi.
  Règle: Le site conserve le motif de refus saisi quand la décision n'a pas pu aboutir

    Contexte:
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Bruno est validateur, connecté sur le site

    @web @wip
    Scénario: Le site signale qu'AcroFunJam est injoignable et conserve le motif de refus saisi
      Soit AcroFunJam est momentanément injoignable
      Quand Bruno refuse sur le site la proposition de la pose "Throne" par Alice avec le motif « Ce n'est pas une pose tenable. »
      Alors le site indique que la décision n'a pas pu aboutir et que Bruno peut réessayer
      Et le motif « Ce n'est pas une pose tenable. » saisi par Bruno est conservé

    @web @wip
    Scénario: Le site signale une session expirée pendant un refus
      Soit la session de Bruno a expiré
      Quand Bruno refuse sur le site la proposition de la pose "Throne" par Alice avec le motif « Ce n'est pas une pose tenable. »
      Alors le site informe Bruno que sa session a expiré et qu'il peut se connecter de nouveau

    @web @wip
    Scénario: Après s'être reconnecté, le validateur retrouve le motif de refus qu'il avait saisi
      Soit la session de Bruno a expiré
      Et Bruno a tenté de refuser sur le site la proposition de la pose "Throne" par Alice avec le motif « Ce n'est pas une pose tenable. »
      Quand Bruno se connecte de nouveau sur le site
      Alors Bruno retrouve le motif « Ce n'est pas une pose tenable. » pour la proposition de la pose "Throne"
