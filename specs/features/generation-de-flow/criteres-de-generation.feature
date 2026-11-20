# language: fr
@Integration
Fonctionnalité: Critères de génération d'un flow
  Afin d'obtenir un flow à la mesure de mon duo et dans le style que je veux travailler
  En tant que visiteur ou utilisateur
  Je veux plafonner la difficulté base et la difficulté flyer, demander des étiquettes et en exclure d'autres

  # Story 9 « Générer un flow », contexte Génération de flow. Carte d'example mapping du 2026-11-19 : decouverte.md,
  # « Story 9 Générer un flow » (règles K, questions Q182 à Q211, revue ux-expert UX-1 à UX-8), validée le 2026-11-19
  # par le porteur du produit. Flow exécutable, longueur, répétitions, hasard, présentation :
  # generation-de-flow/generer-un-flow.feature, dont les conventions de lecture valent ici.
  #
  # Décisions du porteur du produit (2026-11-19) :
  # - difficulté : deux plafonds obligatoires, un pour la base et un pour le flyer ; « au plus » inclut le niveau
  #   choisi ; ils s'appliquent à chaque pose (départ et arrivée comprises) et à chaque transition du flow (Q186) ;
  # - étiquettes demandées, facultatives (Q187, Q188, Q203, Q204) : OU entre les étiquettes demandées ; une étape (une
  #   transition et sa pose d'arrivée) est conforme si sa transition OU sa pose d'arrivée porte l'une d'elles ; la pose
  #   de départ n'est pas contrainte. La distinction style / technique (« au moins une étape en pop ») est reportée à
  #   une story ultérieure ;
  # - étiquettes exclues, facultatives : aucune pose ni aucune transition du flow n'en porte une ; exclure « dynamique »
  #   écarte aussi ce qui porte « pop », « whip » ou « icarien », qui l'impliquent (Q189) ;
  # - une étiquette demandée ou exclue doit être dans la liste des étiquettes ; toute étiquette de la liste peut être
  #   demandée ou exclue, puisqu'elle s'applique aux poses ou aux transitions (Q190) ;
  # - une étiquette à la fois demandée et exclue : l'API répond « critères trop restrictifs » ; le site l'empêche, la
  #   case de l'autre groupe étant désactivée et marquée « (demandée) » ou « (exclue) » (Q190) ;
  # - site : valeurs présélectionnées 3 transitions, « débutant » / « débutant » (Q185) ; introduction « Choisis la
  #   longueur et la difficulté : AcroFunJam tire au hasard un flow parmi les poses et les transitions du catalogue. » ;
  #   « Nombre de transitions » (aide « De 1 à 10. Un flow de 3 transitions enchaîne 4 poses. ») ; « Difficulté base,
  #   au plus » et « Difficulté flyer, au plus » (aide « Aucune pose ni transition du flow ne dépassera ce niveau. ») ;
  #   repli « Étiquettes (facultatives) », fermé par défaut, avec le compte des étiquettes choisies dans son résumé
  #   (UX-3, UX-4) ; groupes « Avec l'une de ces étiquettes » et « Sans ces étiquettes » ; explications « Chaque étape
  #   portera l'une de ces étiquettes, sur la transition ou sur la pose d'arrivée. » (Q204) et « Seuls les éléments
  #   étiquetés sont écartés : vérifie chaque étape. » (Q207) ; si les étiquettes n'ont pas pu être chargées, la
  #   génération reste possible sans étiquette (UX-6).
  # Plus tard : style / technique (Q203), enchaînements dynamiques ou inversions consécutives (Q206), famille de
  # pratique (Q208).
  # Exemples d'étiquettes (expert acroyoga, stories 8 et 9a) : « Pop to Bird » (pop) et « Forbidden » (whip, inversion)
  # de Throne vers Bird ; Folded Leaf (inversion, lunaire) ; transition de Bird vers Folded Leaf (lunaire).
  #
  # Story 9b « Générer un flow sur mobile » (decouverte.md, Q212 à Q222), validée le 2026-11-19 : mêmes critères, mêmes
  # valeurs présélectionnées et mêmes libellés que sur le site, partagés par core/presentation (Q222). Le scénario de
  # présélection, neutre vis-à-vis du support, vaut aussi pour l'application (@mobile, sans @wip pour ne pas l'exclure
  # de la CI web ; flow Maestro dans front/apps/mobile/e2e). Saisie (Q221, UX-11) : nombre de transitions par un compteur − / + (élément
  # réglable pour l'accessibilité), plafonds en boutons radio ; changer un critère ne lance aucun tirage, seul
  # « Générer un flow » le fait (tests unitaires).

  Contexte:
    Soit la liste des étiquettes est la liste amorcée

  Règle: Chaque transition du flow respecte les plafonds de difficulté base et de difficulté flyer

    @api
    Plan du Scénario: Une transition au-dessus du plafond de difficulté <rôle> n'entre pas dans le flow
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand un visiteur génère un flow de 1 transition, de difficulté base "<base au plus>" au plus et de difficulté flyer "<flyer au plus>" au plus
      Alors le flow généré est « Throne → Bird », par la transition sans nom

      Exemples: Le plafond de la base, puis celui du flyer
        | rôle   | base au plus | flyer au plus |
        | base   | débutant     | avancé        |
        | flyer  | avancé       | débutant      |

    @api
    Scénario: Une transition au niveau du plafond entre dans le flow
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand un visiteur génère un flow de 1 transition, de difficulté base "intermédiaire" au plus et de difficulté flyer "intermédiaire" au plus
      Alors le flow généré est « Throne → Bird », par la transition « Pop to Bird »

  Règle: Chaque pose du flow, de départ comme d'arrivée, respecte les plafonds de difficulté

    @api
    Scénario: Une pose d'arrivée au-dessus du plafond de difficulté flyer n'entre pas dans le flow
      Soit les poses publiées suivantes dans le catalogue :
        | nom    | difficulté base | difficulté flyer | peut commencer un flow | peut terminer un flow |
        | Throne | débutant        | découverte       | oui                    | oui                   |
        | Bird   | découverte      | découverte       | oui                    | oui                   |
        | Star   | intermédiaire   | intermédiaire    | oui                    | oui                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom | difficulté base | difficulté flyer |
        | Throne         | Bird           |     | débutant        | débutant         |
        | Throne         | Star           |     | débutant        | débutant         |
      Quand un visiteur génère un flow de 1 transition, de difficulté base "avancé" au plus et de difficulté flyer "débutant" au plus
      Alors le flow généré est « Throne → Bird »

    @api
    Scénario: Une pose de départ au-dessus du plafond de difficulté base n'entre pas dans le flow
      Soit les poses publiées suivantes dans le catalogue :
        | nom    | difficulté base | difficulté flyer | peut commencer un flow | peut terminer un flow |
        | Throne | débutant        | découverte       | oui                    | oui                   |
        | Bird   | découverte      | découverte       | oui                    | oui                   |
        | Star   | intermédiaire   | intermédiaire    | oui                    | oui                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom | difficulté base | difficulté flyer |
        | Throne         | Bird           |     | débutant        | débutant         |
        | Star           | Bird           |     | débutant        | débutant         |
      Quand un visiteur génère un flow de 1 transition, de difficulté base "débutant" au plus et de difficulté flyer "avancé" au plus
      Alors le flow généré est « Throne → Bird »

  Règle: Les plafonds de difficulté sont obligatoires et pris dans l'échelle de difficulté

    @api
    Scénario: Une génération sans plafond de difficulté flyer est refusée
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition, de difficulté base "débutant" au plus, sans plafond de difficulté flyer
      Alors la génération est impossible car le plafond de difficulté flyer est obligatoire

    @api
    Scénario: Un plafond hors de l'échelle de difficulté est refusé
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition, de difficulté base "expert" au plus et de difficulté flyer "avancé" au plus
      Alors la génération est impossible car le niveau de difficulté « expert » n'existe pas

  # Q187, Q188, Q204 : une étape est une transition et sa pose d'arrivée ; elle est conforme si l'une ou l'autre porte
  # l'une des étiquettes demandées.
  Règle: Avec des étiquettes demandées, chaque étape du flow porte l'une d'elles, sur sa transition ou sur sa pose d'arrivée

    @api
    Scénario: Le flow ne retient que des étapes dont la transition porte l'une des étiquettes demandées
      Soit les poses publiées "Throne", "Bird", "Star" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec l'étiquette "pop"
      Et la transition publiée sans nom de "Star" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand un visiteur génère un flow de 1 transition avec l'une des étiquettes "lunaire" ou "pop"
      Alors le flow généré est l'un des suivants :
        | flow               |
        | Bird → Folded Leaf |
        | Throne → Bird      |

    @api
    Scénario: Une pose d'arrivée qui porte une étiquette demandée rend son étape conforme
      Soit les poses publiées "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la pose "Folded Leaf" porte l'étiquette "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition avec l'une des étiquettes "lunaire"
      Alors le flow généré est « Bird → Folded Leaf »

    @api
    Scénario: Une pose de départ qui porte une étiquette demandée ne rend pas la première étape conforme
      Soit les poses publiées "Folded Leaf" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la pose "Folded Leaf" porte l'étiquette "lunaire"
      Et la transition publiée sans nom de "Folded Leaf" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition avec l'une des étiquettes "lunaire"
      Alors aucun flow n'est généré car les critères sont trop restrictifs

    @api
    Scénario: Une seule étape sans étiquette demandée suffit à écarter un flow
      Soit les poses publiées "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Et la transition publiée sans nom de "Folded Leaf" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions avec l'une des étiquettes "lunaire"
      Alors aucun flow n'est généré car les critères sont trop restrictifs

  # Q189 : l'exclusion vaut pour toutes les poses, départ compris, et toutes les transitions.
  Règle: Aucune pose ni aucune transition du flow ne porte une étiquette exclue

    @api
    Scénario: Une transition qui porte une étiquette exclue n'entre pas dans le flow
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée "Forbidden" de "Throne" vers "Bird" de difficulté base "avancé" et de difficulté flyer "avancé", avec les étiquettes "whip" et "inversion"
      Quand un visiteur génère un flow de 1 transition sans l'étiquette "inversion"
      Alors le flow généré est « Throne → Bird », par la transition sans nom

    @api
    Scénario: Une pose qui porte une étiquette exclue n'entre pas dans le flow
      Soit les poses publiées "Bird", "Throne" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la pose "Folded Leaf" porte les étiquettes "inversion" et "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée sans nom de "Bird" vers "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur génère un flow de 1 transition sans l'étiquette "inversion"
      Alors le flow généré est « Bird → Throne »

    @api
    Scénario: Exclure « dynamique » écarte aussi les transitions en pop
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec l'étiquette "pop"
      Quand un visiteur génère un flow de 1 transition sans l'étiquette "dynamique"
      Alors le flow généré est « Throne → Bird », par la transition sans nom

    @api
    Scénario: Une pose d'arrivée qui porte une étiquette demandée est écartée si elle porte aussi une étiquette exclue
      Soit les poses publiées "Bird", "Throne" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la pose "Folded Leaf" porte les étiquettes "inversion" et "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée sans nom de "Bird" vers "Throne" de difficulté base "débutant" et de difficulté flyer "découverte", avec l'étiquette "lunaire"
      Quand un visiteur génère un flow de 1 transition avec l'une des étiquettes "lunaire" et sans l'étiquette "inversion"
      Alors le flow généré est « Bird → Throne »

  Règle: Une étiquette à la fois demandée et exclue ne laisse aucun flow possible

    @api
    Scénario: Demander et exclure la même étiquette rend les critères trop restrictifs
      Soit les poses publiées "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Quand un visiteur génère un flow de 1 transition avec l'une des étiquettes "lunaire" et sans l'étiquette "lunaire"
      Alors aucun flow n'est généré car les critères sont trop restrictifs

  # Q190 : toute étiquette de la liste s'applique aux poses ou aux transitions ; elle peut donc être demandée comme
  # exclue. Seule une étiquette absente de la liste est refusée.
  Règle: Les étiquettes demandées ou exclues sont celles de la liste des étiquettes

    @api
    Plan du Scénario: Une étiquette absente de la liste est refusée comme étiquette <critère>
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition <étiquettes>
      Alors la génération est impossible car l'étiquette "classique" n'est pas dans la liste des étiquettes

      Exemples:
        | critère  | étiquettes                            |
        | demandée | avec l'une des étiquettes "classique" |
        | exclue   | sans l'étiquette "classique"          |

    @api
    Scénario: Une étiquette réservée aux poses peut être demandée
      Soit l'étiquette "contrepoids" dans la liste des étiquettes, qui s'applique aux poses seulement
      Et les poses publiées "Throne", "Bird" et "Star" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la pose "Star" porte l'étiquette "contrepoids"
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée sans nom de "Throne" vers "Star" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition avec l'une des étiquettes "contrepoids"
      Alors le flow généré est « Throne → Star »

    @api
    Scénario: Une étiquette réservée aux poses peut être exclue
      Soit l'étiquette "contrepoids" dans la liste des étiquettes, qui s'applique aux poses seulement
      Et les poses publiées "Throne", "Bird" et "Star" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la pose "Star" porte l'étiquette "contrepoids"
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée sans nom de "Throne" vers "Star" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition sans l'étiquette "contrepoids"
      Alors le flow généré est « Throne → Bird »

  Règle: On choisit le nombre de transitions, les plafonds et les étiquettes

    @web @mobile
    Scénario: Le générateur présélectionne 3 transitions et « débutant » pour la base et pour le flyer
      Quand un visiteur ouvre le générateur de flow
      Alors le générateur de flow présente les critères suivants :
        | nombre de transitions     | 3        |
        | difficulté base, au plus  | débutant |
        | difficulté flyer, au plus | débutant |
        | étiquettes demandées      | aucune   |
        | étiquettes exclues        | aucune   |

    @web
    Scénario: Un visiteur génère un flow avec ses critères de difficulté et d'étiquettes
      Soit les poses publiées "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Et la transition publiée "Forbidden" de "Bird" vers "Folded Leaf" de difficulté base "avancé" et de difficulté flyer "avancé", avec les étiquettes "whip" et "lunaire"
      Quand un visiteur génère un flow de 1 transition sur le site, de difficulté base "débutant" au plus et de difficulté flyer "débutant" au plus, avec l'une des étiquettes "lunaire"
      Alors le site présente le flow qui part de "Bird", avec les étapes suivantes :
        | étape | transition         | pose d'arrivée |
        | 1     | Bird → Folded Leaf | Folded Leaf    |

    @mobile
    Scénario: Dans l'application, un visiteur génère un flow avec ses critères de difficulté et d'étiquettes
      Soit les poses publiées "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Et la transition publiée "Forbidden" de "Bird" vers "Folded Leaf" de difficulté base "avancé" et de difficulté flyer "avancé", avec les étiquettes "whip" et "lunaire"
      Quand un visiteur génère un flow de 1 transition dans l'application, de difficulté base "débutant" au plus et de difficulté flyer "débutant" au plus, avec l'une des étiquettes "lunaire"
      Alors l'application présente le flow qui part de "Bird", avec les étapes suivantes :
        | étape | transition         | pose d'arrivée |
        | 1     | Bird → Folded Leaf | Folded Leaf    |

    # Q221, UX-11 : « − » désactivé à 1, « + » désactivé à 10.
    @mobile
    Plan du Scénario: Dans l'application, le nombre de transitions ne peut pas <sens> <borne>
      Soit un visiteur a choisi <borne> transitions dans le générateur de flow
      Quand le visiteur veut <action> le nombre de transitions
      Alors l'application ne permet pas de <action> le nombre de transitions, qui reste <borne>

      Exemples:
        | sens              | borne | action    |
        | descendre sous    | 1     | diminuer  |
        | dépasser          | 10    | augmenter |

    @web
    Scénario: Le site propose de demander et d'exclure toutes les étiquettes de la liste
      Soit l'étiquette "contrepoids" dans la liste des étiquettes, qui s'applique aux poses seulement
      Quand un visiteur ouvre les étiquettes du générateur de flow
      Alors le site propose de demander les étiquettes "contrepoids", "dynamique", "icarien", "inversion", "lunaire", "pop", "vrille" et "whip"
      Et le site propose d'exclure les étiquettes "contrepoids", "dynamique", "icarien", "inversion", "lunaire", "pop", "vrille" et "whip"

    @web
    Plan du Scénario: Le site explique la portée des étiquettes du groupe « <groupe> »
      Quand un visiteur ouvre les étiquettes du générateur de flow
      Alors le site explique pour le groupe « <groupe> » : « <explication> »

      Exemples:
        | groupe                       | explication                                                                               |
        | Avec l'une de ces étiquettes | Chaque étape portera l'une de ces étiquettes, sur la transition ou sur la pose d'arrivée. |
        | Sans ces étiquettes          | Seuls les éléments étiquetés sont écartés : vérifie chaque étape.                         |

    @web
    Plan du Scénario: Une étiquette <état> ne peut pas être <autre état> en même temps
      Soit un visiteur a <choix> l'étiquette "lunaire" dans le générateur de flow
      Quand le visiteur veut <action> l'étiquette "lunaire"
      Alors le site ne permet pas de <action> l'étiquette "lunaire", qu'il marque « (<état>) »

      Exemples:
        | état     | autre état | choix    | action   |
        | demandée | exclue     | demandé  | exclure  |
        | exclue   | demandée   | exclu    | demander |

    @mobile @wip
    Scénario: L'application propose de demander et d'exclure toutes les étiquettes de la liste
      Soit l'étiquette "contrepoids" dans la liste des étiquettes, qui s'applique aux poses seulement
      Quand un visiteur ouvre les étiquettes du générateur de flow
      Alors l'application propose de demander les étiquettes "contrepoids", "dynamique", "icarien", "inversion", "lunaire", "pop", "vrille" et "whip"
      Et l'application propose d'exclure les étiquettes "contrepoids", "dynamique", "icarien", "inversion", "lunaire", "pop", "vrille" et "whip"

    @mobile
    Plan du Scénario: Dans l'application, une étiquette <état> ne peut pas être <autre état> en même temps
      Soit un visiteur a <choix> l'étiquette "lunaire" dans le générateur de flow
      Quand le visiteur veut <action> l'étiquette "lunaire"
      Alors l'application ne permet pas de <action> l'étiquette "lunaire", qu'elle marque « (<état>) »

      Exemples:
        | état     | autre état | choix    | action   |
        | demandée | exclue     | demandé  | exclure  |
        | exclue   | demandée   | exclu    | demander |

    @web
    Scénario: Le site signale une étiquette retirée de la liste pendant la saisie et conserve les critères saisis
      Soit les poses publiées "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Et Bruno est validateur
      Et un visiteur a ouvert le générateur de flow
      Et Bruno a retiré l'étiquette "vrille" de la liste
      Quand le visiteur génère un flow de 1 transition sur le site, avec l'une des étiquettes "lunaire" ou "vrille"
      Alors le site indique « L'étiquette « vrille » n'est plus disponible. Vérifie tes étiquettes, puis génère de nouveau ton flow. »
      Et les critères saisis par le visiteur sont conservés, sans l'étiquette « vrille »

    # UX-6 : la longueur et les plafonds suffisent à générer un flow.
    @web
    Scénario: Un visiteur génère un flow sans étiquette quand les étiquettes n'ont pas pu être chargées
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la liste des étiquettes n'a pas pu être chargée sur le site
      Quand un visiteur génère un flow de 1 transition sur le site
      Alors le site présente le flow qui part de "Throne", avec les étapes suivantes :
        | étape | transition    | pose d'arrivée |
        | 1     | Throne → Bird | Bird           |

    # Q217 (story 9b) : même règle que UX-6.
    @mobile @wip
    Scénario: Dans l'application, un visiteur génère un flow sans étiquette quand les étiquettes n'ont pas pu être chargées
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la liste des étiquettes n'a pas pu être chargée dans l'application
      Quand un visiteur génère un flow de 1 transition dans l'application
      Alors l'application présente le flow qui part de "Throne", avec les étapes suivantes :
        | étape | transition    | pose d'arrivée |
        | 1     | Throne → Bird | Bird           |
