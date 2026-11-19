# language: fr
@Integration
Fonctionnalité: Étiqueter une pose publiée
  Afin que les poses publiées sans étiquette, ou mal étiquetées, servent au futur générateur de flow
  En tant que validateur ou administrateur
  Je veux choisir directement les étiquettes d'une pose publiée

  # Story 9a « Étiqueter les poses », volet Catalogue : étiquetage direct. Décisions du porteur du produit
  # (2026-11-18) : decouverte.md, « Story 9a Étiqueter les poses ». Calqué sur
  # catalogue/etiqueter-une-transition-publiee.feature (story 8).
  #
  # Décisions principales :
  # - un validateur ou un administrateur choisit directement l'ensemble des étiquettes d'une pose publiée, sans
  #   proposition (capacité « gérer les étiquettes ») ; un utilisateur passe par une proposition de modification
  #   (contribution/etiqueter-une-pose.feature) (Q170) ;
  # - seules les étiquettes de la liste qui s'appliquent aux poses (Q164) ;
  # - l'étiquetage direct qui change l'ensemble des étiquettes change la pose : sa version augmente (une modification
  #   commencée avant lui devient irrecevable) ; le même ensemble, dans un autre ordre, réussit sans changer la version ; il est impossible tant qu'une modification de la pose est en attente ; entre deux validateurs, la
  #   dernière action l'emporte (Q171) ;
  # - la page d'une pose indique qu'une modification de la pose est en attente ; le site en prévient le validateur à
  #   l'ouverture de la zone « Étiquettes de la pose » : « Une modification de Folded Leaf attend déjà d'être validée.
  #   Décide d'abord de cette modification, puis étiquette la pose. », avec un lien « Propositions à valider », sans
  #   bouton « Enregistrer » ;
  # - site (Q174) : bouton « Étiqueter la pose » (nom accessible « Étiqueter la pose Folded Leaf ») juste sous l'en-tête
  #   de la page d'une pose, même quand la pose ne porte aucune étiquette ; zone de légende « Étiquettes de la pose » ;
  #   annonce « Étiquettes de la pose enregistrées. » ; bouton masqué si aucune étiquette ne s'applique aux poses (Q181).
  # « dynamique » implicite : sans objet, « pop », « whip » et « icarien » ne s'appliquant qu'aux transitions (Q169).
  #
  # Personnages : Alice est utilisatrice, Bruno validateur, Paul administrateur.
  # Hors périmètre : étiquetage groupé de plusieurs poses, historique, notification du contributeur d'origine, mobile.

  Contexte:
    Soit la liste des étiquettes est la liste amorcée
    Et les poses publiées "Throne", "Folded Leaf", "Candlestick" et "Straddle Bat" dans le catalogue

  Règle: Un validateur ou un administrateur étiquette directement une pose publiée

    @api
    Plan du Scénario: Un <rôle> étiquette une pose publiée, qui présente aussitôt ses étiquettes
      Soit Bruno est <rôle>
      Et Bruno a étiqueté la pose "Straddle Bat" avec les étiquettes "lunaire" et "inversion"
      Quand un visiteur consulte la pose "Straddle Bat" du catalogue
      Alors la page présente la pose "Straddle Bat" avec les étiquettes "inversion" et "lunaire"

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api
    Scénario: Les étiquettes choisies remplacent celles de la pose
      Soit Bruno est validateur
      Et Bruno a étiqueté la pose "Candlestick" avec les étiquettes "lunaire"
      Et Bruno a étiqueté la pose "Candlestick" avec les étiquettes "inversion"
      Quand un visiteur consulte la pose "Candlestick" du catalogue
      Alors la page présente la pose "Candlestick" avec les étiquettes "inversion"

    @api
    Scénario: Un validateur retire toutes les étiquettes d'une pose publiée
      Soit Bruno est validateur
      Et Bruno a étiqueté la pose "Throne" avec les étiquettes "lunaire"
      Et Bruno a retiré toutes les étiquettes de la pose "Throne"
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page présente la pose "Throne" sans étiquette

  Règle: Seul un validateur ou un administrateur étiquette directement une pose publiée

    @api
    Scénario: Un utilisateur ne peut pas étiqueter directement une pose publiée
      Soit Alice est utilisateur
      Quand Alice étiquette la pose "Folded Leaf" avec les étiquettes "lunaire"
      Alors l'étiquetage est refusé car seul un validateur ou un administrateur gère les étiquettes

    @api
    Scénario: Un visiteur ne peut pas étiqueter une pose publiée
      Quand un visiteur étiquette la pose "Folded Leaf" avec les étiquettes "lunaire"
      Alors l'étiquetage est refusé car il faut être connecté

  Règle: Seule une pose publiée s'étiquette, et seulement avec des étiquettes de la liste qui s'appliquent aux poses

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une étiquette absente de la liste rend l'étiquetage impossible
      Quand Bruno étiquette la pose "Folded Leaf" avec les étiquettes "classique"
      Alors l'étiquetage est impossible car l'étiquette "classique" n'est pas dans la liste des étiquettes

    @api
    Scénario: Une étiquette qui ne s'applique qu'aux transitions rend l'étiquetage impossible
      Quand Bruno étiquette la pose "Folded Leaf" avec les étiquettes "pop"
      Alors l'étiquetage est impossible car l'étiquette "pop" ne s'applique pas aux poses

    @api
    Scénario: Une pose inconnue du catalogue ne peut pas être étiquetée
      Quand Bruno étiquette une pose qui n'existe pas dans le catalogue avec les étiquettes "lunaire"
      Alors l'étiquetage est impossible car la pose est introuvable dans le catalogue

  # Q171 : la règle de la story 6 (« tant qu'une modification est en attente, la pose ne peut pas changer ») s'étend
  # à l'étiquetage direct, qui change la version de la pose.
  # Un ensemble identique (l'ordre ne compte pas) ne change pas la pose : sa version reste la même.
  Règle: L'étiquetage direct qui change les étiquettes change la pose, et respecte la modification en attente de cette pose

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une pose qui a une modification en attente ne peut pas être étiquetée directement
      Soit Alice a proposé de modifier la pose "Folded Leaf" en changeant la difficulté flyer en "débutant"
      Quand Bruno étiquette la pose "Folded Leaf" avec les étiquettes "lunaire"
      Alors l'étiquetage est impossible car une modification de cette pose est déjà en attente de validation

    @api
    Scénario: Une modification commencée avant l'étiquetage direct de la pose est irrecevable
      Soit Alice a commencé à modifier la pose "Folded Leaf"
      Et Bruno a étiqueté entre-temps la pose "Folded Leaf" avec les étiquettes "lunaire"
      Quand Alice propose la modification commencée en changeant la difficulté flyer en "débutant"
      Alors la proposition est irrecevable car la pose a changé depuis le début de la modification

    @api
    Scénario: Étiqueter une pose avec le même ensemble d'étiquettes, dans un autre ordre, ne change pas la pose
      Soit Bruno a étiqueté la pose "Straddle Bat" avec les étiquettes "lunaire" et "inversion"
      Et Alice a commencé à modifier la pose "Straddle Bat"
      Et Bruno a étiqueté entre-temps la pose "Straddle Bat" avec les étiquettes "inversion" et "lunaire"
      Quand Alice propose la modification commencée en changeant la difficulté flyer en "débutant"
      Alors la proposition de modification de la pose "Straddle Bat" par Alice est en attente de validation

    @api
    Scénario: La page d'une pose indique qu'une modification de la pose est en attente
      Soit Alice a proposé de modifier la pose "Folded Leaf" en changeant la difficulté flyer en "débutant"
      Quand Bruno consulte la pose "Folded Leaf" du catalogue
      Alors la page de la pose "Folded Leaf" indique qu'une modification de la pose est en attente de validation

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # ---------------------------------------------------------------------------------------------------

  Règle: Sur le site, seul un validateur ou un administrateur est invité à étiqueter une pose publiée

    @web @wip
    Scénario: Un validateur est invité à étiqueter une pose qui ne porte aucune étiquette
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno consulte la pose "Folded Leaf" du catalogue
      Alors la page de la pose invite Bruno à « Étiqueter la pose Folded Leaf »

    @web @wip
    Scénario: Un utilisateur n'est pas invité à étiqueter directement une pose publiée
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte la pose "Folded Leaf" du catalogue
      Alors la page de la pose n'invite pas Alice à étiqueter la pose "Folded Leaf"

    @web @wip
    Scénario: Le validateur n'est pas invité à étiqueter une pose quand aucune étiquette ne s'applique aux poses
      Soit Bruno est validateur, connecté sur le site
      Et aucune étiquette de la liste ne s'applique aux poses
      Quand Bruno consulte la pose "Folded Leaf" du catalogue
      Alors la page de la pose n'invite pas Bruno à étiqueter la pose "Folded Leaf"

  Règle: Sur le site, le validateur étiquette une pose depuis sa page

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web @wip
    Scénario: La page de la pose présente aussitôt les étiquettes choisies par le validateur
      Quand Bruno étiquette sur le site la pose "Straddle Bat" avec les étiquettes "lunaire" et "inversion"
      Alors la page présente la pose "Straddle Bat" avec les étiquettes "inversion" et "lunaire"

    @web @wip
    Scénario: Le site annonce que les étiquettes de la pose sont enregistrées
      Quand Bruno étiquette sur le site la pose "Candlestick" avec les étiquettes "inversion"
      Alors le site annonce « Étiquettes de la pose enregistrées. »

    @web @wip
    Scénario: Le site ne propose pour une pose que les étiquettes qui s'appliquent aux poses
      Quand Bruno commence à étiqueter sur le site la pose "Folded Leaf"
      Alors le site propose exactement les étiquettes "inversion" et "lunaire"

    @web @wip
    Scénario: Le site prévient le validateur qu'une modification de la pose attend d'être validée
      Soit Alice est utilisateur
      Et Alice a proposé de modifier la pose "Folded Leaf" en changeant la difficulté flyer en "débutant"
      Quand Bruno commence à étiqueter sur le site la pose "Folded Leaf"
      Alors le site indique « Une modification de Folded Leaf attend déjà d'être validée. Décide d'abord de cette modification, puis étiquette la pose. »
      Et le site propose à Bruno d'ouvrir les propositions à valider, sans lui permettre d'enregistrer les étiquettes de la pose
