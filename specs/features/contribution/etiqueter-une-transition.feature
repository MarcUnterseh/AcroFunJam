# language: fr
@Integration
Fonctionnalité: Étiqueter une transition proposée
  Afin que chaque transition entre dans le catalogue avec les étiquettes qui la caractérisent
  En tant que contributeur connecté
  Je veux choisir les étiquettes de la transition que je propose, qu'un validateur retient, ajuste ou refuse avec elle

  # Story 8 « Étiquettes », volet Contribution. Décisions du porteur du produit (2026-11-13) : decouverte.md, « Story 8
  # Étiquettes ». Prolonge contribution/proposer-une-transition.feature (story 7) : seules les étiquettes s'ajoutent ;
  # les autres règles de la proposition, de la décision et de « Mes propositions » ne sont pas répétées.
  #
  # Décisions principales :
  # - les transitions seulement, pas les poses (Q120, Q139) ;
  # - étiquettes facultatives, de 0 à n, chacune une seule fois, sans exclusivité ni maximum (Q121, Q122, Q137, Q138) ;
  #   seules les étiquettes de la liste ;
  # - choisir « pop », « whip » ou « icarien » ajoute « dynamique », qui ne peut pas être retirée tant que l'une d'elles
  #   est portée (Q136) ; le site l'explique ;
  # - le validateur ajuste les étiquettes avant d'accepter ; c'est un ajustement si l'ensemble retenu diffère de
  #   l'ensemble proposé, l'ordre ne compte pas (Q124) ;
  # - file de validation et « Mes propositions » : étiquettes sous leur nom actuel, dans l'ordre du catalogue
  #   (Q130, Q131) ; « Étiquettes : aucune » dans la file, récapitulatif « aucune → dynamique, pop » (Q160, Q163).
  # Formulaire (Q152, Q162) : cases à cocher en pastilles entre les difficultés et la description ; descriptions dans
  # un repli « Ce que veulent dire les étiquettes ».
  # Changer les étiquettes d'une transition publiée : étiquetage direct par un validateur
  # (catalogue/etiqueter-une-transition-publiee.feature) ; par un utilisateur, story « Modifier une transition ».
  #
  # Personnages : Alice et Chloé sont utilisatrices, Bruno est validateur, Paul administrateur.
  # Exemples (expert acroyoga) : « Pop to Bird », de Throne vers Bird, intermédiaire / intermédiaire, en pop ;
  # « Forbidden », de Throne vers Bird (whip en arrière), avancé / avancé ; sans nom de Bird vers Folded Leaf, lunaire.
  # Hors périmètre : étiquettes des poses, filtre par étiquette, générateur de flow, écran mobile.

  Contexte:
    Soit les poses publiées "Throne", "Bird", "Star" et "Folded Leaf" dans le catalogue
    Et la liste des étiquettes est la liste amorcée

  # ---------------------------------------------------------------------------------------------------
  # Proposer une transition étiquetée
  # ---------------------------------------------------------------------------------------------------

  Règle: En proposant une transition, le contributeur choisit facultativement des étiquettes de la liste

    Contexte:
      Soit Alice est utilisateur

    @api
    Scénario: Une transition proposée porte les étiquettes choisies
      Quand Alice propose une transition sans nom de "Bird" vers "Folded Leaf", avec les étiquettes "lunaire" et "inversion"
      Alors la proposition de la transition sans nom de "Bird" vers "Folded Leaf" par Alice porte exactement les étiquettes "inversion" et "lunaire"

    @api
    Scénario: Une transition proposée sans étiquette est recevable
      Quand Alice propose une transition sans nom de "Throne" vers "Bird"
      Alors la proposition de la transition sans nom de "Throne" vers "Bird" par Alice ne porte aucune étiquette

    @api
    Scénario: Une étiquette choisie deux fois n'est portée qu'une fois
      Quand Alice propose une transition sans nom de "Bird" vers "Folded Leaf", avec les étiquettes "lunaire" et "lunaire"
      Alors la proposition de la transition sans nom de "Bird" vers "Folded Leaf" par Alice porte exactement les étiquettes "lunaire"

  # Q136 : règle du produit, appliquée à la proposition, à l'ajustement et à l'étiquetage direct.
  Règle: Choisir « pop », « whip » ou « icarien » ajoute l'étiquette « dynamique »

    Contexte:
      Soit Alice est utilisateur

    @api
    Plan du Scénario: Une transition proposée en <étiquette> porte aussi l'étiquette « dynamique »
      Quand Alice propose la transition <nom> de "Throne" vers "Bird", avec l'étiquette "<étiquette>"
      Alors la proposition de la transition <nom> de "Throne" vers "Bird" par Alice porte exactement les étiquettes "dynamique" et "<étiquette>"

      Exemples:
        | étiquette | nom            |
        | pop       | "Pop to Bird"  |
        | whip      | "Forbidden"    |
        | icarien   | "Icarian Pop"  |

  Règle: Seules les étiquettes de la liste peuvent être choisies

    @api
    Scénario: Une transition proposée avec une étiquette absente de la liste est irrecevable
      Soit Alice est utilisateur
      Quand Alice propose une transition sans nom de "Throne" vers "Bird", avec l'étiquette "classique"
      Alors la proposition est irrecevable car l'étiquette "classique" n'est pas dans la liste des étiquettes

  Règle: Une transition proposée par un validateur ou un administrateur est publiée directement avec ses étiquettes

    @api
    Plan du Scénario: Une transition proposée par un <rôle> est publiée avec ses étiquettes
      Soit Bruno est <rôle>
      Et Bruno a proposé la transition "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec l'étiquette "pop"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | étiquettes     |
        | Bird           | Pop to Bird | dynamique, pop |

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  # ---------------------------------------------------------------------------------------------------
  # File de validation et décision
  # ---------------------------------------------------------------------------------------------------

  Règle: La file de validation présente les étiquettes de chaque transition en attente, sous leur nom actuel

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: La file de validation présente les étiquettes proposées
      Soit Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird", avec l'étiquette "pop"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "dynamique" et "pop"

    @api
    Scénario: La file de validation présente une étiquette renommée sous son nom actuel
      Soit l'étiquette "lunnaire" dans la liste des étiquettes
      Et Alice a proposé une transition sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunnaire"
      Et Bruno a renommé l'étiquette "lunnaire" en "Lunaire II"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la transition sans nom de "Bird" vers "Folded Leaf" avec les étiquettes "Lunaire II"

  Règle: Accepter une transition la publie avec les étiquettes proposées

    @api
    Scénario: Une transition acceptée apparaît dans le catalogue avec ses étiquettes
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la transition "Forbidden" de "Throne" vers "Bird", avec les étiquettes "whip" et "inversion"
      Et Bruno a accepté la proposition de la transition "Forbidden" de "Throne" vers "Bird" par Alice
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom       | étiquettes                 |
        | Bird           | Forbidden | dynamique, inversion, whip |

  # Q124 : comme le nom, les difficultés et la description (story 7). Q136 : « dynamique » revient avec pop, whip ou
  # icarien.
  Règle: Le validateur ajuste les étiquettes avant d'accepter ; c'est un ajustement si l'ensemble retenu diffère

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird", avec les étiquettes "pop" et "inversion"

    @api
    Scénario: Le validateur retire une étiquette avant d'accepter
      Soit Bruno a accepté la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "pop"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors les transitions depuis la pose "Throne" sont exactement :
        | pose d'arrivée | nom         | étiquettes     |
        | Bird           | Pop to Bird | dynamique, pop |

    @api
    Scénario: La transition acceptée avec d'autres étiquettes garde les étiquettes proposées et les étiquettes retenues
      Quand Bruno accepte la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "pop" et "vrille"
      Alors la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice est acceptée avec ajustements par Bruno
      Et la proposition garde les étiquettes proposées "dynamique, inversion, pop" et les étiquettes retenues "dynamique, pop, vrille"

    @api
    Scénario: Retenir les mêmes étiquettes dans un autre ordre n'est pas un ajustement
      Quand Bruno accepte la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "inversion", "pop" et "dynamique"
      Alors la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice est acceptée sans ajustement par Bruno

    @api
    Scénario: Retirer « dynamique » en gardant « pop » ne retire pas « dynamique »
      Quand Bruno accepte la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "pop" et "inversion"
      Alors la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice est acceptée sans ajustement par Bruno

    @api
    Scénario: Une étiquette retenue absente de la liste rend l'acceptation impossible
      Quand Bruno accepte la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "classique"
      Alors l'acceptation est impossible car l'étiquette "classique" n'est pas dans la liste des étiquettes

  Règle: Le validateur peut étiqueter une transition proposée sans étiquette avant de l'accepter

    @api
    Scénario: Ajouter des étiquettes à une transition proposée sans étiquette est un ajustement
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird"
      Quand Bruno accepte la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "pop"
      Alors la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice est acceptée avec ajustements par Bruno
      Et la proposition garde les étiquettes proposées "aucune" et les étiquettes retenues "dynamique, pop"

  # ---------------------------------------------------------------------------------------------------
  # Mes propositions
  # ---------------------------------------------------------------------------------------------------

  # Mêmes règles que la story 7 : transition retenue si elle est acceptée, transition proposée sinon. Un étiquetage
  # direct ultérieur par un validateur ne change pas la proposition, et le contributeur n'en est pas prévenu (Q143).
  Règle: Le contributeur retrouve les étiquettes de ses transitions dans « Mes propositions »

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une transition en attente présente ses étiquettes
      Soit Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird", avec l'étiquette "pop"
      Quand Alice consulte ses propositions
      Alors ses propositions présentent la transition "Pop to Bird" de "Throne" vers "Bird" avec les étiquettes "dynamique" et "pop"

    @api
    Scénario: Une transition acceptée avec d'autres étiquettes présente l'ajustement des étiquettes
      Soit Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird", avec les étiquettes "pop" et "inversion"
      Et Bruno a accepté la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "pop"
      Quand Alice consulte ses propositions
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" présente l'ajustement des étiquettes « dynamique, inversion, pop » → « dynamique, pop »

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # ---------------------------------------------------------------------------------------------------

  Règle: Sur le site, le contributeur choisit les étiquettes parmi celles de la liste, avec leur description

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: Le formulaire de transition propose les étiquettes de la liste et leur description
      Quand Alice commence à proposer sur le site une transition depuis la pose "Throne"
      Alors le formulaire de transition propose exactement les étiquettes "dynamique", "icarien", "inversion", "lunaire", "pop", "vrille" et "whip"
      Et le formulaire de transition permet de lire ce que veut dire chaque étiquette

    @web
    Scénario: Le formulaire explique que « pop » ajoute « dynamique »
      Soit Alice a commencé à proposer sur le site une transition depuis la pose "Throne"
      Quand Alice choisit l'étiquette "pop"
      Alors le formulaire de transition présente aussi l'étiquette "dynamique" choisie, et explique que « pop », « whip » et « icarien » l'ajoutent

    @web
    Scénario: Un utilisateur propose sur le site une transition étiquetée
      Quand Alice propose sur le site la transition "Pop to Bird" de "Throne" vers "Bird", avec l'étiquette "pop"
      Alors le site confirme à Alice que sa transition « Pop to Bird » de Throne vers Bird est envoyée et attend une validation

    @web
    Scénario: Le site signale une étiquette retirée de la liste pendant la saisie et conserve la transition saisie
      Soit Bruno est validateur
      Et Alice a commencé à proposer sur le site une transition depuis la pose "Throne"
      Et Bruno a retiré l'étiquette "vrille" de la liste
      Quand Alice propose sur le site la transition "Pop to Bird" de "Throne" vers "Bird", avec les étiquettes "pop" et "vrille"
      Alors le site indique que l'étiquette « vrille » ne fait plus partie de la liste des étiquettes
      Et la transition saisie par Alice est conservée, sans l'étiquette « vrille »

  Règle: Sur le site, le validateur voit et ajuste les étiquettes d'une transition proposée

    Contexte:
      Soit Alice est utilisateur avec l'adresse "alice@example.org"
      Et Bruno est validateur, connecté sur le site

    @web
    Scénario: Le validateur voit sur le site les étiquettes d'une transition proposée
      Soit Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird", avec l'étiquette "pop"
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la proposition « Transition Pop to Bird de Throne vers Bird » avec les étiquettes « dynamique » et « pop »

    @web
    Scénario: La file de validation indique qu'une transition proposée ne porte aucune étiquette
      Soit Alice a proposé une transition sans nom de "Throne" vers "Bird"
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la proposition « Transition de Throne vers Bird » avec « Étiquettes : aucune »

    @web
    Scénario: Le récapitulatif du validateur présente l'ajustement des étiquettes
      Soit Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird"
      Quand Bruno ajuste sur le site la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "pop"
      Alors le récapitulatif des ajustements présente les étiquettes « aucune » → « dynamique, pop »

  Règle: Sur le site, le contributeur voit les étiquettes de ses transitions dans « Mes propositions »

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Scénario: « Mes propositions » présente les étiquettes d'une transition en attente
      Soit Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird", avec l'étiquette "pop"
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la proposition « Transition Pop to Bird de Throne vers Bird » avec les étiquettes « dynamique » et « pop »

    @web
    Scénario: « Mes propositions » présente l'ajustement des étiquettes
      Soit Bruno est validateur
      Et Alice a proposé la transition "Pop to Bird" de "Throne" vers "Bird", avec les étiquettes "pop" et "inversion"
      Et Bruno a accepté la proposition de la transition "Pop to Bird" de "Throne" vers "Bird" par Alice en corrigeant les étiquettes en "pop"
      Quand Alice consulte ses propositions sur le site
      Alors le site présente pour la proposition « Transition Pop to Bird de Throne vers Bird » l'ajustement des étiquettes « dynamique, inversion, pop » → « dynamique, pop »
