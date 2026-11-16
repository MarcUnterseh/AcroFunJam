# language: fr
@Integration
Fonctionnalité: Gérer la liste des étiquettes
  Afin que les transitions soient qualifiées avec un vocabulaire commun, que le futur générateur de flow utilisera
  comme critère
  En tant que validateur ou administrateur
  Je veux tenir à jour la liste fermée des étiquettes (ajouter, renommer, décrire, retirer), que tout le monde consulte

  # Story 8 « Étiquettes », volet Catalogue : la liste des étiquettes. Décisions du porteur du produit (2026-11-13) :
  # decouverte.md, « Story 8 Étiquettes ». Autres volets : contribution/etiqueter-une-transition.feature (proposition
  # et décision), catalogue/etiqueter-une-transition-publiee.feature (étiquetage direct par un validateur),
  # catalogue/consulter-les-etiquettes-des-transitions.feature (page d'une pose). Capacité « gérer les étiquettes » :
  # identite/comptes-et-roles.feature.
  #
  # Décisions principales :
  # - liste initiale amorcée une seule fois, au premier déploiement, avec les sept étiquettes de l'expert acroyoga
  #   (Q117, Q118, Q119, Q145) ; « washing machine » n'est pas une étiquette (déduite : pose de départ = pose d'arrivée) ;
  # - gérée par les validateurs et les administrateurs, sans proposition ; consultable par tous (Q116, Q133) ;
  # - nom obligatoire, sans espaces superflus, 30 caractères au plus, unique au sens de la clé de comparaison du nom
  #   de pose ; termes d'usage, sans traduction (Q128, Q141) ; ordre du catalogue sur le nom (Q130) ;
  # - description obligatoire, 200 caractères au plus, idéalement avec un exemple (Q129, Q144, Q153) ;
  # - renommage suivi partout ; charte : un nouveau sens est une nouvelle étiquette ; pas de fusion (Q131, Q140) ;
  # - retrait impossible tant qu'une transition publiée ou une proposition en attente porte l'étiquette ; le refus
  #   les liste (Q132, Q155).
  #
  # Personnages : Alice est utilisatrice, Bruno validateur, Paul administrateur.
  # Hors périmètre : proposer une étiquette (utilisateurs), hiérarchie ou exclusivité entre étiquettes (Q122), fusion
  # d'étiquettes, étiquettes des poses (Q120, Q139), filtre par étiquette, étiquette de sécurité (Q146), mobile.

  # ---------------------------------------------------------------------------------------------------
  # Liste initiale et consultation
  # ---------------------------------------------------------------------------------------------------

  # Q117, Q118, Q119, Q145 : ni « classique », ni « envol », ni « contrôlé », ni « fluide », ni « washing machine ».
  Règle: La liste des étiquettes est amorcée une seule fois, au premier déploiement, avec les étiquettes de l'expert acroyoga

    @api
    Scénario: Au premier déploiement, la liste présente les étiquettes amorcées et leurs descriptions
      Soit AcroFunJam est déployé pour la première fois
      Quand un visiteur consulte la liste des étiquettes
      Alors la liste des étiquettes présente exactement :
        | étiquette | description                                                                                                       |
        | dynamique | Le passage se fait avec de l'élan : base et flyer se lancent dans le mouvement au lieu de le dérouler lentement. |
        | icarien   | Style où la base, le plus souvent en L-basing, lance, fait tourner et rattrape le flyer surtout avec les pieds.  |
        | inversion | Le flyer passe la tête en bas pendant la transition.                                                             |
        | lunaire   | Pratique thérapeutique : le flyer, détendu et passif, se laisse porter, étirer ou retourner lentement par la base. |
        | pop       | La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé.                   |
        | vrille    | Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos.                    |
        | whip      | La base balance le flyer et l'élan le fait pivoter d'une prise à l'autre, vers l'avant ou vers l'arrière.        |

    @api
    Scénario: Un nouveau déploiement ne rétablit pas une étiquette retirée
      Soit AcroFunJam est déployé pour la première fois
      Et Bruno est validateur
      Et Bruno a retiré l'étiquette "vrille" de la liste
      Quand AcroFunJam est déployé de nouveau
      Alors la liste des étiquettes ne présente pas l'étiquette "vrille"

  # Q133 : consultable par tous, visiteurs compris (glossaire des étiquettes).
  Règle: Tout le monde consulte la liste des étiquettes, chacune avec sa description

    @api
    Scénario: Un visiteur consulte la liste des étiquettes et leurs descriptions
      Soit la liste des étiquettes contient :
        | étiquette | description                                          |
        | pop       | La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. |
        | inversion | Le flyer passe la tête en bas pendant la transition. |
      Quand un visiteur consulte la liste des étiquettes
      Alors la liste des étiquettes présente exactement :
        | étiquette | description                                          |
        | inversion | Le flyer passe la tête en bas pendant la transition. |
        | pop       | La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. |

  # Q130 : clé de comparaison (casse, accents et ponctuation ignorés), pas d'ordre choisi à la main. Garanti par l'API.
  Règle: Les étiquettes sont présentées dans l'ordre du catalogue sur leur nom

    @api
    Scénario: L'ordre des étiquettes ne tient pas compte de la casse
      Soit les étiquettes "whip", "Inversion" et "dynamique" dans la liste des étiquettes
      Quand un visiteur consulte la liste des étiquettes
      Alors les étiquettes sont présentées dans cet ordre : "dynamique", "Inversion", "whip"

  # ---------------------------------------------------------------------------------------------------
  # Qui gère la liste (Q116)
  # ---------------------------------------------------------------------------------------------------

  Règle: Seul un validateur ou un administrateur gère la liste des étiquettes

    @api
    Plan du Scénario: Un <rôle> ajoute une étiquette à la liste
      Soit Bruno est <rôle>
      Quand Bruno ajoute à la liste l'étiquette "vrille" avec la description « Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos. »
      Alors la liste des étiquettes présente l'étiquette "vrille"

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api
    Plan du Scénario: Un utilisateur ne peut pas <action>
      Soit Alice est utilisateur
      Et l'étiquette "pop" dans la liste des étiquettes
      Quand Alice <geste>
      Alors la gestion de la liste des étiquettes est refusée car seul un validateur ou un administrateur gère la liste des étiquettes

      Exemples:
        | action                                 | geste                                                                                              |
        | ajouter une étiquette                  | ajoute à la liste l'étiquette "inversion" avec la description « Le flyer passe la tête en bas pendant la transition. » |
        | renommer une étiquette                 | renomme l'étiquette "pop" en "Pop"                                                                 |
        | changer la description d'une étiquette | change la description de l'étiquette "pop" en « Le flyer décolle un instant. »                    |
        | retirer une étiquette                  | retire l'étiquette "pop" de la liste                                                               |

    @api
    Scénario: Un visiteur ne peut pas ajouter d'étiquette
      Quand un visiteur ajoute à la liste l'étiquette "vrille" avec la description « Le flyer tourne sur lui-même autour de l'axe de son corps. »
      Alors la gestion de la liste des étiquettes est refusée car il faut être connecté

    # Décision de la story 3 : un compte supprimé est traité comme une session expirée.
    @api
    Scénario: Une personne dont le compte a été supprimé ne peut pas ajouter d'étiquette
      Soit Bruno est validateur, connecté
      Et le compte de Bruno a été supprimé
      Quand Bruno ajoute à la liste l'étiquette "vrille" avec la description « Le flyer tourne sur lui-même autour de l'axe de son corps. »
      Alors la gestion de la liste des étiquettes est refusée car le compte n'existe plus et il faut se reconnecter

  # ---------------------------------------------------------------------------------------------------
  # Nom et description d'une étiquette (vérifiés avec Bruno, validateur)
  # ---------------------------------------------------------------------------------------------------

  # Q128 : mêmes règles qu'un nom de pose (conservé tel que saisi, espaces superflus retirés, clé non vide), 30
  # caractères au plus. Q141 (charte) : termes d'usage de la communauté, sans traduction (« pop », « whip »).
  Règle: Le nom d'une étiquette est obligatoire, sans espaces superflus, et compte au plus 30 caractères

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Les espaces superflus du nom d'une étiquette sont supprimés
      Quand Bruno ajoute à la liste l'étiquette "  vrille  " avec la description « Le flyer tourne sur lui-même autour de l'axe de son corps. »
      Alors la liste des étiquettes présente l'étiquette "vrille"

    @api
    Scénario: Un nom d'étiquette de la longueur maximale est accepté
      Quand Bruno ajoute à la liste une étiquette au nom de 30 caractères
      Alors la liste des étiquettes présente l'étiquette au nom de 30 caractères

    @api
    Plan du Scénario: L'ajout d'une étiquette <cas> est impossible
      Quand Bruno ajoute à la liste l'étiquette <nom> avec la description « Le flyer passe la tête en bas pendant la transition. »
      Alors l'ajout de l'étiquette est impossible car <motif>

      Exemples:
        | cas                                         | nom                     | motif                                                        |
        | sans nom                                    | ""                      | le nom de l'étiquette est obligatoire                        |
        | au nom fait seulement d'espaces             | "   "                   | le nom de l'étiquette est obligatoire                        |
        | au nom fait uniquement de ponctuation       | "---"                   | le nom de l'étiquette doit contenir une lettre ou un chiffre |
        | au nom plus long que la longueur maximale   | un nom de 31 caractères | le nom de l'étiquette est trop long                          |

  Règle: Le nom d'une étiquette est unique dans la liste, sans tenir compte de la casse, des accents ni de la ponctuation

    @api
    Plan du Scénario: Une étiquette de même nom qu'une étiquette de la liste ne peut pas être ajoutée
      Soit Bruno est validateur
      Et l'étiquette <existante> dans la liste des étiquettes
      Quand Bruno ajoute à la liste l'étiquette <ajoutée> avec la description « Le flyer passe la tête en bas pendant la transition. »
      Alors l'ajout de l'étiquette est impossible car une étiquette de ce nom existe déjà dans la liste

      Exemples:
        | existante   | ajoutée       |
        | "pop"       | "POP"         |
        | "vrille"    | "vrillé"      |
        | "inversion" | "inversion !" |

  # Q129, Q144, Q153 : obligatoire, pour que tout le monde étiquette de la même façon ; espaces superflus retirés
  # comme un message ; 200 caractères au plus. Charte : idéalement avec un exemple (non vérifié par le modèle).
  Règle: Chaque étiquette a une description courte obligatoire, de 200 caractères au plus

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Les espaces superflus de la description d'une étiquette sont supprimés
      Quand Bruno ajoute à la liste l'étiquette "inversion" avec la description «   Le flyer passe   la tête en bas pendant la transition.  »
      Alors la liste des étiquettes présente l'étiquette "inversion" avec la description « Le flyer passe la tête en bas pendant la transition. »

    @api
    Scénario: Une description d'étiquette de la longueur maximale est acceptée
      Quand Bruno ajoute à la liste l'étiquette "inversion" avec une description de 200 caractères
      Alors la liste des étiquettes présente l'étiquette "inversion"

    @api
    Plan du Scénario: Une étiquette <cas> ne peut pas être ajoutée
      Quand Bruno ajoute à la liste l'étiquette "inversion" avec <description>
      Alors l'ajout de l'étiquette est impossible car <motif>

      Exemples:
        | cas                                                   | description                       | motif                                         |
        | sans description                                      | aucune description                | la description de l'étiquette est obligatoire |
        | à la description faite seulement d'espaces            | la description «    »             | la description de l'étiquette est obligatoire |
        | à la description plus longue que la longueur maximale | une description de 201 caractères | la description de l'étiquette est trop longue |

  # ---------------------------------------------------------------------------------------------------
  # Renommer, décrire, retirer
  # ---------------------------------------------------------------------------------------------------

  # Q131, Q140 : une transition référence ses étiquettes et présente toujours leur nom actuel (catalogue, file,
  # « Mes propositions »). Charte : un renommage corrige le nom ; un nouveau sens est une nouvelle étiquette.
  # Mêmes règles de nom qu'à l'ajout (non répétées), l'étiquette elle-même mise à part pour l'unicité.
  Règle: Renommer une étiquette change son nom partout où elle est portée

    Contexte:
      Soit Bruno est validateur
      Et les poses publiées "Bird" et "Folded Leaf" dans le catalogue

    @api @wip
    Scénario: Une transition présente le nouveau nom de son étiquette
      Soit l'étiquette "lunnaire" dans la liste des étiquettes
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunnaire"
      Quand Bruno renomme l'étiquette "lunnaire" en "lunaire"
      Alors les transitions depuis la pose "Bird" sont exactement :
        | pose d'arrivée | nom | étiquettes |
        | Folded Leaf    |     | lunaire    |

    @api
    Scénario: Corriger la casse du nom d'une étiquette est permis
      Soit l'étiquette "Pop" dans la liste des étiquettes
      Quand Bruno renomme l'étiquette "Pop" en "pop"
      Alors la liste des étiquettes présente l'étiquette "pop"

    @api
    Scénario: Une étiquette ne peut pas prendre le nom d'une autre étiquette de la liste
      Soit les étiquettes "pop" et "whip" dans la liste des étiquettes
      Quand Bruno renomme l'étiquette "pop" en "Whip"
      Alors le renommage de l'étiquette est impossible car une étiquette de ce nom existe déjà dans la liste

  Règle: Un validateur ou un administrateur change la description d'une étiquette

    @api
    Scénario: La liste présente la nouvelle description de l'étiquette
      Soit Bruno est validateur
      Et l'étiquette "pop" dans la liste des étiquettes, avec la description « Le flyer décolle un instant. »
      Quand Bruno change la description de l'étiquette "pop" en « La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. »
      Alors la liste des étiquettes présente l'étiquette "pop" avec la description « La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. »

  # Q132, Q155 : le validateur ôte d'abord l'étiquette des transitions publiées (étiquetage direct) et décide des
  # propositions en attente qui la portent ; le refus les lui liste.
  Règle: Seule une étiquette portée par aucune transition publiée ni aucune proposition en attente peut être retirée

    Contexte:
      Soit Bruno est validateur
      Et les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue
      Et les étiquettes "lunaire" et "vrille" dans la liste des étiquettes

    @api
    Scénario: Une étiquette que rien ne porte est retirée de la liste
      Quand Bruno retire l'étiquette "vrille" de la liste
      Alors la liste des étiquettes présente exactement les étiquettes "lunaire"

    @api @wip
    Scénario: Le retrait d'une étiquette portée par des transitions publiées est impossible et les liste
      Soit la transition publiée sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunaire"
      Et la transition publiée "Lunar Roll" de "Folded Leaf" vers "Throne", avec l'étiquette "lunaire"
      Quand Bruno retire l'étiquette "lunaire" de la liste
      Alors le retrait de l'étiquette est impossible car elle est portée par les transitions du catalogue :
        | pose de départ | pose d'arrivée | nom        |
        | Bird           | Folded Leaf    |            |
        | Folded Leaf    | Throne         | Lunar Roll |

    @api @wip
    Scénario: Le retrait d'une étiquette portée par une proposition en attente est impossible et la liste
      Soit Alice est utilisateur
      Et Alice a proposé une transition sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunaire"
      Quand Bruno retire l'étiquette "lunaire" de la liste
      Alors le retrait de l'étiquette est impossible car elle est portée par les propositions en attente de validation :
        | pose de départ | pose d'arrivée | nom |
        | Bird           | Folded Leaf    |     |

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # Q133, Q150, Q151 : page « Étiquettes » (/etiquettes), publique en lecture (glossaire des étiquettes) ; ajouter,
  # modifier et retirer sont réservés aux validateurs et aux administrateurs. Entrées : lien « Étiquettes » du
  # catalogue (pour tous) et lien « Gérer les étiquettes » de la page « Propositions à valider » ; pas d'entrée dans
  # l'en-tête. Q156, Q157 : modification et confirmation du retrait en place, dans la liste. Q155 : « Portée par N
  # transitions » pour chaque étiquette, présenté aux validateurs et aux administrateurs.
  # ---------------------------------------------------------------------------------------------------

  Règle: Sur le site, tout le monde consulte la liste des étiquettes, et seuls les validateurs et les administrateurs la gèrent

    @web
    Scénario: Un visiteur ouvre la liste des étiquettes depuis le catalogue
      Soit l'étiquette "pop" dans la liste des étiquettes, avec la description « La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. »
      Et un visiteur consulte les poses du catalogue
      Quand le visiteur ouvre la liste des étiquettes depuis le catalogue
      Alors le site présente l'étiquette "pop" avec la description « La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. »

    @web
    Scénario: Un utilisateur voit la liste des étiquettes sans pouvoir la gérer
      Soit l'étiquette "pop" dans la liste des étiquettes
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte la liste des étiquettes sur le site
      Alors le site présente l'étiquette "pop" sans inviter Alice à ajouter, modifier ni retirer d'étiquette

    @web
    Scénario: Un validateur ouvre la gestion des étiquettes depuis les propositions à valider
      Soit Bruno est validateur, connecté sur le site
      Et Bruno consulte la file de validation sur le site
      Quand Bruno ouvre la gestion des étiquettes depuis les propositions à valider
      Alors le site présente la liste des étiquettes et invite Bruno à ajouter une étiquette

  Règle: Sur le site, le validateur ajoute, renomme, décrit et retire les étiquettes

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web
    Scénario: Le validateur ajoute une étiquette sur le site
      Quand Bruno ajoute sur le site l'étiquette "vrille" avec la description « Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos. »
      Alors le site présente l'étiquette "vrille" avec la description « Le flyer tourne sur lui-même autour de l'axe de son corps, par exemple du ventre vers le dos. »

    @web
    Scénario: Le site signale sous le nom qu'une étiquette de ce nom existe déjà
      Soit l'étiquette "pop" dans la liste des étiquettes
      Quand Bruno ajoute sur le site l'étiquette "POP" avec la description « Le flyer décolle un instant. »
      Alors le site indique pour le nom qu'une étiquette de ce nom existe déjà dans la liste

    @web
    Scénario: Le validateur renomme une étiquette sur le site
      Soit l'étiquette "lunnaire" dans la liste des étiquettes
      Quand Bruno renomme sur le site l'étiquette "lunnaire" en "lunaire"
      Alors le site présente l'étiquette "lunaire"

    @web
    Scénario: Le validateur change la description d'une étiquette sur le site
      Soit l'étiquette "pop" dans la liste des étiquettes, avec la description « Le flyer décolle un instant. »
      Quand Bruno change sur le site la description de l'étiquette "pop" en « La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. »
      Alors le site présente l'étiquette "pop" avec la description « La base propulse le flyer, qui quitte un instant tout contact avec elle avant d'être rattrapé. »

    @web
    Scénario: Le validateur retire une étiquette sur le site après l'avoir confirmé
      Soit les étiquettes "pop" et "vrille" dans la liste des étiquettes
      Quand Bruno retire sur le site l'étiquette "vrille" en confirmant le retrait
      Alors le site présente exactement les étiquettes "pop"

    @web
    Scénario: Le site présente au validateur le nombre de transitions qui portent chaque étiquette
      Soit les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue
      Et l'étiquette "lunaire" dans la liste des étiquettes
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunaire"
      Et la transition publiée "Lunar Roll" de "Folded Leaf" vers "Throne", avec l'étiquette "lunaire"
      Quand Bruno consulte la liste des étiquettes sur le site
      Alors le site indique que l'étiquette "lunaire" est portée par 2 transitions

    @web
    Scénario: Le site liste les transitions qui empêchent le retrait d'une étiquette, avec un lien vers leur pose
      Soit les poses publiées "Bird" et "Folded Leaf" dans le catalogue
      Et l'étiquette "lunaire" dans la liste des étiquettes
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf", avec l'étiquette "lunaire"
      Quand Bruno retire sur le site l'étiquette "lunaire" en confirmant le retrait
      Alors le site indique que l'étiquette "lunaire" ne peut pas être retirée car la transition « de Bird vers Folded Leaf » la porte, avec un lien vers la pose "Bird"
