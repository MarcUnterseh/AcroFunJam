# language: fr
@Integration
Fonctionnalité: Étiqueter une transition publiée
  Afin que les transitions publiées sans étiquette, ou mal étiquetées, servent au futur générateur de flow
  En tant que validateur ou administrateur
  Je veux choisir directement les étiquettes d'une transition publiée

  # Story 8 « Étiquettes », volet Catalogue : étiquetage direct. Décisions du porteur du produit (2026-11-13) :
  # decouverte.md, « Story 8 Étiquettes ».
  #
  # Décisions principales :
  # - les transitions déjà publiées restent publiées, sans étiquette ; aucune exigence d'étiquetage complet du
  #   catalogue, même avant le générateur (Q121, Q123, Q137, Q138) ;
  # - un validateur ou un administrateur choisit directement l'ensemble des étiquettes d'une transition publiée, qui
  #   s'applique aussitôt, sans proposition ni validation (capacité « gérer les étiquettes ») ; la dernière action
  #   l'emporte, sans contrôle de version ; le contributeur d'origine n'est pas prévenu ; pas d'historique (Q123, Q125,
  #   Q143) ;
  # - « pop », « whip » ou « icarien » ajoutent « dynamique » (Q136).
  # Site (Q154, Q158, Q159) : sur la page d'une pose, chaque transition a un repli ; l'action « Étiqueter » y figure
  # pour les validateurs et les administrateurs, même quand la transition ne porte aucune étiquette. Une washing
  # machine figure dans les deux sections : l'étiqueter depuis l'une met à jour les deux.
  # Un utilisateur qui veut changer les étiquettes d'une transition publiée : story « Modifier une transition » (Q124).
  #
  # Personnages : Alice est utilisatrice, Bruno validateur, Paul administrateur.
  # Hors périmètre : étiquettes des poses, étiquetage groupé de plusieurs transitions, écran mobile.

  Contexte:
    Soit les poses publiées "Throne", "Bird", "Star" et "Folded Leaf" dans le catalogue
    Et la liste des étiquettes est la liste amorcée
    Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"

  Règle: Une transition publiée sans étiquette reste publiée et présentée

    @api
    Scénario: Une transition publiée avant les étiquettes n'en porte aucune
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | difficulté base | difficulté flyer | étiquettes |
        | Bird           | Pop to Bird | intermédiaire   | intermédiaire    |            |

  Règle: Un validateur ou un administrateur étiquette directement une transition publiée

    @api
    Plan du Scénario: Un <rôle> étiquette une transition publiée, qui présente aussitôt ses étiquettes
      Soit Bruno est <rôle>
      Et Bruno a étiqueté la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "pop"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | étiquettes     |
        | Bird           | Pop to Bird | dynamique, pop |

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api
    Scénario: Les étiquettes choisies remplacent celles de la transition
      Soit Bruno est validateur
      Et Bruno a étiqueté la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "pop"
      Et Bruno a étiqueté la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "icarien" et "vrille"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | étiquettes                 |
        | Bird           | Pop to Bird | dynamique, icarien, vrille |

    @api
    Scénario: Un validateur retire toutes les étiquettes d'une transition publiée
      Soit Bruno est validateur
      Et Bruno a étiqueté la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "pop"
      Et Bruno a retiré toutes les étiquettes de la transition "Pop to Bird" de "Throne" vers "Bird"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | étiquettes |
        | Bird           | Pop to Bird |            |

  # Q136 : la même règle qu'à la proposition et à l'ajustement.
  Règle: Étiqueter une transition publiée en « pop », « whip » ou « icarien » lui ajoute « dynamique »

    @api
    Scénario: « dynamique » reste portée tant que « pop » l'est
      Soit Bruno est validateur
      Et Bruno a étiqueté la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "pop"
      Et Bruno a étiqueté la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "pop" et "inversion"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | étiquettes                |
        | Bird           | Pop to Bird | dynamique, inversion, pop |

  Règle: Seul un validateur ou un administrateur étiquette directement une transition publiée

    @api
    Scénario: Un utilisateur ne peut pas étiqueter une transition publiée
      Soit Alice est utilisateur
      Quand Alice étiquette la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "pop"
      Alors l'étiquetage est refusé car seul un validateur ou un administrateur gère les étiquettes

    @api
    Scénario: Un visiteur ne peut pas étiqueter une transition publiée
      Quand un visiteur étiquette la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "pop"
      Alors l'étiquetage est refusé car il faut être connecté

  Règle: Seule une transition publiée s'étiquette, et seulement avec des étiquettes de la liste

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une étiquette absente de la liste rend l'étiquetage impossible
      Quand Bruno étiquette la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "classique"
      Alors l'étiquetage est impossible car l'étiquette "classique" n'est pas dans la liste des étiquettes

    @api
    Scénario: Une transition inconnue du catalogue ne peut pas être étiquetée
      Quand Bruno étiquette une transition qui n'existe pas dans le catalogue avec les étiquettes "pop"
      Alors l'étiquetage est impossible car la transition est introuvable dans le catalogue

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site (les pas visent le nom accessible des transitions sans nom, « de Bird vers Folded Leaf »)
  # ---------------------------------------------------------------------------------------------------

  Règle: Sur le site, seul un validateur ou un administrateur est invité à étiqueter une transition publiée

    Contexte:
      Soit la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"

    @web @wip
    Scénario: Un validateur est invité à étiqueter une transition qui ne porte aucune étiquette
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno consulte la pose "Bird" du catalogue
      Alors la page de la pose invite Bruno à étiqueter la transition « de Bird vers Folded Leaf »

    @web @wip
    Scénario: Un utilisateur n'est pas invité à étiqueter une transition publiée
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte la pose "Bird" du catalogue
      Alors la page de la pose n'invite pas Alice à étiqueter la transition « de Bird vers Folded Leaf »

  Règle: Sur le site, le validateur étiquette une transition depuis la page d'une pose

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web @wip
    Scénario: La page de la pose présente aussitôt les étiquettes choisies par le validateur
      Soit la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand Bruno étiquette sur le site, depuis la pose "Bird", la transition « de Bird vers Folded Leaf » avec les étiquettes "lunaire"
      Alors les transitions depuis la pose "Bird" présentent la transition « de Bird vers Folded Leaf » avec les étiquettes « lunaire »

    # Ninja Star est une washing machine plutôt contrôlée : on l'étiquette « inversion » (le flyer passe tête en bas).
    @web @wip
    Scénario: Une washing machine étiquetée depuis une section présente ses étiquettes dans les deux sections
      Soit la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand Bruno étiquette sur le site, depuis la section des transitions depuis la pose "Star", la transition « Ninja Star » avec les étiquettes "inversion"
      Alors les transitions depuis la pose "Star" présentent la transition « Ninja Star » avec les étiquettes « inversion »
      Et les transitions vers la pose "Star" présentent la transition « Ninja Star » avec les étiquettes « inversion »
