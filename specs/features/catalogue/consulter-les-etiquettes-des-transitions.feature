# language: fr
@Integration
Fonctionnalité: Consulter les étiquettes des transitions
  Afin de savoir comment se pratique chaque transition (pop, whip, inversion…)
  En tant que visiteur
  Je veux voir, sur la page d'une pose, les étiquettes de chaque transition qui en part ou qui y arrive

  # Story 8 « Étiquettes », volet Catalogue : présentation. Décisions du porteur du produit (2026-11-13) :
  # decouverte.md, « Story 8 Étiquettes ». Prolonge catalogue/consulter-les-transitions.feature (story 7), dont les
  # règles ne sont pas répétées.
  #
  # Décisions principales :
  # - chaque transition des sections « Transitions depuis <pose> » et « Transitions vers <pose> » présente ses
  #   étiquettes, dans l'ordre du catalogue sur leur nom (Q126, Q130) ;
  # - ligne « Étiquettes » sous les difficultés base et flyer ; rien quand la transition n'en porte aucune (Q127,
  #   Q154) ;
  # - un repli par transition, où le visiteur lit la description de ses étiquettes (Q154, Q158) ;
  # - pas de filtre par étiquette, ni sur la page d'une pose ni dans le catalogue (Q126).
  # Règles d'interface sans scénario dédié (tests unitaires) : place de la ligne « Étiquettes », forme du repli.
  # Le renommage d'une étiquette est couvert par catalogue/gerer-la-liste-des-etiquettes.feature.
  # Exemples (expert acroyoga) : « Pop to Bird » (pop) et « Forbidden » (whip en arrière), de Throne vers Bird.
  # Hors périmètre : filtre par étiquette, étiquettes des poses, générateur de flow, écran mobile.

  Contexte:
    Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue
    Et la liste des étiquettes est la liste amorcée

  Règle: La page d'une pose présente les étiquettes de chaque transition qui en part et qui y arrive

    @api @web @wip
    Scénario: Un visiteur voit les étiquettes des transitions depuis une pose
      Soit la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec l'étiquette "pop"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | étiquettes     |
        | Bird           | Pop to Bird | dynamique, pop |

    @api
    Scénario: Un visiteur voit les étiquettes des transitions vers une pose
      Soit la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec l'étiquette "pop"
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors les transitions vers la pose "Bird" sont exactement :
        | pose de départ | nom         | étiquettes     |
        | Throne         | Pop to Bird | dynamique, pop |

  # Garanti par l'API (ADR 0007) : vérifié une fois côté @api, le site affiche l'ordre reçu.
  Règle: Les étiquettes d'une transition sont présentées dans l'ordre du catalogue sur leur nom

    @api
    Scénario: Les étiquettes d'une transition sont triées par nom
      Soit la transition publiée "Forbidden" de "Throne" vers "Bird" de difficulté base "avancé" et de difficulté flyer "avancé", avec les étiquettes "whip" et "inversion"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Forbidden" depuis la pose "Throne" présente ses étiquettes dans cet ordre : "dynamique", "inversion", "whip"

  Règle: Une transition sans étiquette n'en présente aucune

    @web @wip
    Scénario: Le site ne présente aucune étiquette pour une transition qui n'en porte pas
      Soit la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition « de Throne vers Bird » ne présente aucune étiquette

  Règle: Le visiteur lit, depuis la page d'une pose, la description des étiquettes d'une transition

    @web @wip
    Scénario: Un visiteur lit la description d'une étiquette dans le repli d'une transition
      Soit la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec l'étiquette "pop"
      Quand un visiteur déplie la transition « Pop to Bird » sur la page de la pose "Throne"
      Alors le site présente la description de l'étiquette « pop » : « La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. »
