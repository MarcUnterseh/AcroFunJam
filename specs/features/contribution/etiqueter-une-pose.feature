# language: fr
@Integration
Fonctionnalité: Étiqueter une pose proposée ou modifiée
  Afin que chaque pose entre dans le catalogue, ou y soit corrigée, avec les étiquettes qui la caractérisent
  En tant que contributeur connecté
  Je veux choisir les étiquettes de la pose que je propose ou que je modifie, qu'un validateur retient, ajuste ou refuse

  # Story 9a « Étiqueter les poses » (prérequis de la story 9 « Générer un flow »), volet Contribution. Décisions du
  # porteur du produit (2026-11-18) : decouverte.md, « Story 9a Étiqueter les poses ». Calqué sur
  # contribution/etiqueter-une-transition.feature (story 8). Prolonge contribution/proposer-une-pose.feature,
  # contribution/valider-une-proposition.feature, contribution/suivre-mes-propositions.feature et
  # contribution/proposer-une-modification.feature (story 6), dont les règles ne sont pas répétées.
  #
  # Décisions principales :
  # - seules les étiquettes de la liste qui s'appliquent aux poses (« inversion » et « lunaire » dans la liste
  #   amorcée) (Q164, Q165) ;
  # - comme pour une transition : de 0 à n étiquettes, chacune une seule fois, sans exclusivité ni maximum ; le
  #   validateur les ajuste avant d'accepter, et c'est un ajustement si l'ensemble retenu diffère de l'ensemble proposé
  #   (l'ordre ne compte pas) ; file de validation et « Mes propositions » : nom actuel, ordre du catalogue,
  #   « Étiquettes : aucune », « aucune → lunaire » ;
  # - les étiquettes sont un champ de la modification d'une pose (story 6) : changement « avant → proposé », ajustable
  #   par le validateur ; une modification qui ne change que l'ordre des étiquettes ne change rien (Q172) ;
  # - formulaire de pose (Q181) : groupe « Étiquettes » après les indicateurs de flow, aide « Choisis celles qui
  #   décrivent la pose. », introduction du formulaire « Les étiquettes sont facultatives ; les autres champs sont
  #   obligatoires. » ; formulaire de modification : légende « Étiquettes », rappel « Actuellement : … », marque
  #   « Modifiée » ; groupe masqué si aucune étiquette ne s'applique aux poses ; une étiquette qui cesse de s'appliquer
  #   aux poses pendant la saisie est signalée (« L'étiquette « vrille » ne s'applique plus aux poses. Vérifie tes
  #   étiquettes, puis envoie de nouveau ta pose. ») et la saisie conservée.
  # « dynamique » implicite : sans objet, « pop », « whip » et « icarien » ne s'appliquant qu'aux transitions (Q169).
  #
  # Personnages : Alice et Chloé sont utilisatrices, Bruno est validateur, Paul administrateur.
  # Exemples (expert acroyoga) : Folded Leaf et Straddle Bat (lunaire, inversion), Candlestick (inversion), Throne (aucune).
  # Hors périmètre : filtre par étiquette (Q179), générateur de flow, écran mobile (Q180).

  Contexte:
    Soit la liste des étiquettes est la liste amorcée

  # ---------------------------------------------------------------------------------------------------
  # Proposer une pose étiquetée
  # ---------------------------------------------------------------------------------------------------

  Règle: En proposant une pose, le contributeur choisit facultativement des étiquettes de la liste qui s'appliquent aux poses

    Contexte:
      Soit Alice est utilisateur

    @api
    Scénario: Une pose proposée porte les étiquettes choisies
      Quand Alice propose la pose "Folded Leaf", avec les étiquettes "lunaire" et "inversion"
      Alors la proposition de la pose "Folded Leaf" par Alice porte exactement les étiquettes "inversion" et "lunaire"

    @api
    Scénario: Une pose proposée sans étiquette est recevable
      Quand Alice propose la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors la proposition de la pose "Throne" par Alice ne porte aucune étiquette

    @api
    Scénario: Une étiquette choisie deux fois n'est portée qu'une fois
      Quand Alice propose la pose "Folded Leaf", avec les étiquettes "lunaire" et "lunaire"
      Alors la proposition de la pose "Folded Leaf" par Alice porte exactement les étiquettes "lunaire"

    @api
    Scénario: Une pose proposée avec une étiquette absente de la liste est irrecevable
      Quand Alice propose la pose "Throne", avec l'étiquette "classique"
      Alors la proposition est irrecevable car l'étiquette "classique" n'est pas dans la liste des étiquettes

    @api
    Plan du Scénario: Une pose proposée avec l'étiquette « <étiquette> », qui ne s'applique qu'aux transitions, est irrecevable
      Quand Alice propose la pose "Throne", avec l'étiquette "<étiquette>"
      Alors la proposition est irrecevable car l'étiquette "<étiquette>" ne s'applique pas aux poses

      Exemples:
        | étiquette |
        | pop       |
        | dynamique |
        | vrille    |

  Règle: Une pose proposée par un validateur ou un administrateur est publiée directement avec ses étiquettes

    @api
    Plan du Scénario: Une pose proposée par un <rôle> est publiée avec ses étiquettes
      Soit Bruno est <rôle>
      Et Bruno a proposé la pose "Candlestick", avec l'étiquette "inversion"
      Quand un visiteur consulte la pose "Candlestick" du catalogue
      Alors la page présente la pose "Candlestick" avec les étiquettes "inversion"

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  # ---------------------------------------------------------------------------------------------------
  # File de validation et décision sur une proposition de pose
  # ---------------------------------------------------------------------------------------------------

  Règle: La file de validation présente les étiquettes de chaque pose proposée, sous leur nom actuel

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: La file de validation présente les étiquettes proposées
      Soit Alice a proposé la pose "Folded Leaf", avec les étiquettes "lunaire" et "inversion"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Folded Leaf" par Alice avec les étiquettes "inversion" et "lunaire"

    @api
    Scénario: La file de validation présente une étiquette renommée sous son nom actuel
      Soit Alice a proposé la pose "Folded Leaf", avec l'étiquette "lunaire"
      Et Bruno a renommé l'étiquette "lunaire" en "Lunaire"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la proposition de la pose "Folded Leaf" par Alice avec les étiquettes "Lunaire"

  Règle: Accepter une pose la publie avec les étiquettes proposées

    @api
    Scénario: Une pose acceptée apparaît dans le catalogue avec ses étiquettes
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Folded Leaf", avec les étiquettes "lunaire" et "inversion"
      Et Bruno a accepté la proposition de la pose "Folded Leaf" par Alice
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "inversion" et "lunaire"

  Règle: Le validateur ajuste les étiquettes d'une pose proposée avant d'accepter ; c'est un ajustement si l'ensemble retenu diffère

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Folded Leaf", avec les étiquettes "lunaire" et "inversion"

    @api
    Scénario: Le validateur retire une étiquette avant d'accepter
      Soit Bruno a accepté la proposition de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire"
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "lunaire"

    @api
    Scénario: La pose acceptée avec d'autres étiquettes garde les étiquettes proposées et les étiquettes retenues
      Quand Bruno accepte la proposition de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire"
      Alors la proposition de la pose "Folded Leaf" par Alice est acceptée avec ajustements par Bruno
      Et la proposition garde les étiquettes proposées "inversion, lunaire" et les étiquettes retenues "lunaire"

    @api
    Scénario: Retenir les mêmes étiquettes dans un autre ordre n'est pas un ajustement
      Quand Bruno accepte la proposition de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "inversion" et "lunaire"
      Alors la proposition de la pose "Folded Leaf" par Alice est acceptée sans ajustement par Bruno

    @api
    Scénario: Une étiquette retenue qui ne s'applique pas aux poses rend l'acceptation impossible
      Quand Bruno accepte la proposition de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire" et "vrille"
      Alors l'acceptation est impossible car l'étiquette "vrille" ne s'applique pas aux poses

  Règle: Le validateur peut étiqueter une pose proposée sans étiquette avant de l'accepter

    @api
    Scénario: Ajouter des étiquettes à une pose proposée sans étiquette est un ajustement
      Soit Alice est utilisateur
      Et Bruno est validateur
      Et Alice a proposé la pose "Candlestick" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno accepte la proposition de la pose "Candlestick" par Alice en corrigeant les étiquettes en "inversion"
      Alors la proposition de la pose "Candlestick" par Alice est acceptée avec ajustements par Bruno
      Et la proposition garde les étiquettes proposées "aucune" et les étiquettes retenues "inversion"

  Règle: Le contributeur retrouve les étiquettes de ses poses proposées dans « Mes propositions »

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une pose en attente présente ses étiquettes
      Soit Alice a proposé la pose "Folded Leaf", avec l'étiquette "lunaire"
      Quand Alice consulte ses propositions
      Alors ses propositions présentent la pose "Folded Leaf" avec les étiquettes "lunaire"

    @api
    Scénario: Une pose acceptée avec d'autres étiquettes présente l'ajustement des étiquettes
      Soit Alice a proposé la pose "Folded Leaf", avec les étiquettes "lunaire" et "inversion"
      Et Bruno a accepté la proposition de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire"
      Quand Alice consulte ses propositions
      Alors la pose "Folded Leaf" présente l'ajustement des étiquettes « inversion, lunaire » → « lunaire »

  # ---------------------------------------------------------------------------------------------------
  # Modifier les étiquettes d'une pose publiée (story 6, Q172)
  # ---------------------------------------------------------------------------------------------------

  Règle: Une modification d'une pose peut changer ses étiquettes

    Contexte:
      Soit la pose publiée "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une modification qui ne change que les étiquettes est en attente de validation
      Quand Alice propose de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire"
      Alors la proposition de modification de la pose "Folded Leaf" par Alice est en attente de validation

    @api
    Scénario: Une modification acceptée donne à la pose les étiquettes proposées
      Soit Alice a proposé de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire" et "inversion"
      Et Bruno a accepté la proposition de modification de la pose "Folded Leaf" par Alice
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "inversion" et "lunaire"

    @api
    Scénario: Une modification acceptée retire les étiquettes de la pose
      Soit la pose "Folded Leaf" porte l'étiquette "inversion"
      Et Alice a proposé de modifier la pose "Folded Leaf" en retirant toutes ses étiquettes
      Et Bruno a accepté la proposition de modification de la pose "Folded Leaf" par Alice
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" sans étiquette

    @api
    Plan du Scénario: Une modification proposée par un <rôle> change aussitôt les étiquettes de la pose
      Soit Paul est <rôle>
      Et Paul a proposé de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire"
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "lunaire"

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  Règle: Une modification des étiquettes respecte les règles d'étiquetage d'une pose

    Contexte:
      Soit la pose publiée "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et la pose "Folded Leaf" porte les étiquettes "lunaire" et "inversion"
      Et Alice est utilisateur

    @api
    Scénario: Une modification qui reprend les mêmes étiquettes dans un autre ordre ne change rien à la pose
      Quand Alice propose de modifier la pose "Folded Leaf" en changeant les étiquettes en "inversion" et "lunaire"
      Alors la proposition est irrecevable car la modification ne change rien à la pose

    @api
    Scénario: Une modification avec une étiquette qui ne s'applique pas aux poses est irrecevable
      Quand Alice propose de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire" et "pop"
      Alors la proposition est irrecevable car l'étiquette "pop" ne s'applique pas aux poses

    @api
    Scénario: Une modification avec une étiquette absente de la liste est irrecevable
      Quand Alice propose de modifier la pose "Folded Leaf" en changeant les étiquettes en "classique"
      Alors la proposition est irrecevable car l'étiquette "classique" n'est pas dans la liste des étiquettes

  Règle: Le validateur voit et ajuste les étiquettes d'une modification

    Contexte:
      Soit la pose publiée "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: La file de validation présente les étiquettes d'avant et les étiquettes proposées
      Soit Alice a proposé de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire"
      Quand Bruno consulte la file de validation
      Alors la file de validation présente la modification de la pose "Folded Leaf" avec les étiquettes « aucune » → « lunaire »

    @api
    Scénario: Le validateur ajuste les étiquettes d'une modification avant de l'accepter
      Soit Alice a proposé de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire"
      Et Bruno a accepté la proposition de modification de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire" et "inversion"
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "inversion" et "lunaire"

    @api
    Scénario: Le validateur ajoute des étiquettes à une modification qui ne les changeait pas
      Soit Alice a proposé de modifier la pose "Folded Leaf" en changeant la difficulté flyer en "débutant"
      Et Bruno a accepté la proposition de modification de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire"
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "lunaire"

    @api
    Scénario: Une modification acceptée avec d'autres étiquettes présente ce qui change dans la pose et les ajustements apportés
      Soit Alice a proposé de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire" et "inversion"
      Et Bruno a accepté la proposition de modification de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire"
      Quand Alice consulte ses propositions
      Alors la modification de la pose "Folded Leaf" présente, dans ce qui change dans la pose, les étiquettes « aucune » → « lunaire »
      Et la modification de la pose "Folded Leaf" présente, dans les ajustements apportés, les étiquettes « inversion, lunaire » → « lunaire »

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # ---------------------------------------------------------------------------------------------------

  Règle: Sur le site, le contributeur choisit les étiquettes d'une pose parmi celles qui s'appliquent aux poses

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web @wip
    Scénario: Le formulaire de proposition d'une pose ne propose que les étiquettes qui s'appliquent aux poses, avec leur description
      Quand Alice commence à proposer une pose sur le site
      Alors le formulaire de proposition propose exactement les étiquettes "inversion" et "lunaire"
      Et le formulaire de proposition permet de lire ce que veut dire chaque étiquette

    @web @wip
    Scénario: Le formulaire de proposition d'une pose indique que les étiquettes sont facultatives
      Quand Alice commence à proposer une pose sur le site
      Alors le formulaire de proposition présente « Les étiquettes sont facultatives ; les autres champs sont obligatoires. »
      Et le formulaire de proposition présente pour les étiquettes l'aide « Choisis celles qui décrivent la pose. »

    @web @wip
    Scénario: Le formulaire de proposition d'une pose ne présente pas d'étiquettes quand aucune ne s'applique aux poses
      Soit aucune étiquette de la liste ne s'applique aux poses
      Quand Alice commence à proposer une pose sur le site
      Alors le formulaire de proposition ne présente aucune étiquette

    @web @wip
    Scénario: Un utilisateur propose sur le site une pose étiquetée
      Quand Alice propose sur le site la pose "Folded Leaf", avec l'étiquette "lunaire"
      Alors le site indique à Alice que sa proposition de la pose "Folded Leaf" est en attente de validation

    @web @wip
    Scénario: Le site signale une étiquette qui ne s'applique plus aux poses pendant la saisie et conserve la pose saisie
      Soit Bruno est validateur
      Et l'étiquette "vrille" s'applique aux poses et aux transitions
      Et Alice a commencé à proposer une pose sur le site
      Et Bruno a changé le champ d'application de l'étiquette "vrille" en « transitions seulement »
      Quand Alice propose sur le site la pose "Straddle Bat", avec les étiquettes "lunaire" et "vrille"
      Alors le site indique « L'étiquette « vrille » ne s'applique plus aux poses. Vérifie tes étiquettes, puis envoie de nouveau ta pose. »
      Et la pose "Straddle Bat" saisie par Alice est conservée, sans l'étiquette « vrille »

  Règle: Sur le site, le contributeur modifie les étiquettes d'une pose publiée

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et la pose publiée "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "découverte"

    @web @wip
    Scénario: Le formulaire de modification présente les étiquettes actuelles de la pose
      Soit la pose "Folded Leaf" porte l'étiquette "lunaire"
      Quand Alice commence à proposer sur le site une modification de la pose "Folded Leaf"
      Alors le formulaire de modification présente la pose "Folded Leaf" avec l'étiquette « lunaire » choisie

    @web @wip
    Scénario: Le formulaire de modification rappelle les étiquettes actuelles et marque les étiquettes modifiées
      Soit la pose "Folded Leaf" porte l'étiquette "lunaire"
      Et Alice a commencé à proposer sur le site une modification de la pose "Folded Leaf"
      Quand Alice choisit l'étiquette "inversion"
      Alors le formulaire de modification présente pour les étiquettes le rappel « Actuellement : lunaire » et la marque « Modifiée »

    @web @wip
    Scénario: Un utilisateur propose sur le site une modification des étiquettes d'une pose
      Quand Alice propose sur le site de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire"
      Alors le site indique « Merci, ta modification est envoyée. »

  Règle: Sur le site, le validateur voit et ajuste les étiquettes d'une pose proposée ou modifiée

    Contexte:
      Soit Alice est utilisateur avec l'adresse "alice@example.org"
      Et Bruno est validateur, connecté sur le site

    @web @wip
    Scénario: Le validateur voit sur le site les étiquettes d'une pose proposée
      Soit Alice a proposé la pose "Folded Leaf", avec l'étiquette "lunaire"
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la proposition de la pose "Folded Leaf" avec les étiquettes « lunaire »

    @web @wip
    Scénario: La file de validation indique qu'une pose proposée ne porte aucune étiquette
      Soit Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la proposition de la pose "Throne" avec « Étiquettes : aucune »

    @web @wip
    Scénario: Le récapitulatif du validateur présente l'ajustement des étiquettes d'une pose proposée
      Soit Alice a proposé la pose "Candlestick" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Bruno ajuste sur le site la proposition de la pose "Candlestick" par Alice en corrigeant les étiquettes en "inversion"
      Alors le récapitulatif des ajustements présente les étiquettes « aucune » → « inversion »

    @web @wip
    Scénario: Le validateur voit sur le site le changement d'étiquettes d'une modification
      Soit la pose publiée "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice a proposé de modifier la pose "Folded Leaf" en changeant les étiquettes en "lunaire"
      Quand Bruno consulte la file de validation sur le site
      Alors le site présente la modification de la pose "Folded Leaf" par "alice@example.org", étiquettes « aucune » → « lunaire »

  Règle: Sur le site, le contributeur voit les étiquettes de ses poses dans « Mes propositions »

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web @wip
    Scénario: « Mes propositions » présente les étiquettes d'une pose en attente
      Soit Alice a proposé la pose "Folded Leaf", avec l'étiquette "lunaire"
      Quand Alice consulte ses propositions sur le site
      Alors le site présente la proposition de la pose "Folded Leaf" avec les étiquettes « lunaire »

    @web @wip
    Scénario: « Mes propositions » présente l'ajustement des étiquettes d'une pose
      Soit Bruno est validateur
      Et Alice a proposé la pose "Folded Leaf", avec les étiquettes "lunaire" et "inversion"
      Et Bruno a accepté la proposition de la pose "Folded Leaf" par Alice en corrigeant les étiquettes en "lunaire"
      Quand Alice consulte ses propositions sur le site
      Alors le site présente pour la proposition de la pose "Folded Leaf" l'ajustement des étiquettes « inversion, lunaire » → « lunaire »
