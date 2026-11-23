# language: fr
@Integration
Fonctionnalité: Consulter les vidéos des transitions
  Afin de voir comment se fait une transition avant de l'essayer
  En tant que visiteur
  Je veux trouver, sur la page d'une pose, les vidéos de chaque transition qui en part ou qui y arrive

  # ATTENTION : STORY ULTÉRIEURE (story 12), NON VALIDÉE. Ces scénarios reposent sur les RECOMMANDATIONS de l'analyse
  # (Q225 à Q245), pas encore tranchées par le porteur du produit. Ils sont tous @wip. Le 2026-11-20, le porteur du
  # produit a choisi de commencer par les photos des poses (Q224, story 10) ; les vidéos viennent après. À revoir
  # avant d'implémenter : decouverte.md, « Story 10 Photos des poses », sous-section « Story 12 Lier des vidéos à une
  # transition (story ultérieure) ».
  #
  # Story 12, volet Catalogue : présentation. Prolonge catalogue/consulter-les-transitions.feature (story 7) et
  # catalogue/consulter-les-etiquettes-des-transitions.feature (story 8), dont les règles ne sont pas répétées.
  # Les règles de liaison (hébergeurs, légende, nombre, ordre, doublons) sont dans
  # catalogue/lier-des-videos-a-une-transition.feature.
  #
  # Recommandations retenues pour ces scénarios :
  # - chaque transition des sections « Transitions depuis <pose> » et « Transitions vers <pose> » présente ses vidéos,
  #   dans l'ordre où elles ont été liées ; rien quand elle n'en a aucune (Q232, Q240) ;
  # - une vidéo est présentée par sa légende et son hébergeur ; c'est un lien qui mène à la vidéo chez l'hébergeur,
  #   sans lecteur intégré dans AcroFunJam : aucun contenu ni traceur de l'hébergeur n'est chargé avant que la
  #   personne choisisse d'ouvrir la vidéo (Q228) ;
  # - aucun nouvel avertissement : l'avertissement de responsabilité de la page d'une pose couvre les vidéos (Q242).
  # Règles d'interface sans scénario dédié (tests unitaires, revue ux-expert) : place des vidéos dans le repli de la
  # transition, annonce d'un lien qui ouvre un autre site, libellés exacts.
  #
  # Hors périmètre : lecteur intégré, vignette de la vidéo, vidéos des poses, vidéos dans le générateur de flow,
  # écran mobile, consultation hors ligne.

  Contexte:
    Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue
    Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
    Et la transition "Pop to Bird" de "Throne" vers "Bird" a pour vidéos :
      | adresse                      | légende                  |
      | https://vimeo.com/123456789  | Pop to Bird, vue de face |
      | https://youtu.be/AbCdEfGhIjK | Pop to Bird, vue de côté |

  Règle: La page d'une pose présente les vidéos de chaque transition qui en part et qui y arrive

    @api @wip
    Scénario: Un visiteur voit les vidéos des transitions depuis une pose
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente exactement les vidéos :
        | légende                  | hébergeur | adresse                      |
        | Pop to Bird, vue de face | Vimeo     | https://vimeo.com/123456789  |
        | Pop to Bird, vue de côté | YouTube   | https://youtu.be/AbCdEfGhIjK |

    @api @wip
    Scénario: Un visiteur voit les vidéos des transitions vers une pose
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la transition "Pop to Bird" vers la pose "Bird" présente exactement les vidéos :
        | légende                  | hébergeur |
        | Pop to Bird, vue de face | Vimeo     |
        | Pop to Bird, vue de côté | YouTube   |

    @web @wip
    Scénario: Sur le site, chaque vidéo d'une transition est un lien vers la vidéo chez son hébergeur
      Quand un visiteur déplie la transition « Pop to Bird » sur la page de la pose "Throne"
      Alors le site présente la vidéo « Pop to Bird, vue de côté » comme un lien vers YouTube
      Et le site présente la vidéo « Pop to Bird, vue de face » comme un lien vers Vimeo

  Règle: Une transition sans vidéo n'en présente aucune

    @api @web @wip
    Scénario: Une transition sans vidéo ne présente aucune vidéo
      Soit la transition publiée sans nom de "Bird" vers "Star" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la transition « de Bird vers Star » ne présente aucune vidéo

  # Q228 : pas de lecteur intégré dans la story 10 (vie privée, consentement aux traceurs de l'hébergeur).
  Règle: Le site ne charge rien de l'hébergeur tant que la personne n'ouvre pas une vidéo

    @web @wip
    Scénario: Consulter la page d'une pose ne charge aucun contenu de l'hébergeur d'une vidéo
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page de la pose ne charge aucun contenu de YouTube ni de Vimeo
