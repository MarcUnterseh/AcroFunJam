# language: fr
@Integration
Fonctionnalité: Étiquettes applicables aux poses
  Afin que chaque pose ne soit qualifiée qu'avec des étiquettes qui ont un sens pour une position tenable
  En tant que validateur ou administrateur
  Je veux préciser, pour chaque étiquette de la liste, si elle s'applique aux poses, aux transitions ou aux deux

  # Story 9a « Étiqueter les poses » (prérequis de la story 9 « Générer un flow »), volet Catalogue : la liste des
  # étiquettes. Décisions du porteur du produit (2026-11-18) : decouverte.md, « Story 9a Étiqueter les poses ».
  # Prolonge catalogue/gerer-la-liste-des-etiquettes.feature (story 8), dont les règles ne sont pas répétées. Autres
  # volets : catalogue/consulter-les-etiquettes-des-poses.feature (catalogue et page d'une pose),
  # catalogue/etiqueter-une-pose-publiee.feature (étiquetage direct), contribution/etiqueter-une-pose.feature
  # (proposition, modification, décision).
  #
  # Décisions principales :
  # - chaque étiquette a un champ d'application : les poses, les transitions, ou les poses et les transitions (Q164) ;
  # - à l'amorçage, « inversion » et « lunaire » s'appliquent aux poses et aux transitions, les autres (« icarien »
  #   compris) aux transitions seulement, y compris celles ajoutées entre-temps par un validateur (Q165) ;
  # - nouvelles descriptions amorcées de « inversion » et « lunaire » ; une liste amorcée avant la story les reçoit
  #   si elles n'ont pas été changées depuis l'amorçage (Q166) ;
  # - champ d'application obligatoire à l'ajout, sans valeur par défaut (Q167) ; il se change, sauf à retirer une cible
  #   encore portée : le refus liste les porteurs (poses, transitions, propositions en attente) (Q168) ;
  # - une étiquette qui en implique une autre ne s'applique que là où l'autre s'applique ; on ne peut pas retirer à
  #   l'étiquette impliquée une cible où l'impliquante s'applique (Q169) ;
  # - retrait impossible tant qu'une pose publiée, une proposition de pose ou une modification en attente porte
  #   l'étiquette (Q176) ; « Portée par 1 pose et 2 transitions », selon le champ d'application, éléments publiés
  #   seulement (Q175) ;
  # - champ d'application présenté à tous : « S'applique aux poses », « S'applique aux transitions », « S'applique aux
  #   poses et aux transitions » ; saisi par trois boutons radio (« S'applique à » : « Aux poses », « Aux transitions »,
  #   « Aux poses et aux transitions »), aucun choisi d'avance, erreur « Choisis à quoi s'applique l'étiquette. » ;
  #   introduction de la page : « Les étiquettes décrivent les poses et les transitions. Le futur générateur de flow
  #   s'en servira. » (Q178).
  # À réviser à l'implémentation (story 8) : le scénario d'amorçage de gerer-la-liste-des-etiquettes.feature (anciennes
  # descriptions de « inversion » et « lunaire ») et celui de « Portée par 2 transitions » (libellé selon le champ).
  #
  # Personnages : Alice est utilisatrice, Bruno validateur, Paul administrateur.
  # Hors périmètre : filtre par étiquette (Q179), écran mobile (Q180).

  # ---------------------------------------------------------------------------------------------------
  # Amorçage (Q165, Q166)
  # ---------------------------------------------------------------------------------------------------

  Règle: À l'amorçage, seules « inversion » et « lunaire » s'appliquent aussi aux poses

    @api
    Scénario: La liste amorcée présente le champ d'application de chaque étiquette
      Soit AcroFunJam est déployé pour la première fois
      Quand un visiteur consulte la liste des étiquettes
      Alors la liste des étiquettes présente exactement :
        | étiquette | champ d'application  |
        | dynamique | transitions          |
        | icarien   | transitions          |
        | inversion | poses et transitions |
        | lunaire   | poses et transitions |
        | pop       | transitions          |
        | vrille    | transitions          |
        | whip      | transitions          |

    @api
    Scénario: Une étiquette ajoutée avant les étiquettes des poses s'applique aux transitions seulement
      Soit AcroFunJam est déployé pour la première fois, sans les étiquettes des poses
      Et Bruno est validateur
      Et Bruno a ajouté à la liste l'étiquette "salto" avec la description « Le flyer fait un tour complet tête en bas. »
      Quand AcroFunJam est déployé avec les étiquettes des poses
      Alors l'étiquette "salto" s'applique aux transitions seulement

  Règle: Les descriptions amorcées de « inversion » et « lunaire » valent pour les poses comme pour les transitions

    @api
    Scénario: Au premier déploiement, « inversion » et « lunaire » ont leurs descriptions pour les poses et les transitions
      Soit AcroFunJam est déployé pour la première fois
      Quand un visiteur consulte la liste des étiquettes
      Alors la liste des étiquettes présente l'étiquette "inversion" avec la description « La tête du flyer est plus basse que ses hanches, dans la pose ou à un moment de la transition. Ex. : Candlestick, Straddle Bat. »
      Et la liste des étiquettes présente l'étiquette "lunaire" avec la description « Pratique thérapeutique : le flyer, détendu et passif, se laisse porter et étirer par la base ; les passages se font lentement. Ex. : Folded Leaf, Straddle Bat. »

    @api
    Scénario: Une liste amorcée avant les étiquettes des poses reçoit les nouvelles descriptions qu'elle n'avait pas changées
      Soit AcroFunJam est déployé pour la première fois, sans les étiquettes des poses
      Quand AcroFunJam est déployé avec les étiquettes des poses
      Alors la liste des étiquettes présente l'étiquette "inversion" avec la description « La tête du flyer est plus basse que ses hanches, dans la pose ou à un moment de la transition. Ex. : Candlestick, Straddle Bat. »

    @api
    Scénario: Une description changée par un validateur avant les étiquettes des poses est conservée
      Soit AcroFunJam est déployé pour la première fois, sans les étiquettes des poses
      Et Bruno est validateur
      Et Bruno a changé la description de l'étiquette "lunaire" en « Le flyer se laisse porter, détendu. »
      Quand AcroFunJam est déployé avec les étiquettes des poses
      Alors la liste des étiquettes présente l'étiquette "lunaire" avec la description « Le flyer se laisse porter, détendu. »

  # ---------------------------------------------------------------------------------------------------
  # Ajouter et changer le champ d'application (Q167, Q168)
  # ---------------------------------------------------------------------------------------------------

  Règle: Une étiquette ajoutée à la liste a un champ d'application obligatoire, sans valeur par défaut

    Contexte:
      Soit Bruno est validateur

    @api
    Plan du Scénario: Le validateur ajoute une étiquette qui s'applique <champ>
      Quand Bruno ajoute à la liste l'étiquette "contrepoids" avec la description « Base et flyer s'équilibrent en tirant l'un contre l'autre. », qui s'applique <champ>
      Alors l'étiquette "contrepoids" s'applique <champ>

      Exemples:
        | champ                        |
        | aux poses seulement          |
        | aux transitions seulement    |
        | aux poses et aux transitions |

    @api
    Scénario: L'ajout d'une étiquette sans champ d'application est impossible
      Quand Bruno ajoute à la liste l'étiquette "contrepoids" avec la description « Base et flyer s'équilibrent en tirant l'un contre l'autre. », sans préciser à quoi elle s'applique
      Alors l'ajout de l'étiquette est impossible car il faut préciser si l'étiquette s'applique aux poses, aux transitions ou aux deux

  Règle: Le champ d'application d'une étiquette se change, sauf à retirer une cible encore portée

    Contexte:
      Soit Bruno est validateur
      Et la liste des étiquettes est la liste amorcée
      Et les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue

    @api
    Scénario: Le validateur étend une étiquette aux poses
      Quand Bruno change le champ d'application de l'étiquette "vrille" en « poses et transitions »
      Alors l'étiquette "vrille" s'applique aux poses et aux transitions

    @api
    Scénario: Une étiquette portée par une pose publiée ne peut pas cesser de s'appliquer aux poses
      Soit la pose "Folded Leaf" porte l'étiquette "lunaire"
      Quand Bruno change le champ d'application de l'étiquette "lunaire" en « transitions seulement »
      Alors le changement du champ d'application est impossible car l'étiquette est portée par les poses du catalogue :
        | pose        |
        | Folded Leaf |

    @api
    Scénario: Une étiquette portée par une proposition de pose en attente ne peut pas cesser de s'appliquer aux poses
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Candlestick", avec l'étiquette "inversion"
      Quand Bruno change le champ d'application de l'étiquette "inversion" en « transitions seulement »
      Alors le changement du champ d'application est impossible car l'étiquette est portée par les propositions en attente de validation :
        | proposition         | élément     |
        | proposition de pose | Candlestick |

    @api
    Scénario: Une étiquette portée par une transition publiée ne peut pas cesser de s'appliquer aux transitions
      Soit la transition publiée sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunaire"
      Quand Bruno change le champ d'application de l'étiquette "lunaire" en « poses seulement »
      Alors le changement du champ d'application est impossible car l'étiquette est portée par les transitions du catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Bird           | Folded Leaf    |     |

  # Q169 : « pop », « whip » et « icarien » impliquent « dynamique » (story 8).
  Règle: Une étiquette qui en implique une autre ne s'applique que là où l'autre s'applique

    Contexte:
      Soit Bruno est validateur
      Et la liste des étiquettes est la liste amorcée

    @api
    Scénario: Une étiquette impliquée ne peut pas cesser de s'appliquer là où s'applique une étiquette qui l'implique
      Quand Bruno change le champ d'application de l'étiquette "dynamique" en « poses seulement »
      Alors le changement du champ d'application est impossible car les étiquettes "icarien", "pop" et "whip", qui ajoutent « dynamique », s'appliquent aux transitions

    @api
    Scénario: Une étiquette ne peut pas s'appliquer là où l'étiquette qu'elle implique ne s'applique pas
      Quand Bruno change le champ d'application de l'étiquette "pop" en « poses et transitions »
      Alors le changement du champ d'application est impossible car l'étiquette « dynamique », que « pop » ajoute, ne s'applique pas aux poses

  # Symétrique des poses : une transition ne porte que des étiquettes qui s'appliquent aux transitions. Refus distinct
  # d'une étiquette absente de la liste (« ne s'applique pas aux transitions »).
  Règle: Une étiquette qui ne s'applique qu'aux poses ne se pose pas sur une transition

    Contexte:
      Soit la liste des étiquettes est la liste amorcée
      Et l'étiquette "contrepoids" dans la liste des étiquettes, qui s'applique aux poses seulement
      Et les poses publiées "Throne" et "Bird" dans le catalogue

    @api
    Scénario: Un validateur ne peut pas étiqueter une transition publiée avec une étiquette réservée aux poses
      Soit Bruno est validateur
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno étiquette la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "contrepoids"
      Alors l'étiquetage est impossible car l'étiquette "contrepoids" ne s'applique pas aux transitions

    @api
    Scénario: Une transition proposée avec une étiquette réservée aux poses est irrecevable
      Soit Alice est utilisateur
      Quand Alice propose une transition sans nom de "Throne" vers "Bird", avec l'étiquette "contrepoids"
      Alors la proposition est irrecevable car l'étiquette "contrepoids" ne s'applique pas aux transitions

    @web
    Scénario: Le formulaire de transition ne propose pas une étiquette réservée aux poses
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice commence à proposer sur le site une transition depuis la pose "Throne"
      Alors le formulaire de transition ne propose pas l'étiquette "contrepoids"

    @web
    Scénario: La zone « Étiqueter » d'une transition ne propose pas une étiquette réservée aux poses
      Soit Bruno est validateur, connecté sur le site
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand Bruno commence à étiqueter sur le site, depuis la pose "Throne", la transition « de Throne vers Bird »
      Alors le site ne propose pas l'étiquette "contrepoids"

  # ---------------------------------------------------------------------------------------------------
  # Retrait et compteur (Q175, Q176)
  # ---------------------------------------------------------------------------------------------------

  Règle: Une étiquette portée par une pose publiée ou par une proposition en attente qui concerne une pose ne peut pas être retirée

    Contexte:
      Soit Bruno est validateur
      Et la liste des étiquettes est la liste amorcée
      Et les poses publiées "Throne", "Folded Leaf" et "Straddle Bat" dans le catalogue

    @api
    Scénario: Le retrait d'une étiquette portée par des poses publiées est impossible et les liste
      Soit la pose "Folded Leaf" porte l'étiquette "lunaire"
      Et la pose "Straddle Bat" porte l'étiquette "lunaire"
      Quand Bruno retire l'étiquette "lunaire" de la liste
      Alors le retrait de l'étiquette est impossible car elle est portée par les poses du catalogue :
        | pose         |
        | Folded Leaf  |
        | Straddle Bat |

    @api
    Scénario: Le retrait d'une étiquette portée par une proposition de pose en attente est impossible et la liste
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Candlestick", avec l'étiquette "inversion"
      Quand Bruno retire l'étiquette "inversion" de la liste
      Alors le retrait de l'étiquette est impossible car elle est portée par les propositions en attente de validation :
        | proposition         | élément     |
        | proposition de pose | Candlestick |

    @api
    Scénario: Le retrait d'une étiquette portée par une modification en attente est impossible et la liste
      Soit Alice est utilisateur
      Et Alice a proposé de modifier la pose "Throne" en changeant les étiquettes en "lunaire"
      Quand Bruno retire l'étiquette "lunaire" de la liste
      Alors le retrait de l'étiquette est impossible car elle est portée par les propositions en attente de validation :
        | proposition                 | élément |
        | proposition de modification | Throne  |

  Règle: La liste indique combien de poses et de transitions publiées portent chaque étiquette

    @api
    Scénario: Seules les poses et les transitions publiées sont comptées
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées "Bird", "Folded Leaf" et "Throne" dans le catalogue
      Et Alice est utilisateur
      Et la pose "Folded Leaf" porte l'étiquette "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunaire"
      Et Alice a proposé la pose "Straddle Bat", avec l'étiquette "lunaire"
      Quand un visiteur consulte la liste des étiquettes
      Alors la liste des étiquettes indique que l'étiquette "lunaire" est portée par 1 pose et 1 transition

    @api
    Scénario: Une étiquette réservée aux poses n'est comptée que sur les poses
      Soit la liste des étiquettes est la liste amorcée
      Et l'étiquette "contrepoids" dans la liste des étiquettes, qui s'applique aux poses seulement
      Et les poses publiées "Folded Leaf" et "Throne" dans le catalogue
      Et la pose "Folded Leaf" porte l'étiquette "contrepoids"
      Quand un visiteur consulte la liste des étiquettes
      Alors la liste des étiquettes indique que l'étiquette "contrepoids" est portée par 1 pose

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # ---------------------------------------------------------------------------------------------------

  Règle: Sur le site, tout le monde voit à quoi s'applique chaque étiquette

    @web
    Scénario: La page des étiquettes présente son introduction
      Quand un visiteur consulte la liste des étiquettes sur le site
      Alors le site présente « Les étiquettes décrivent les poses et les transitions. Le futur générateur de flow s'en servira. »

    @web
    Plan du Scénario: Le site présente l'étiquette « <étiquette> » comme applicable <champ>
      Soit l'étiquette "<étiquette>" dans la liste des étiquettes, qui s'applique <champ>
      Quand un visiteur consulte la liste des étiquettes sur le site
      Alors le site présente l'étiquette "<étiquette>" avec « <libellé> »

      Exemples:
        | étiquette   | champ                        | libellé                                  |
        | contrepoids | aux poses seulement          | S'applique aux poses                     |
        | pop         | aux transitions seulement    | S'applique aux transitions               |
        | lunaire     | aux poses et aux transitions | S'applique aux poses et aux transitions  |

  Règle: Sur le site, le validateur choisit et change à quoi s'applique une étiquette

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web
    Scénario: Le validateur ajoute sur le site une étiquette applicable aux poses
      Quand Bruno ajoute sur le site l'étiquette "contrepoids" avec la description « Base et flyer s'équilibrent en tirant l'un contre l'autre. », qui s'applique aux poses seulement
      Alors le site présente l'étiquette "contrepoids" avec « S'applique aux poses »

    @web
    Scénario: Le site demande de choisir à quoi s'applique une étiquette ajoutée
      Quand Bruno ajoute sur le site l'étiquette "contrepoids" avec la description « Base et flyer s'équilibrent en tirant l'un contre l'autre. », sans choisir à quoi elle s'applique
      Alors le site indique « Choisis à quoi s'applique l'étiquette. »

    @web
    Scénario: Le validateur change sur le site à quoi s'applique une étiquette
      Soit la liste des étiquettes est la liste amorcée
      Quand Bruno change sur le site le champ d'application de l'étiquette "vrille" en « Aux poses et aux transitions »
      Alors le site présente l'étiquette "vrille" avec « S'applique aux poses et aux transitions »

    @web
    Scénario: Le site liste les poses qui empêchent de changer à quoi s'applique une étiquette
      Soit la liste des étiquettes est la liste amorcée
      Et la pose publiée "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et la pose "Folded Leaf" porte l'étiquette "lunaire"
      Quand Bruno change sur le site le champ d'application de l'étiquette "lunaire" en « Aux transitions »
      Alors le site indique que l'étiquette "lunaire" ne peut pas cesser de s'appliquer aux poses car la pose « Folded Leaf » la porte, avec un lien vers la pose "Folded Leaf"

  Règle: Sur le site, le validateur voit ce qui porte chaque étiquette et ce qui en empêche le retrait

    Contexte:
      Soit Bruno est validateur, connecté sur le site
      Et la liste des étiquettes est la liste amorcée
      Et les poses publiées "Bird", "Folded Leaf" et "Throne" dans le catalogue

    @web
    Plan du Scénario: Le site présente au validateur le nombre d'éléments qui portent une étiquette, selon son champ d'application
      Soit <poses> poses publiées et <transitions> transitions publiées portent l'étiquette "<étiquette>"
      Quand Bruno consulte la liste des étiquettes sur le site
      Alors le site présente pour l'étiquette "<étiquette>" « <compteur> »

      Exemples:
        | étiquette | poses | transitions | compteur                                    |
        | lunaire   | 1     | 2           | Portée par 1 pose et 2 transitions          |
        | inversion | 0     | 0           | Portée par aucune pose ni aucune transition |
        | pop       | 0     | 2           | Portée par 2 transitions                    |

    @web
    Plan du Scénario: Le site présente au validateur le nombre de poses qui portent une étiquette réservée aux poses
      Soit l'étiquette "contrepoids" dans la liste des étiquettes, qui s'applique aux poses seulement
      Et <poses> poses publiées portent l'étiquette "contrepoids"
      Quand Bruno consulte la liste des étiquettes sur le site
      Alors le site présente pour l'étiquette "contrepoids" « <compteur> »

      Exemples:
        | poses | compteur               |
        | 1     | Portée par 1 pose      |
        | 0     | Portée par aucune pose |

    @web
    Scénario: Le site liste les poses qui empêchent le retrait d'une étiquette, avec un lien vers leur page
      Soit la pose "Folded Leaf" porte l'étiquette "lunaire"
      Quand Bruno retire sur le site l'étiquette "lunaire" en confirmant le retrait
      Alors le site indique que l'étiquette "lunaire" ne peut pas être retirée car la pose « Folded Leaf » la porte, avec un lien vers la pose "Folded Leaf"
