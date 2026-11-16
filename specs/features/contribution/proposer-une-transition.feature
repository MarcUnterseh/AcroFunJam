# language: fr
@Integration
Fonctionnalité: Proposer une transition
  Afin que le catalogue relie les poses entre elles par les transitions que je pratique
  En tant que contributeur connecté
  Je veux proposer une transition d'une pose publiée vers une pose publiée, qu'un validateur accepte (au besoin
  avec ajustements) ou refuse, comme une proposition de pose

  # Story 7, contexte Contribution → Catalogue, cibles @api et @web (pas de mobile, comme les stories 3 à 6).
  # Carte d'example mapping et décisions du porteur du produit (2026-11-13) : decouverte.md, « Story 7 Proposer une
  # transition ». Les scénarios @api et @web sont livrés. Présentation dans le catalogue (page d’une pose) :
  # catalogue/consulter-les-transitions.feature.
  #
  # Décisions principales (2026-11-13) :
  # - nom facultatif (Q72, Q88) ; sans nom, la transition se présente par ses poses (« Throne → Bird ») ; au plus une
  #   transition sans nom par pose de départ et pose d'arrivée, dans un sens donné, publiée ou en attente ; un nom
  #   donné suit les règles d'un nom de pose et est unique pour ces deux poses dans ce sens, pas globalement ;
  # - description facultative et publique, 500 caractères au plus, ajustable par le validateur (Q75, Q82, Q93) ;
  #   pas de message privé au validateur ;
  # - difficulté base et difficulté flyer obligatoires, elles mesurent le passage seul (Q76, Q90) ;
  # - washing machine permise ; un mouvement qui traverse une pose sans s'y arrêter peut être proposé comme une seule
  #   transition, la description le précise (Q78, Q91, Q92) ; on dit « position de passage » ;
  # - les deux poses doivent être publiées ; une proposition = un sens ; la transition suit le renommage de ses poses ;
  # - ajustements : nom, difficultés, description, jamais les poses ; une transition qui arrive dans la mauvaise pose
  #   est refusée avec un motif.
  # Repris des stories 3 à 6 : publication directe pour un validateur ou un administrateur ; décision irréversible ;
  # ajustements comparés après normalisation (la casse du nom compte) ; message d'ajustement facultatif réservé aux
  # acceptations avec ajustements ; motif de refus obligatoire (500 caractères) ; file de validation commune (la plus
  # ancienne d'abord) ; « Mes propositions » commune ; une proposition d'un compte supprimé reste dans la file (Q11).
  # Les cas limites déjà couverts par les stories 4 et 6 (motif de refus, message d'ajustement, rôle retiré,
  # décisions simultanées) ne sont pas répétés ici.
  #
  # Personnages : Alice et Chloé sont utilisatrices, Bruno est validateur, Paul administrateur.
  # Adresses : alice@example.org, chloe@example.org.
  # Exemples : « Ninja Star », washing machine de Star vers Star ; transitions sans nom de Throne vers Bird et de Bird
  # vers Throne. Difficultés des exemples à confirmer par l'expert acroyoga.
  # Dans « Quand Alice propose … » sans difficultés, les difficultés sont valides (débutant / débutant) et la
  # transition n'a pas de description.
  # Étiquettes : story 8, contribution/etiqueter-une-transition.feature.
  # Hors périmètre : photos et vidéos, modifier ou retirer une transition publiée, proposer une transition
  # « vers » une pose depuis sa page, recherche des poses dans le formulaire, transitions existantes affichées dans le
  # formulaire, propositions groupées, générateur de flow, écran mobile.
  # Les règles sont vérifiées une fois côté @api ; @web vérifie le parcours sur le site.

  Contexte:
    Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue

  # ---------------------------------------------------------------------------------------------------
  # Qui propose, et ce que devient la proposition
  # ---------------------------------------------------------------------------------------------------

  Règle: Une transition proposée par un utilisateur est en attente de validation et n'apparaît pas dans le catalogue

    Contexte:
      Soit Alice est utilisateur

    @api
    Scénario: La transition proposée par un utilisateur est en attente de validation
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice est en attente de validation

    @api
    Scénario: Une transition en attente de validation n'apparaît pas dans le catalogue, même pour son contributeur
      Soit Alice a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Alice consulte la pose "Throne" du catalogue
      Alors aucune transition n'est présentée depuis la pose "Throne"

  Règle: Une transition proposée par un validateur ou un administrateur est publiée directement

    @api
    Plan du Scénario: Une transition proposée par un <rôle> est publiée directement dans le catalogue
      Soit Bruno est <rôle>
      Et Bruno a proposé une transition sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom | difficulté base | difficulté flyer |
        | Bird           |     | débutant        | débutant         |

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  Règle: Seule une personne connectée peut proposer une transition

    @api
    Scénario: La transition proposée par un visiteur est irrecevable
      Quand un visiteur propose une transition sans nom de "Throne" vers "Bird"
      Alors la proposition est irrecevable car il faut être connecté

    # Décision de la story 3 : un compte supprimé est traité comme une session expirée.
    @api
    Scénario: La transition proposée par une personne dont le compte a été supprimé est irrecevable
      Soit Alice est utilisateur, connectée
      Et le compte d'Alice a été supprimé
      Quand Alice propose une transition sans nom de "Throne" vers "Bird"
      Alors la proposition est irrecevable car le compte n'existe plus et il faut se reconnecter

  # ---------------------------------------------------------------------------------------------------
  # Pose de départ, pose d'arrivée, sens
  # ---------------------------------------------------------------------------------------------------

  # Pas de propositions groupées (une pose et ses transitions) : seules des poses publiées.
  Règle: Une transition relie une pose de départ et une pose d'arrivée publiées

    Contexte:
      Soit Alice est utilisateur

    @api
    Plan du Scénario: Une transition sans <pose manquante> est irrecevable
      Quand Alice propose une transition sans <pose manquante>
      Alors la proposition est irrecevable car la <pose manquante> est obligatoire

      Exemples:
        | pose manquante |
        | pose de départ |
        | pose d'arrivée |

    @api
    Plan du Scénario: Une transition dont la <pose> est inconnue du catalogue est irrecevable
      Quand Alice propose une transition dont la <pose> n'existe pas dans le catalogue
      Alors la proposition est irrecevable car la <pose> est introuvable dans le catalogue

      Exemples:
        | pose           |
        | pose de départ |
        | pose d'arrivée |

    @api
    Scénario: Une transition vers une pose encore en attente de validation est irrecevable
      Soit Chloé est utilisateur
      Et Chloé a proposé la pose "High Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Alice propose une transition sans nom de "Bird" vers "High Bird"
      Alors la proposition est irrecevable car la pose d'arrivée est introuvable dans le catalogue

  # Décision 6 de la découverte : pas d'indicateur « réversible », pas de raccourci « sens inverse ».
  Règle: Une transition ne va que de sa pose de départ vers sa pose d'arrivée ; le sens inverse est une autre transition

    @api
    Scénario: Une transition publiée n'est pas présentée dans le sens inverse
      Soit Bruno est validateur
      Et Bruno a proposé une transition sans nom de "Throne" vers "Bird"
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors aucune transition n'est présentée depuis la pose "Bird"

    @api
    Scénario: Le sens inverse se propose comme une autre transition
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Bruno a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Alice propose une transition sans nom de "Bird" vers "Throne"
      Alors la proposition de la transition sans nom de "Bird" vers "Throne" par Alice est en attente de validation

  # Décision 9 de la découverte : pas de concept dédié.
  Règle: Une transition peut revenir sur sa pose de départ (washing machine)

    @api
    Scénario: Une washing machine se propose comme une autre transition
      Soit Alice est utilisateur
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice est en attente de validation

  # Q91, Q92 : on parle de « position de passage », pas de « pose intermédiaire ». Quand découper un mouvement en
  # plusieurs transitions relève de la charte de validation, pas du modèle.
  Règle: Un mouvement qui traverse une position de passage sans s'y arrêter se propose comme une seule transition

    @api
    Scénario: La description précise la position de passage traversée
      Soit Alice est utilisateur
      Quand Alice propose une transition sans nom de "Star" vers "Bird", avec la description « Passe par Throne sans s'arrêter. »
      Alors la proposition de la transition sans nom de "Star" vers "Bird" par Alice porte la description « Passe par Throne sans s'arrêter. »

  # ---------------------------------------------------------------------------------------------------
  # Nom d'une transition (vérifié avec Alice, utilisatrice)
  # ---------------------------------------------------------------------------------------------------

  # Q72, Q88 : facultatif. Un nom donné suit les règles d'un nom de pose (story 3) : espaces superflus retirés,
  # 60 caractères au plus, clé de comparaison non vide. Un nom vide ou fait seulement d'espaces vaut absence de nom.
  Règle: Le nom d'une transition est facultatif ; quand il est donné, il est sans espaces superflus et compte au plus 60 caractères

    Contexte:
      Soit Alice est utilisateur

    @api
    Scénario: Une transition sans nom est recevable
      Quand Alice propose une transition sans nom de "Throne" vers "Bird"
      Alors la proposition de la transition sans nom de "Throne" vers "Bird" par Alice est en attente de validation

    @api
    Scénario: Un nom fait seulement d'espaces vaut absence de nom
      Quand Alice propose une transition nommée "   " de "Throne" vers "Bird"
      Alors la proposition de la transition sans nom de "Throne" vers "Bird" par Alice est en attente de validation

    @api
    Scénario: Les espaces superflus du nom de la transition sont supprimés
      Quand Alice propose une transition nommée "  Ninja   Star  " de "Star" vers "Star"
      Alors la transition est proposée sous le nom "Ninja Star"

    @api
    Scénario: Un nom de transition de la longueur maximale est accepté
      Quand Alice propose une transition au nom de 60 caractères de "Throne" vers "Bird"
      Alors la proposition de la transition au nom de 60 caractères de "Throne" vers "Bird" par Alice est en attente de validation

    @api
    Plan du Scénario: Une transition avec un nom <cas> est irrecevable
      Quand Alice propose une transition nommée <nom> de "Throne" vers "Bird"
      Alors la proposition est irrecevable car <motif>

      Exemples:
        | cas                                | nom                     | motif                                                          |
        | fait uniquement de ponctuation     | "---"                   | le nom de la transition doit contenir une lettre ou un chiffre |
        | plus long que la longueur maximale | un nom de 61 caractères | le nom de la transition est trop long                          |

  # Q72, Q88. Même sens = même pose de départ et même pose d'arrivée.
  Règle: Au plus une transition sans nom relie deux poses dans un sens donné ; toute autre doit avoir un nom

    Contexte:
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une seconde transition sans nom entre des poses déjà reliées par une transition publiée sans nom est irrecevable
      Soit Bruno a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Alice propose une transition sans nom de "Throne" vers "Bird"
      Alors la proposition est irrecevable car une transition sans nom relie déjà ces poses dans le catalogue

    @api
    Scénario: Une seconde transition sans nom entre des poses déjà reliées par une transition sans nom en attente est irrecevable
      Soit Chloé a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Alice propose une transition sans nom de "Throne" vers "Bird"
      Alors la proposition est irrecevable car une transition sans nom entre ces poses est déjà en attente de validation

    @api
    Scénario: Une transition nommée peut relier des poses déjà reliées par une transition sans nom
      Soit Bruno a proposé une transition sans nom de "Star" vers "Star"
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star"
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice est en attente de validation

    @api
    Scénario: Une transition sans nom peut relier des poses déjà reliées par une transition nommée
      Soit Bruno a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice propose une transition sans nom de "Star" vers "Star"
      Alors la proposition de la transition sans nom de "Star" vers "Star" par Alice est en attente de validation

  # Q72 : clé de comparaison du nom d'une pose (casse, accents, ponctuation ignorés), face aux transitions publiées et
  # aux propositions de transition en attente de même pose de départ et de même pose d'arrivée. Aucune unicité face
  # aux noms de poses ni aux transitions qui relient d'autres poses : la charte de validation juge du fond.
  Règle: Le nom d'une transition est unique pour sa pose de départ et sa pose d'arrivée, pas dans tout le catalogue

    Contexte:
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Un nom déjà pris par une transition publiée entre les mêmes poses est irrecevable
      Soit Bruno a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice propose la transition "ninja-star" de "Star" vers "Star"
      Alors la proposition est irrecevable car une transition de ce nom relie déjà ces poses dans le catalogue

    @api
    Scénario: Un nom déjà pris par une transition en attente entre les mêmes poses est irrecevable
      Soit Chloé a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice propose la transition "NINJA STAR" de "Star" vers "Star"
      Alors la proposition est irrecevable car une transition de ce nom entre ces poses est déjà en attente de validation

    @api
    Scénario: Le même nom est recevable entre d'autres poses
      Soit Bruno a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice propose la transition "Ninja Star" de "Throne" vers "Star"
      Alors la proposition de la transition "Ninja Star" de "Throne" vers "Star" par Alice est en attente de validation

  # ---------------------------------------------------------------------------------------------------
  # Difficultés et description
  # ---------------------------------------------------------------------------------------------------

  # Q76, Q90 : mêmes niveaux que les poses, sans valeur par défaut ; elles mesurent le passage seul, les poses étant
  # supposées maîtrisées ; aucune contrainte par rapport aux difficultés des poses.
  Règle: Une transition a une difficulté base et une difficulté flyer de l'échelle, indépendantes de celles de ses poses

    Contexte:
      Soit Alice est utilisateur

    @api
    Plan du Scénario: Une transition sans <difficulté> est irrecevable
      Quand Alice propose une transition sans nom de "Throne" vers "Bird" sans <difficulté>
      Alors la proposition est irrecevable car la <difficulté> est obligatoire

      Exemples:
        | difficulté       |
        | difficulté base  |
        | difficulté flyer |

    @api
    Scénario: Une transition avec une difficulté hors de l'échelle est irrecevable
      Quand Alice propose une transition sans nom de "Throne" vers "Bird" de difficulté base "expert" et de difficulté flyer "avancé"
      Alors la proposition est irrecevable car le niveau de difficulté "expert" n'existe pas

    @api
    Scénario: Une transition peut être plus difficile que ses poses
      Soit la pose publiée "Front Plank" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand Alice propose une transition sans nom de "Front Plank" vers "Bird" de difficulté base "avancé" et de difficulté flyer "avancé"
      Alors la proposition de la transition sans nom de "Front Plank" vers "Bird" par Alice est en attente de validation

  # Q75, Q82, Q93 : texte public, publié avec la transition et lu par le validateur ; un lien vidéo s'y écrit en texte
  # brut, sans aperçu. Q105 : seuls les espaces de début et de fin sont retirés ; retours à la ligne et espaces intérieurs conservés.
  Règle: Une description facultative et publique décrit le passage, en 500 caractères au plus

    Contexte:
      Soit Alice est utilisateur

    @api
    Scénario: La description de la transition est conservée
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star", avec la description « Vidéo : https://example.org/ninja-star »
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice porte la description « Vidéo : https://example.org/ninja-star »

    @api
    Scénario: Une description faite seulement d'espaces vaut absence de description
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star", avec la description «    »
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice ne porte aucune description

    @api
    Scénario: Une description de la longueur maximale est acceptée
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star", avec une description de 500 caractères
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice est en attente de validation

    @api
    Scénario: Une transition avec une description plus longue que la longueur maximale est irrecevable
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star", avec une description de 501 caractères
      Alors la proposition est irrecevable car la description de la transition est trop longue

  # ---------------------------------------------------------------------------------------------------
  # File de validation
  # ---------------------------------------------------------------------------------------------------

  # Même file, même ordre (la plus ancienne d'abord) et même nombre que les autres propositions. Les poses sont
  # présentées sous leur nom actuel.
  Règle: La file de validation présente chaque transition en attente avec ses poses, son nom, ses difficultés, sa description, son contributeur et sa date de soumission

    Contexte:
      Soit Alice est utilisateur avec l'adresse "alice@example.org"
      Et Bruno est validateur

    @api
    Scénario: La file de validation présente la transition proposée
      Soit Alice a proposé le 2026-11-14 la transition "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé", avec la description « Vidéo : https://example.org/ninja-star »
      Quand Bruno consulte la file de validation
      Alors la file de validation présente exactement les transitions suivantes :
        | pose de départ | pose d'arrivée | nom        | difficulté base | difficulté flyer | description                             | contributeur      | soumise le |
        | Star           | Star           | Ninja Star | avancé          | avancé           | Vidéo : https://example.org/ninja-star | alice@example.org | 2026-11-14 |

    @api
    Scénario: Les transitions et les autres propositions en attente sont présentées ensemble, la plus ancienne d'abord
      Soit Alice a proposé le 2026-11-14 une transition sans nom de "Throne" vers "Bird"
      Et Alice a proposé le 2026-11-13 la pose "High Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno consulte la file de validation
      Alors les propositions sont présentées dans cet ordre :
        | proposition                     |
        | pose High Bird                  |
        | transition de Throne vers Bird  |

    @api
    Scénario: Le nombre de propositions en attente compte les transitions
      Soit Alice a proposé une transition sans nom de "Throne" vers "Bird"
      Et Alice a proposé la pose "High Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno consulte le nombre de propositions en attente de validation
      Alors 2 propositions sont en attente de validation

    @api
    Scénario: La file de validation présente une pose renommée sous son nom actuel
      Soit la pose publiée "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé une transition sans nom de "Thron" vers "Bird"
      Et Bruno a proposé de modifier la pose "Thron" en changeant le nom en "Throne II"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la transition sans nom de "Throne II" vers "Bird"

    # Q11, tranchée par alignement : elle reste dans la file ; le validateur la refuse.
    @api
    Scénario: La transition d'un contributeur dont le compte a été supprimé reste dans la file de validation
      Soit Alice a proposé la transition "Ninja Star" de "Star" vers "Star"
      Et le compte d'Alice a été supprimé
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la transition "Ninja Star" de "Star" vers "Star"

  # ---------------------------------------------------------------------------------------------------
  # Accepter ou refuser une transition (règles de la story 4)
  # ---------------------------------------------------------------------------------------------------

  Règle: Seul un validateur ou un administrateur accepte ou refuse une transition

    @api
    Scénario: Un utilisateur ne peut pas accepter une transition
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Chloé a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice accepte la proposition de la transition "Ninja Star" de "Star" vers "Star" par Chloé
      Alors la décision est refusée car seul un validateur ou un administrateur accepte ou refuse une proposition

  Règle: Accepter une transition la publie dans le catalogue telle que proposée

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la transition "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé", avec la description « Vidéo : https://example.org/ninja-star »

    @api
    Scénario: Une transition acceptée apparaît dans le catalogue avec sa description
      Soit Bruno a accepté la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors les transitions depuis la pose "Star" sont exactement :
        | pose d'arrivée | nom        | difficulté base | difficulté flyer | description                             |
        | Star           | Ninja Star | avancé          | avancé           | Vidéo : https://example.org/ninja-star |

    @api
    Scénario: La transition acceptée garde son contributeur, le validateur et la date
      Quand Bruno accepte le 2026-11-15 la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice est acceptée sans ajustement par Bruno le 2026-11-15

  # Le nom, les deux difficultés et la description s'ajustent, jamais les poses. Règles de la story 4 : comparaison
  # après normalisation (la casse du nom compte), règles de contenu, message d'ajustement réservé aux ajustements.
  Règle: Une transition acceptée avec ajustements est publiée avec les valeurs retenues

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la transition "ninja star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "intermédiaire"

    @api
    Scénario: Le validateur corrige le nom, la difficulté et la description avant d'accepter
      Soit Bruno a accepté la proposition de la transition "ninja star" de "Star" vers "Star" par Alice en corrigeant le nom en "Ninja Star", la difficulté flyer en "avancé" et la description en « Rotation complète, retour en Star. »
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors les transitions depuis la pose "Star" sont exactement :
        | pose d'arrivée | nom        | difficulté base | difficulté flyer | description                         |
        | Star           | Ninja Star | avancé          | avancé           | Rotation complète, retour en Star. |

    @api
    Scénario: La transition acceptée avec ajustements garde la valeur proposée et la valeur retenue
      Quand Bruno accepte la proposition de la transition "ninja star" de "Star" vers "Star" par Alice en corrigeant la difficulté flyer en "avancé"
      Alors la proposition de la transition "ninja star" de "Star" vers "Star" par Alice est acceptée avec ajustements par Bruno
      Et la proposition garde la difficulté flyer proposée "intermédiaire" et la difficulté flyer retenue "avancé"

    @api
    Scénario: Une correction qui ne diffère que par des espaces superflus n'est pas un ajustement
      Quand Bruno accepte la proposition de la transition "ninja star" de "Star" vers "Star" par Alice en corrigeant le nom en "  ninja star  "
      Alors la proposition de la transition "ninja star" de "Star" vers "Star" par Alice est acceptée sans ajustement par Bruno

    @api
    Scénario: Une description corrigée plus longue que la longueur maximale rend l'acceptation impossible
      Quand Bruno accepte la proposition de la transition "ninja star" de "Star" vers "Star" par Alice en corrigeant la description par un texte de 501 caractères
      Alors l'acceptation est impossible car la description de la transition est trop longue

  # Un nom retenu (ou son absence) suit les mêmes règles qu'à la proposition : unique pour ces poses dans ce sens,
  # au plus une transition sans nom ; la proposition elle-même est mise à part.
  Règle: Le nom retenu ne peut pas être celui d'une autre transition entre les mêmes poses, et au plus une reste sans nom

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Le validateur donne un nom à une transition proposée sans nom
      Soit Alice a proposé une transition sans nom de "Star" vers "Star"
      Quand Bruno accepte la proposition de la transition sans nom de "Star" vers "Star" par Alice en corrigeant le nom en "Ninja Star"
      Alors la proposition de la transition sans nom de "Star" vers "Star" par Alice est acceptée avec ajustements par Bruno

    @api
    Scénario: Un nom corrigé déjà pris par une transition publiée entre les mêmes poses rend l'acceptation impossible
      Soit Bruno a proposé la transition "Ninja Star" de "Star" vers "Star"
      Et Alice a proposé une transition sans nom de "Star" vers "Star"
      Quand Bruno accepte la proposition de la transition sans nom de "Star" vers "Star" par Alice en corrigeant le nom en "Ninja Star"
      Alors l'acceptation est impossible car une transition de ce nom relie déjà ces poses dans le catalogue

    @api
    Scénario: Un nom retiré alors qu'une transition sans nom relie déjà ces poses rend l'acceptation impossible
      Soit Bruno a proposé une transition sans nom de "Star" vers "Star"
      Et Alice a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Bruno accepte la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice en retirant le nom
      Alors l'acceptation est impossible car une transition sans nom relie déjà ces poses dans le catalogue

  # Une transition peut entrer dans le catalogue sans passer par une proposition (amorçage de données).
  Règle: Une transition dont le nom, ou la place sans nom, est prise entre-temps entre les mêmes poses ne peut pas être acceptée

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: L'acceptation est impossible quand une transition de ce nom est publiée entre-temps entre les mêmes poses
      Soit Alice a proposé la transition "Ninja Star" de "Star" vers "Star"
      Et la transition publiée "ninja star" de "Star" vers "Star"
      Quand Bruno accepte la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice
      Alors l'acceptation est impossible car une transition de ce nom relie déjà ces poses dans le catalogue

    @api
    Scénario: L'acceptation est impossible quand une transition sans nom est publiée entre-temps entre les mêmes poses
      Soit Alice a proposé une transition sans nom de "Throne" vers "Bird"
      Et la transition publiée sans nom de "Throne" vers "Bird"
      Quand Bruno accepte la proposition de la transition sans nom de "Throne" vers "Bird" par Alice
      Alors l'acceptation est impossible car une transition sans nom relie déjà ces poses dans le catalogue

  # Motif de refus : obligatoire, 500 caractères au plus (story 4) ; ses cas limites ne sont pas répétés ici.
  # Une transition vers la mauvaise pose ne s'ajuste pas (les poses ne s'ajustent pas) : elle est refusée avec un motif.
  Règle: Refuser une transition ne publie rien, en garde le motif et libère son nom

    Contexte:
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Bruno est validateur
      Et Alice a proposé une transition sans nom de "Throne" vers "Star"

    @api
    Scénario: Une transition qui arrive dans la mauvaise pose est refusée avec son motif
      Quand Bruno refuse la proposition de la transition sans nom de "Throne" vers "Star" par Alice avec le motif « Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »
      Alors la proposition de la transition sans nom de "Throne" vers "Star" par Alice est refusée par Bruno avec le motif « Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »

    @api
    Scénario: Une transition refusée n'apparaît pas dans le catalogue
      Soit Bruno a refusé la proposition de la transition sans nom de "Throne" vers "Star" par Alice avec le motif « Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors aucune transition n'est présentée depuis la pose "Throne"

    @api
    Scénario: Après un refus, une transition sans nom peut de nouveau être proposée entre les mêmes poses
      Soit Bruno a refusé la proposition de la transition sans nom de "Throne" vers "Star" par Alice avec le motif « Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »
      Quand Chloé propose une transition sans nom de "Throne" vers "Star"
      Alors la proposition de la transition sans nom de "Throne" vers "Star" par Chloé est en attente de validation

    @api
    Scénario: Le nom d'une transition refusée peut de nouveau être proposé entre les mêmes poses
      Soit Chloé a proposé la transition "Ninja Star" de "Star" vers "Star"
      Et Bruno a refusé la proposition de la transition "Ninja Star" de "Star" vers "Star" par Chloé avec le motif « Description à compléter : précise par où passe le flyer. »
      Quand Alice propose la transition "Ninja Star" de "Star" vers "Star"
      Alors la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice est en attente de validation

  Règle: Une transition déjà traitée ne peut plus être ni acceptée ni refusée

    @api
    Scénario: Une transition déjà acceptée ne peut plus être refusée
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Paul est administrateur
      Et Alice a proposé la transition "Ninja Star" de "Star" vers "Star"
      Et Paul a accepté la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice
      Quand Bruno refuse la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice avec le motif « Doublon. »
      Alors la décision est impossible car la proposition a déjà été traitée

  # ---------------------------------------------------------------------------------------------------
  # Mes propositions
  # ---------------------------------------------------------------------------------------------------

  # Liste unique avec les propositions de pose et de modification ; mêmes statuts et mêmes règles que la story 5 : une
  # transition acceptée présente la transition retenue, sinon la transition proposée. Une transition présente le nom
  # actuel de ses poses (alors qu'une modification garde le nom de la pose au moment de la proposition : écart accepté).
  Règle: Le contributeur suit ses transitions dans « Mes propositions »

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une transition en attente est présentée avec ses poses, son nom, ses difficultés, sa description et sa date
      Soit Alice a proposé le 2026-11-14 la transition "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé", avec la description « Vidéo : https://example.org/ninja-star »
      Quand Alice consulte ses propositions
      Alors ses propositions présentent exactement les transitions suivantes :
        | pose de départ | pose d'arrivée | nom        | difficulté base | difficulté flyer | description                             | statut                   | soumise le |
        | Star           | Star           | Ninja Star | avancé          | avancé           | Vidéo : https://example.org/ninja-star | en attente de validation | 2026-11-14 |

    @api
    Scénario: Une transition acceptée avec ajustements présente le détail des ajustements
      Soit Alice a proposé la transition "Ninja Star" de "Star" vers "Star", avec la description « Vidéo : https://example.org/ninja-star »
      Et Bruno a accepté la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice en corrigeant la description en « Rotation complète, retour en Star. »
      Quand Alice consulte ses propositions
      Alors la transition "Ninja Star" de "Star" vers "Star" présente l'ajustement de la description « Vidéo : https://example.org/ninja-star » → « Rotation complète, retour en Star. »

    @api
    Scénario: Une transition refusée présente le motif de refus
      Soit Alice a proposé une transition sans nom de "Throne" vers "Star"
      Et Bruno a refusé la proposition de la transition sans nom de "Throne" vers "Star" par Alice avec le motif « Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »
      Quand Alice consulte ses propositions
      Alors la transition sans nom de "Throne" vers "Star" est présentée comme refusée avec le motif « Cette transition arrive en Bird, pas en Star : propose-la vers Bird. »

    @api
    Scénario: Une transition publiée directement figure parmi les propositions de son contributeur
      Soit Bruno a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Bruno consulte ses propositions
      Alors la transition sans nom de "Throne" vers "Bird" est présentée comme publiée directement

    @api
    Scénario: Une transition présente ses poses sous leur nom actuel après un renommage
      Soit la pose publiée "Thron" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé une transition sans nom de "Thron" vers "Bird"
      Et Bruno a proposé de modifier la pose "Thron" en changeant le nom en "Throne II"
      Quand Alice consulte ses propositions
      Alors ses propositions présentent la transition sans nom de "Throne II" vers "Bird"

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # Entrée (Q86, Q100, Q103, Q104) : l'action « Proposer une transition depuis <pose> » de la page d'une pose
  # (catalogue/consulter-les-transitions.feature), réservée aux personnes connectées comme les stories 3 et 6.
  # Formulaire, dans cet ordre : Pose de départ (préremplie, modifiable), Pose d'arrivée (liste déroulante des poses
  # publiées, option vide « Choisis une pose »), Nom (facultatif), Difficulté base, Difficulté flyer, Description
  # (facultative). Texte d'aide des difficultés : elles mesurent le passage seul, les poses étant supposées maîtrisées.
  # Règles d'interface sans scénario dédié : ordre des champs, option vide, libellé lu par les lecteurs d'écran.
  # ---------------------------------------------------------------------------------------------------

  Règle: Seule une personne connectée est invitée à proposer une transition depuis la page d'une pose

    @web
    Scénario: Un visiteur n'est pas invité à proposer une transition
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page de la pose n'invite pas à proposer une transition depuis la pose "Throne"

    @web
    Scénario: Une personne connectée est invitée à proposer une transition depuis la pose consultée
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte la pose "Throne" du catalogue
      Alors la page de la pose invite à proposer une transition depuis la pose "Throne"

  Règle: Un visiteur qui accède directement au formulaire de transition doit d'abord se connecter

    @web
    Scénario: Un visiteur qui accède directement au formulaire de transition est invité à se connecter
      Quand un visiteur accède directement à la page « Proposer une transition » depuis la pose "Throne"
      Alors le site invite le visiteur à se connecter, sans lui présenter le formulaire de transition

    @web
    Scénario: Après la connexion, la personne arrive sur le formulaire de transition depuis la même pose
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Et Alice a accédé directement à la page « Proposer une transition » depuis la pose "Throne" en tant que visiteur
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors le formulaire de transition présente "Throne" comme pose de départ

    @web
    Scénario: Le site signale une pose de départ introuvable
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice accède directement à la page « Proposer une transition » depuis une pose qui n'existe pas dans le catalogue
      Alors le site indique « Cette pose n'est plus dans le catalogue. »

  Règle: Le formulaire part de la pose consultée et propose comme pose d'arrivée les seules poses publiées

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: Le formulaire présente la pose consultée comme pose de départ
      Quand Alice commence à proposer sur le site une transition depuis la pose "Throne"
      Alors le formulaire de transition présente "Throne" comme pose de départ

    @web
    Scénario: La pose de départ préremplie peut être changée
      Quand Alice propose sur le site, depuis la pose "Throne", une transition sans nom de "Bird" vers "Star"
      Alors le site confirme à Alice que sa transition de Bird vers Star est envoyée et attend une validation

    @web
    Scénario: Le formulaire propose comme pose d'arrivée les seules poses publiées
      Soit Chloé est utilisateur
      Et Chloé a proposé la pose "High Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Alice commence à proposer sur le site une transition depuis la pose "Throne"
      Alors le formulaire de transition propose comme pose d'arrivée exactement "Bird", "Star" et "Throne"

    @web
    Scénario: Le formulaire précise que les difficultés mesurent le passage seul
      Quand Alice commence à proposer sur le site une transition depuis la pose "Throne"
      Alors le formulaire de transition précise que les difficultés mesurent le passage seul, les poses étant supposées maîtrisées

    @web
    Scénario: Annuler ramène à la page de la pose d'origine
      Soit Alice a commencé à proposer sur le site une transition depuis la pose "Throne"
      Quand Alice renonce à proposer la transition
      Alors le site présente la pose "Throne" du catalogue

  # Pas de récapitulatif avant l'envoi, ni pour un utilisateur ni pour un validateur.
  Règle: Sur le site, le contributeur sait ce que devient sa transition et peut enchaîner

    @web
    Scénario: Le formulaire annonce à un validateur que sa transition sera publiée dès l'envoi
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno commence à proposer sur le site une transition depuis la pose "Throne"
      Alors le site indique « Ton rôle te permet de publier directement : la transition apparaîtra dans le catalogue dès l'envoi. »

    @web
    Scénario: Un utilisateur qui propose une transition est informé qu'elle attend une validation
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice propose sur le site une transition sans nom de "Throne" vers "Bird"
      Alors le site confirme à Alice que sa transition de Throne vers Bird est envoyée et attend une validation
      Et le site propose à Alice de voir ses propositions, de proposer une autre transition depuis "Throne" ou de revenir à la pose "Throne"

    @web
    Scénario: Un validateur qui propose une transition est informé qu'elle est publiée
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno propose sur le site la transition "Ninja Star" de "Star" vers "Star"
      Alors le site confirme à Bruno que la transition « Ninja Star » de Star vers Star est publiée dans le catalogue
      Et le site propose à Bruno de voir la pose "Star" ou de proposer une autre transition depuis "Star"

  Règle: Le site explique pourquoi une transition n'est pas reçue

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: Le site signale une pose d'arrivée non choisie avant l'envoi
      Quand Alice propose sur le site, depuis la pose "Throne", une transition sans choisir de pose d'arrivée
      Alors le site indique pour la pose d'arrivée qu'elle est obligatoire

    @web
    Scénario: Le site signale sous le nom qu'une transition de ce nom relie déjà ces poses
      Soit Bruno est validateur
      Et Bruno a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice propose sur le site la transition "Ninja Star" de "Star" vers "Star"
      Alors le site indique pour le nom qu'une transition de ce nom relie déjà ces poses dans le catalogue

    @web
    Scénario: Le site signale sous le nom qu'une transition sans nom relie déjà ces poses
      Soit Bruno est validateur
      Et Bruno a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Alice propose sur le site une transition sans nom de "Throne" vers "Bird"
      Alors le site indique pour le nom qu'une transition sans nom relie déjà ces poses et qu'il faut nommer la sienne

  Règle: Le site conserve la transition saisie quand elle n'a pas pu aboutir

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: Le site signale qu'AcroFunJam est injoignable et conserve la transition saisie
      Soit AcroFunJam est momentanément injoignable
      Quand Alice propose sur le site la transition "Ninja Star" de "Star" vers "Star"
      Alors le site indique que la proposition n'a pas pu aboutir et qu'Alice peut réessayer
      Et la transition saisie par Alice est conservée

    @web
    Scénario: Le formulaire de transition signale que la session a expiré pendant la saisie
      Soit la session d'Alice a expiré
      Quand Alice propose sur le site la transition "Ninja Star" de "Star" vers "Star"
      Alors le formulaire de transition informe Alice que sa session a expiré et qu'elle peut se connecter de nouveau

    @web
    Scénario: Après s'être reconnectée, la personne retrouve sa transition saisie
      Soit la session d'Alice a expiré
      Et Alice a tenté de proposer sur le site la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice se connecte de nouveau sur le site
      Alors Alice retrouve dans le formulaire de transition la transition "Ninja Star" de "Star" vers "Star"

  # Carte titrée « Transition <nom> de <départ> vers <arrivée> », ou « Transition de <départ> vers <arrivée> » sans
  # nom ; noms actuels des poses. Ajustables : nom, difficultés, description (pas les poses).
  Règle: Sur le site, le validateur décide d'une transition depuis la file de validation

    Contexte:
      Soit Alice est utilisateur avec l'adresse "alice@example.org"
      Et Bruno est validateur, connecté sur le site

    @web
    Scénario: Le validateur voit sur le site une transition nommée proposée
      Soit Alice a proposé la transition "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé", avec la description « Vidéo : https://example.org/ninja-star »
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la proposition « Transition Ninja Star de Star vers Star » par "alice@example.org", avancé / avancé, avec la description « Vidéo : https://example.org/ninja-star »

    @web
    Scénario: Le validateur voit sur le site une transition proposée sans nom
      Soit Alice a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la proposition « Transition de Throne vers Bird » par "alice@example.org"

    @web
    Scénario: Le validateur qui accepte une transition est informé qu'elle est publiée
      Soit Alice a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Bruno accepte sur le site la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice
      Alors le site confirme à Bruno que la transition « Ninja Star » de Star vers Star est publiée dans le catalogue

    @web
    Scénario: Le site signale qu'une transition de ce nom a été publiée entre-temps
      Soit Alice a proposé la transition "Ninja Star" de "Star" vers "Star"
      Et la transition publiée "Ninja Star" de "Star" vers "Star"
      Quand Bruno accepte sur le site la proposition de la transition "Ninja Star" de "Star" vers "Star" par Alice
      Alors le site indique à Bruno qu'une transition de ce nom relie déjà ces poses dans le catalogue

  # Titre commun avec la file de validation. L'état vide et l'introduction de « Mes propositions » sont reformulés
  # pour couvrir tous les types : ils révisent le scénario de l'état vide de suivre-mes-propositions.feature.
  Règle: Sur le site, le contributeur suit ses transitions dans « Mes propositions »

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: « Mes propositions » présente une transition en attente
      Soit Alice a proposé la transition "Ninja Star" de "Star" vers "Star"
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la proposition « Transition Ninja Star de Star vers Star », en attente de validation

    @web
    Scénario: « Mes propositions » présente une transition sans nom par ses poses
      Soit Alice a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la proposition « Transition de Throne vers Bird », en attente de validation

    @web
    Scénario: « Mes propositions » annonce les poses, les modifications et les transitions
      Quand Alice consulte ses propositions sur le site
      Alors le site indique « Les poses, les modifications et les transitions que tu proposes apparaissent ici, avec ce qu'elles deviennent. »

    @web
    Scénario: Le site signale qu'aucune proposition n'a encore été faite
      Quand Alice consulte ses propositions sur le site
      Alors le site indique « Tu n'as encore rien proposé. »
