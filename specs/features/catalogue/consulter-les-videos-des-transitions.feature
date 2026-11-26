# language: fr
@Integration
Fonctionnalité: Consulter les vidéos des transitions
  Afin de voir comment se fait une transition avant de l'essayer
  En tant que visiteur
  Je veux regarder, sur la page d'une pose, les vidéos de chaque transition qui en part ou qui y arrive

  # Story 12 « Vidéos des transitions », volet Catalogue : présentation. Carte réécrite le 2026-11-26 après le
  # changement de cap du porteur du produit (vidéos téléversées et stockées par AcroFunJam, 30 secondes au plus, son
  # retiré) : decouverte.md, « Story 12 Vidéos des transitions ». Prolonge catalogue/consulter-les-transitions.feature
  # (story 7) et catalogue/consulter-les-photos-des-poses.feature (story 10), dont les règles ne sont pas répétées. Les
  # règles d'ajout (formats, durée, préparation, légende, crédit, droits, nombre, ordre, retrait) sont dans
  # catalogue/ajouter-des-videos-a-une-transition.feature.
  # CARTE VALIDÉE LE 2026-11-26 par le porteur du produit, avec les avis de l'ux-expert (UX-47 à UX-59). Tous @wip.
  #
  # Décisions suivies par ces scénarios :
  # - chaque transition des sections « Transitions depuis <pose> » et « Transitions vers <pose> » présente ses vidéos
  #   prêtes, dans l'ordre où elles ont été ajoutées, chacune avec sa légende et « Vidéo : <crédit> » ; rien quand
  #   elle n'en a aucune ; une washing machine les présente dans les deux sections (Q232, Q240) ;
  # - dans l'élément de la transition, sans repli, après la description et avant le repli « Ce que veulent dire ces
  #   étiquettes », en rangée horizontale d'affiches compactes (UX-50, à maquetter) ; pas de section « Vidéos » ;
  #   ordre des sections de la page inchangé (Q240) ;
  # - description de la vidéo facultative, dans un repli « Description de la vidéo » sous la vidéo, reliée au lecteur
  #   (UX-47) ; sans elle, ni repli ni description, la légende reste le nom accessible ;
  # - lecteur du site : une vidéo ne démarre jamais d'elle-même ; seule son affiche est chargée avec la page ; un bouton
  #   de lecture propre au site, puis le lecteur du navigateur (UX-53) ; lancée, elle se lit en boucle, sans son,
  #   jusqu'à ce qu'on la mette en pause, une seule fois avec « réduire les animations » (UX-51) ; une seule vidéo lue
  #   à la fois (UX-54) ; dans la page, sans plein écran imposé (Q299) ; aucune mention « sans son » (UX-56) ;
  # - une phrase de sécurité précède les vidéos (Q242, avis de l'expert acroyoga, UX-58) ;
  # - la politique de confidentialité dit ce qu'AcroFunJam fait des vidéos et comment en faire retirer une (Q285).
  # Règles d'interface sans scénario dédié (tests unitaires, revue ux-expert et ui-designer) : rangée d'affiches
  # (element-transition.md), taille du lecteur, vidéos en portrait, bouton de lecture, absence de mention « sans son ».
  #
  # Hors périmètre : vidéos des poses (12c), vidéos dans le générateur de flow et dans l'application (12d), lecture
  # ralentie dédiée, consultation hors ligne.

  Contexte:
    Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue
    Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
    Et la transition "Pop to Bird" de "Throne" vers "Bird" a pour vidéos, dans cet ordre :
      | fichier                                         | légende                            | crédit       | description                                                                            |
      | une vidéo MP4 de 12 s                           | Pop to Bird, démonstration de face | Léa Martin   |                                                                                        |
      | une vidéo MOV HEVC de 20 s filmée par un iPhone | Pop to Bird, tutoriel              | Hugo Bernard | La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. |

  Règle: La page d'une pose présente les vidéos de chaque transition qui en part et qui y arrive

    @api @wip
    Scénario: Un visiteur voit les vidéos des transitions depuis une pose
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente exactement les vidéos :
        | légende                            | crédit       |
        | Pop to Bird, démonstration de face | Léa Martin   |
        | Pop to Bird, tutoriel              | Hugo Bernard |

    @api @wip
    Scénario: Un visiteur voit les vidéos des transitions vers une pose
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la transition "Pop to Bird" vers la pose "Bird" présente exactement les vidéos :
        | légende                            | crédit       |
        | Pop to Bird, démonstration de face | Léa Martin   |
        | Pop to Bird, tutoriel              | Hugo Bernard |

    @api @wip
    Scénario: Une washing machine présente ses vidéos dans les deux sections de la page de sa pose
      Soit la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Et la transition "Ninja Star" de "Star" vers "Star" a pour vidéos, dans cet ordre :
        | fichier               | légende                | crédit    |
        | une vidéo MP4 de 15 s | Ninja Star, deux tours | Lulu Acro |
      Quand un visiteur consulte la pose "Star" du catalogue
      Alors la transition "Ninja Star" depuis la pose "Star" présente exactement les vidéos :
        | légende                | crédit    |
        | Ninja Star, deux tours | Lulu Acro |
      Et la transition "Ninja Star" vers la pose "Star" présente exactement les vidéos :
        | légende                | crédit    |
        | Ninja Star, deux tours | Lulu Acro |

    @web @wip
    Scénario: Sur le site, chaque vidéo d'une transition est présentée avec sa légende et son crédit
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition « Pop to Bird » présente la vidéo « Pop to Bird, démonstration de face », créditée « Vidéo : Léa Martin »
      Et la transition « Pop to Bird » présente la vidéo « Pop to Bird, tutoriel », créditée « Vidéo : Hugo Bernard »

  Règle: Une transition sans vidéo n'en présente aucune

    @api @web @wip
    Scénario: Une transition sans vidéo ne présente aucune vidéo
      Soit la transition publiée sans nom de "Bird" vers "Star" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors « la transition de Bird vers Star » ne présente aucune vidéo

  # UX-47, Q302 (décision du porteur du produit, 2026-11-26) : description facultative ; règles de saisie dans
  # catalogue/ajouter-des-videos-a-une-transition.feature.
  Règle: Une vidéo qui a une description la présente dans un repli sous la vidéo

    @api @wip
    Scénario: Un visiteur voit la description d'une vidéo qui en a une, et aucune pour une vidéo qui n'en a pas
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, tutoriel » de la transition "Pop to Bird" depuis la pose "Throne" a pour description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »
      Et la vidéo « Pop to Bird, démonstration de face » de la transition "Pop to Bird" depuis la pose "Throne" n'a pas de description

    @web @wip
    Scénario: Sur le site, la description d'une vidéo est dans un repli sous elle, reliée au lecteur
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, tutoriel » présente, dans un repli « Description de la vidéo », « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »
      Et le lecteur de la vidéo « Pop to Bird, tutoriel » est décrit par cette description

    @web @wip
    Scénario: Sur le site, une vidéo sans description ne présente pas de repli
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, démonstration de face » ne présente pas de repli « Description de la vidéo »

  # Q299 : pas de lecture automatique (données mobiles, mouvement imposé, WCAG 2.2.2) ; une vidéo courte et muette d'un
  # mouvement se regarde plusieurs fois : lecture en boucle une fois lancée, une seule fois avec la préférence
  # « réduire les animations » (UX-51). Le site ne mentionne pas « sans son » (UX-56).
  Règle: Sur le site, une vidéo ne se lit que lorsque le visiteur la lance, puis en boucle et sans son

    @web @wip
    Scénario: Une vidéo ne démarre pas d'elle-même : la page présente son affiche
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, démonstration de face » présente son affiche, sans être lue

    @web @wip
    Scénario: Consulter la page d'une pose ne télécharge aucune vidéo tant que le visiteur n'en lance pas une
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page de la pose n'a téléchargé que les affiches des vidéos

    @web @wip
    Scénario: Une vidéo lancée se lit en boucle, sans son
      Soit un visiteur consulte la pose "Throne" du catalogue
      Quand le visiteur lance la vidéo « Pop to Bird, tutoriel »
      Alors la vidéo « Pop to Bird, tutoriel » se lit en boucle, sans son

    @web @wip
    Scénario: Le visiteur met en pause une vidéo lancée
      Soit un visiteur a lancé la vidéo « Pop to Bird, tutoriel » sur la page de la pose "Throne"
      Quand le visiteur met en pause la vidéo « Pop to Bird, tutoriel »
      Alors la vidéo « Pop to Bird, tutoriel » n'est plus lue

    @web @wip
    Scénario: Avec la préférence « réduire les animations », une vidéo lancée se lit une seule fois
      Soit un visiteur qui préfère réduire les animations consulte la pose "Throne" du catalogue
      Quand le visiteur lance la vidéo « Pop to Bird, tutoriel »
      Alors la vidéo « Pop to Bird, tutoriel » se lit une seule fois, sans boucle

  # UX-54 : deux vidéos lues ensemble se gênent et doublent les données téléchargées.
  Règle: Sur le site, une seule vidéo se lit à la fois

    @web @wip
    Scénario: Lancer une vidéo met en pause celle qui était lue
      Soit un visiteur a lancé la vidéo « Pop to Bird, démonstration de face » sur la page de la pose "Throne"
      Quand le visiteur lance la vidéo « Pop to Bird, tutoriel »
      Alors la vidéo « Pop to Bird, démonstration de face » n'est plus lue

  # Q242 (recommandation révisée, avis de l'expert acroyoga) : une phrase dans chaque transition qui présente des
  # vidéos, avant elles (UX-58) ; rien pour une transition sans vidéo.
  Règle: Sur le site, les vidéos d'une transition sont précédées du rappel qu'elles ne remplacent ni un cours ni un spotter

    @web @wip
    Scénario: Les vidéos d'une transition sont précédées du rappel de sécurité
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition « Pop to Bird » rappelle, avant ses vidéos, « Une vidéo montre une façon de faire ; elle ne remplace ni un cours ni un spotter. »

  # Q285 (recommandation révisée) : des vidéos où figurent des personnes sont des données personnelles, comme les
  # photos. Ces scénarios rejoindront informations-legales/mentions-legales-et-confidentialite.feature à
  # l'implémentation ; la date « Dernière mise à jour » change avec eux.
  Règle: La politique de confidentialité dit ce qu'AcroFunJam fait des vidéos, et comment en faire retirer une

    @web @wip
    Scénario: La politique de confidentialité décrit les vidéos publiées
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité indique qu'une vidéo est publiée avec son crédit, une légende et, s'il y en a une, une description, sans son ni métadonnées, et que les personnes filmées ne sont jamais nommées

    @web @wip
    Scénario: La politique de confidentialité indique la durée de conservation de la confirmation des droits sur une vidéo
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité indique que la confirmation des droits sur une vidéo est gardée aussi longtemps que la vidéo

    @web @wip
    Scénario: La politique de confidentialité explique comment faire retirer une vidéo où l'on figure
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité indique qu'on peut faire retirer une vidéo où l'on figure en écrivant à "contact@acrofunjam.fr"
