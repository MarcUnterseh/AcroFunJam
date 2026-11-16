# language: fr
@Integration
Fonctionnalité: Consulter les transitions du catalogue
  Afin de savoir comment passer d'une pose à une autre
  En tant que visiteur
  Je veux voir, sur la page d'une pose publiée, les transitions qui en partent et celles qui y arrivent,
  avec l'autre pose, leur nom s'il y en a un, leur difficulté base et flyer et leur description

  # Story 7 « Proposer une transition », volet Catalogue. Décisions du porteur du produit (2026-11-13) : decouverte.md,
  # « Story 7 Proposer une transition ». Scénarios livrés (@api et @web).
  # Le catalogue ne contient que des transitions publiées ; une transition en attente de validation vit dans
  # Contribution (contribution/proposer-une-transition.feature), où sont aussi spécifiées les actions de la page
  # réservées aux personnes connectées (« Proposer une transition depuis <pose> »).
  #
  # Page d'une pose, ouverte depuis le nom de sa carte du catalogue (zone cliquable étendue à la carte, le lien
  # « Proposer une modification » restant utilisable), consultable par tous, visiteurs compris :
  # - lien de retour « Catalogue », nom de la pose en titre, actions « Proposer une transition depuis <pose> » et
  #   « Proposer une modification » (personnes connectées), caractéristiques de la pose ;
  # - légende de l'échelle de difficulté et avertissement de responsabilité, qui rappelle que les chutes arrivent
  #   surtout pendant les transitions ;
  # - sections « Transitions depuis <pose> » et « Transitions vers <pose> », listes plates sans compteur ; chaque
  #   transition présente l'autre pose (lien vers sa page), son nom s'il y en a un, ses deux difficultés et sa
  #   description ; une transition sans nom se présente par ses poses (« Throne → Bird », lu « de Throne vers Bird »
  #   par les lecteurs d'écran) ;
  # - ordre : l'autre pose (ordre du catalogue), puis le nom, les transitions sans nom en premier ;
  # - une washing machine figure dans les deux sections, l'autre pose marquée « (même pose) » ;
  # - états : chargement, erreur avec « Réessayer », section vide, pose introuvable (titre « Pose introuvable »).
  # Une transition suit le renommage de ses poses. Règles d'interface sans scénario dédié (tests unitaires) : zone
  # cliquable de la carte, libellé lu par les lecteurs d'écran, état de chargement.
  # Étiquettes : story 8, catalogue/consulter-les-etiquettes-des-transitions.feature.
  # Hors périmètre : photos et vidéos, aperçu des liens de la description, page propre à une transition,
  # recherche et filtres, générateur de flow, écran mobile.

  Contexte:
    Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue

  Règle: La page d'une pose présente les transitions qui en partent, chacune avec sa pose d'arrivée, son nom, ses difficultés et sa description

    @api @web
    Scénario: Un visiteur voit les transitions depuis une pose
      Soit les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom        | difficulté base | difficulté flyer | description                       |
        | Throne         | Bird           |            | débutant        | débutant         |                                   |
        | Star           | Star           | Ninja Star | avancé          | avancé           | Rotation complète, retour en Star. |
        | Bird           | Throne         |            | débutant        | découverte       |                                   |
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom | difficulté base | difficulté flyer | description |
        | Bird           |     | débutant        | débutant         |             |

    @api @web
    Scénario: Un visiteur voit la description d'une transition
      Soit la transition publiée sans nom de "Star" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec la description « Passe par Throne sans s'arrêter. »
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors les transitions depuis la pose "Star" sont exactement :
        | pose d'arrivée | nom | difficulté base | difficulté flyer | description                       |
        | Bird           |     | intermédiaire   | intermédiaire    | Passe par Throne sans s'arrêter. |

  Règle: La page d'une pose présente les transitions qui y arrivent, chacune avec sa pose de départ, son nom, ses difficultés et sa description

    @api @web
    Scénario: Un visiteur voit les transitions vers une pose
      Soit les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom | difficulté base | difficulté flyer | description |
        | Throne         | Bird           |     | débutant        | débutant         |             |
        | Bird           | Throne         |     | débutant        | découverte       |             |
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors les transitions vers la pose "Bird" sont exactement :
        | pose de départ | nom | difficulté base | difficulté flyer | description |
        | Throne         |     | débutant        | débutant         |             |

  # Garanti par l'API (ADR 0007) : vérifié une fois côté @api, le site affiche l'ordre reçu.
  Règle: Les transitions sont présentées dans l'ordre du catalogue sur l'autre pose, puis sur leur nom, les transitions sans nom en premier

    @api
    Scénario: Les transitions depuis une pose sont triées par pose d'arrivée, puis par nom
      Soit les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom        | difficulté base | difficulté flyer | description |
        | Star           | Throne         |            | intermédiaire   | intermédiaire    |             |
        | Star           | Star           | Ninja Star | avancé          | avancé           |             |
        | Star           | Bird           |            | intermédiaire   | intermédiaire    |             |
        | Star           | Star           |            | intermédiaire   | avancé           |             |
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors les transitions depuis la pose "Star" sont présentées dans cet ordre :
        | pose d'arrivée | nom        |
        | Bird           |            |
        | Star           |            |
        | Star           | Ninja Star |
        | Throne         |            |

  Règle: Une washing machine figure parmi les transitions depuis et vers sa pose

    @api
    Scénario: Une washing machine est présentée dans les deux sections de sa pose
      Soit la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors les transitions depuis la pose "Star" présentent "Ninja Star" vers "Star"
      Et les transitions vers la pose "Star" présentent "Ninja Star" depuis "Star"

    @web
    Scénario: Le site marque l'autre pose d'une washing machine comme la même pose
      Soit la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors les transitions depuis la pose "Star" présentent "Ninja Star" vers la même pose

  Règle: Une transition sans nom se présente par ses poses

    @web
    Scénario: Le site présente une transition sans nom par sa pose de départ et sa pose d'arrivée
      Soit la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" présentent la transition « Throne → Bird »

  Règle: Seules les transitions publiées sont présentées

    @api
    Scénario: Une transition en attente de validation n'est pas présentée
      Soit Alice est utilisateur
      Et Alice a proposé une transition sans nom de "Throne" vers "Bird"
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors aucune transition n'est présentée vers la pose "Bird"

  Règle: Une transition suit le renommage de ses poses

    @api
    Scénario: Après le renommage de sa pose d'arrivée, la transition la présente sous son nouveau nom
      Soit la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et Bruno est validateur
      Et Bruno a proposé de modifier la pose "Bird" en changeant le nom en "Front Bird"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom | difficulté base | difficulté flyer | description |
        | Front Bird     |     | débutant        | débutant         |             |

  Règle: Une pose sans transition le signale, section par section

    @api
    Scénario: Une pose sans transition n'en présente aucune
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors aucune transition n'est présentée depuis la pose "Star"
      Et aucune transition n'est présentée vers la pose "Star"

    @web
    Scénario: Un visiteur est informé qu'aucune transition ne part d'une pose
      Soit la transition publiée sans nom de "Throne" vers "Star" de difficulté base "débutant" et de difficulté flyer "intermédiaire"
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors le site indique « Aucune transition ne part de Star pour l'instant. »

    @web
    Scénario: Un visiteur est informé qu'aucune transition n'arrive à une pose
      Soit la transition publiée sans nom de "Star" vers "Throne" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors le site indique « Aucune transition n'arrive à Star pour l'instant. »

  Règle: La page d'une pose présente ses caractéristiques, la légende de l'échelle et l'avertissement de responsabilité

    @web
    Scénario: La page d'une pose présente ses caractéristiques
      Soit la pose publiée "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "découverte", qui peut commencer un flow et peut terminer un flow
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec la difficulté base "débutant" et la difficulté flyer "découverte", qui peut commencer un flow et peut terminer un flow

    @web
    Scénario: La page d'une pose rappelle que les chutes arrivent surtout pendant les transitions
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page présente l'avertissement de responsabilité sur les transitions sous la légende de l'échelle de difficulté

  Règle: Seule une pose publiée peut être consultée

    @api
    Scénario: Une pose inconnue du catalogue est introuvable
      Quand un visiteur consulte une pose qui n'existe pas dans le catalogue
      Alors la pose est introuvable dans le catalogue

    @web
    Scénario: Le site signale une pose introuvable
      Quand un visiteur consulte une pose qui n'existe pas dans le catalogue
      Alors le site présente la page « Pose introuvable »

  # Le site distingue un AcroFunJam injoignable d'une pose sans transition.
  Règle: Le site signale une page de pose impossible à charger et permet de réessayer

    @web
    Scénario: Le site signale que la page de la pose n'a pas pu être chargée
      Soit AcroFunJam est momentanément injoignable
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors le site indique que la pose n'a pas pu être chargée et que le visiteur peut réessayer

    @web
    Scénario: Un visiteur charge la page de la pose en réessayant quand AcroFunJam est de nouveau joignable
      Soit la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et le chargement de la pose "Throne" a échoué car AcroFunJam était injoignable
      Et AcroFunJam est de nouveau joignable
      Quand le visiteur réessaie de charger la pose
      Alors les transitions depuis la pose "Throne" présentent la transition « Throne → Bird »

  Règle: On navigue de pose en pose : du catalogue vers la page d'une pose, et d'une transition vers l'autre pose

    @web
    Scénario: Un visiteur ouvre la page d'une pose depuis sa carte du catalogue
      Soit un visiteur consulte les poses du catalogue
      Quand le visiteur ouvre la pose "Throne" depuis le catalogue
      Alors le site présente la pose "Throne" du catalogue

    @web
    Scénario: Un visiteur ouvre la page de l'autre pose depuis une transition
      Soit la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et un visiteur consulte la pose "Throne" du catalogue
      Quand le visiteur ouvre la pose d'arrivée "Bird" depuis la transition « Throne → Bird »
      Alors le site présente la pose "Bird" du catalogue

    @web
    Scénario: Un visiteur revient au catalogue depuis la page d'une pose
      Soit un visiteur consulte la pose "Throne" du catalogue
      Quand le visiteur revient au catalogue
      Alors le site présente les poses du catalogue
