# language: fr
@Integration
Fonctionnalité: Générer un flow
  Afin de pratiquer sans avoir à inventer un enchaînement
  En tant que visiteur ou utilisateur
  Je veux tirer au hasard, dans le catalogue publié, un flow exécutable du nombre de transitions que je choisis

  # Story 9 « Générer un flow », contexte Génération de flow. Carte d'example mapping du 2026-11-19 : decouverte.md,
  # « Story 9 Générer un flow » (règles G, questions Q182 à Q211, revue ux-expert UX-1 à UX-8), validée le 2026-11-19
  # par le porteur du produit. Critères de difficulté et d'étiquettes : generation-de-flow/criteres-de-generation.feature.
  #
  # Rappels de la découverte (décisions 15 à 17) : un flow part d'une pose qui peut commencer un flow, alterne
  # pose → transition → pose et finit sur une pose qui peut terminer un flow ; sinon, réponse explicite « critères trop
  # restrictifs, impossible de générer un flow ».
  #
  # Décisions du porteur du produit (2026-11-19) :
  # - tout le monde génère, visiteur compris ; rien n'est enregistré (Q183) ; l'acteur est un visiteur ou un utilisateur,
  #   « pratiquant » étant réservé à l'utilisateur qui tient un répertoire (Q210) ;
  # - longueur = nombre exact de transitions (d'étapes), de 1 à 10 ; l'API exige la longueur et les deux plafonds de
  #   difficulté ; le site présélectionne 3 transitions, « débutant » pour la base et pour le flyer (Q184, Q185) ;
  # - une étape est une transition et sa pose d'arrivée ; une pose peut revenir dans un flow, une transition y sert au
  #   plus une fois, washing machine comprise (Q191, Q192) ;
  # - tout flow qui satisfait les critères peut être tiré, sans garantie d'uniformité ; les scénarios restent
  #   déterministes : un seul flow possible, ou « l'un des suivants » ; le tirage lui-même est vérifié par des tests
  #   unitaires avec une source de hasard injectable (Q194) ;
  # - pas de graine exposée ; le site garde les critères dans l'adresse de la page et le flow dans l'historique de
  #   navigation (Q195, UX-2) ; « Générer un autre flow » rejoue les critères du flow affiché et peut redonner le même
  #   flow, ce que le site signale (Q196, UX-5) ;
  # - « catalogue insuffisant » distinct de « critères trop restrictifs » : aucun flow de 1 à 10 transitions n'existe,
  #   même sans critère de difficulté ni d'étiquette (Q198) ;
  # - site (Q200, UX-1) : page unique « Générer un flow », ouverte par un bouton secondaire « Générer un flow », premier
  #   des actions du catalogue (pas dans l'en-tête) ; titre « Ton flow », résumé (« 3 transitions, de Throne à Folded
  #   Leaf. »), récapitulatif des critères, « Générer un autre flow », « Modifier les critères », rappel du spotter,
  #   « Départ : Throne », puis la liste ordonnée des étapes (« Étape 1 · Pop to Bird », « Vers Bird », difficultés
  #   base / flyer de la transition et de la pose d'arrivée, étiquettes, description repliée, UX-8) ; la pose de départ
  #   présente aussi ses difficultés (Q209) ; une washing machine est marquée « washing machine » et son arrivée
  #   « (même pose) » (Q211) ;
  # - bouton « Générer un flow », « Génération du flow… » pendant la génération ; incident réseau : « Impossible de
  #   générer le flow. Vérifie ta connexion Internet, puis réessaie. ».
  #
  # Conventions de lecture :
  # - « Throne → Bird → Folded Leaf » désigne le flow qui part de Throne, passe par Bird et finit en Folded Leaf ;
  # - sauf mention, les poses et les transitions sont de difficulté base et flyer « débutant », et un visiteur qui
  #   « génère un flow de N transitions », sur l'API comme sur le site, ne restreint ni la difficulté (« avancé » au
  #   plus pour la base et le flyer) ni les étiquettes.
  # Hors périmètre : pose de départ ou d'arrivée imposée (Q193), flow pour un duo et répertoire (Q202), UX-7, sauvegarder
  # ou partager un flow (Q195). Écran mobile : story dédiée (Q201).
  #
  # Story 9b « Générer un flow sur mobile » (decouverte.md, « Story 9b », Q212 à Q222, revues UX-9 à UX-14 et AY-1 à
  # AY-7), validée le 2026-11-19 par le porteur du produit : scénarios @mobile, un flow Maestro par scénario, vérifiés à la main sur un émulateur (pas en CI) ; restent @wip ceux dont le flow n'est pas encore passé
  # (front/apps/mobile/e2e), sélecteurs par texte, sur l'API réelle avec un catalogue préparé par script (Q220).
  # Décisions : l'application s'ouvre sur le dernier flow gardé, sinon sur le générateur de flow, sans compte, avec
  # « AcroFunJam » en en-tête (Q212, Q219, UX-13) ; noms de poses en texte simple, pas de « Voir le catalogue »,
  # provisoirement (Q213) ; flow et critères gardés sur l'appareil, lisibles hors ligne, descriptions comprises, sans
  # horodatage ; retour arrière depuis le flow = critères du flow, depuis le formulaire = sortie (Q214, AY-4) ; pas de
  # génération hors ligne (Q216) ; barre basse fixe « Modifier les critères » / « Générer un autre flow » et
  # « Revenir au flow précédent » après un nouveau tirage (AY-2, UX-10) ; rappel du spotter au-dessus de l'étape 1, non
  # repliable (AY-3, UX-14). Non vérifiés par Maestro (tests unitaires, revue des captures) : écran maintenu allumé
  # quand le flow est au premier plan, lecture à 2-3 m (Q215, AY-5), placement de la barre basse, thème du système
  # (AY-6), disparition du message après un délai.
  # Hors 9b : « étape en cours » (AY-1, UX-12, story suivante) ; trio et échange de rôles (hors périmètre).

  Règle: Un flow part d'une pose qui peut commencer un flow

    @api
    Scénario: Un flow ne part jamais d'une pose qui ne peut pas commencer un flow
      Soit les poses publiées suivantes dans le catalogue :
        | nom       | peut commencer un flow | peut terminer un flow |
        | Bird      | oui                    | oui                   |
        | Free Bird | non                    | oui                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Bird           | Free Bird      |     |
        | Free Bird      | Bird           |     |
      Quand un visiteur génère un flow de 1 transition
      Alors le flow généré est « Bird → Free Bird »

  Règle: Un flow finit sur une pose qui peut terminer un flow

    @api
    Scénario: Un flow ne finit jamais sur une pose qui ne peut pas terminer un flow
      Soit les poses publiées suivantes dans le catalogue :
        | nom         | peut commencer un flow | peut terminer un flow |
        | Throne      | oui                    | oui                   |
        | Candlestick | oui                    | non                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Candlestick    |     |
        | Candlestick    | Throne         |     |
      Quand un visiteur génère un flow de 1 transition
      Alors le flow généré est « Candlestick → Throne »

  Règle: Au milieu d'un flow, une pose n'a besoin de pouvoir ni commencer ni terminer un flow

    @api
    Scénario: Un flow traverse une pose qui ne peut ni commencer ni terminer un flow
      Soit les poses publiées suivantes dans le catalogue :
        | nom  | peut commencer un flow | peut terminer un flow |
        | Bird | oui                    | oui                   |
        | Bow  | non                    | non                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Bird           | Bow            |     |
        | Bow            | Bird           |     |
      Quand un visiteur génère un flow de 2 transitions
      Alors le flow généré est « Bird → Bow → Bird »

  Règle: La longueur d'un flow est son nombre de transitions, exactement celui demandé

    @api
    Scénario: Un flow compte exactement le nombre de transitions demandé
      Soit les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Folded Leaf    |     |
      Quand un visiteur génère un flow de 2 transitions
      Alors le flow généré est « Throne → Bird → Folded Leaf »

    @api
    Scénario: Un flow plus court que la longueur demandée n'est pas proposé à la place
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions
      Alors aucun flow n'est généré car les critères sont trop restrictifs

  Règle: La longueur demandée est obligatoire et comprise entre 1 et 10 transitions

    @api
    Plan du Scénario: Une longueur de <longueur> transitions est refusée
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de <longueur> transitions
      Alors la génération est impossible car la longueur doit être comprise entre 1 et 10 transitions

      Exemples: Juste hors des bornes
        | longueur |
        | 0        |
        | 11       |

    @api
    Scénario: Une génération sans longueur est refusée
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow sans en préciser la longueur
      Alors la génération est impossible car la longueur est obligatoire

  Règle: Le générateur tire au hasard un flow parmi tous ceux qui satisfont les critères

    @api
    Scénario: Le flow généré est l'un des flows possibles
      Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Throne         | Star           |     |
        | Star           | Bird           |     |
      Quand un visiteur génère un flow de 1 transition
      Alors le flow généré est l'un des suivants :
        | flow          |
        | Throne → Bird |
        | Throne → Star |
        | Star → Bird   |

  Règle: Une pose peut revenir dans un flow

    @api
    Scénario: Un flow peut repasser par une pose déjà parcourue
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Throne         |     |
      Quand un visiteur génère un flow de 2 transitions
      Alors le flow généré est l'un des suivants :
        | flow                   |
        | Throne → Bird → Throne |
        | Bird → Throne → Bird   |

  Règle: Une transition sert au plus une fois dans un flow

    @api
    Scénario: Un flow qui devrait reprendre une transition n'est pas généré
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Throne         |     |
      Quand un visiteur génère un flow de 3 transitions
      Alors aucun flow n'est généré car les critères sont trop restrictifs

  # Q192 : pas de critère dédié ; la washing machine se reconnaît à ses poses (pose de départ = pose d'arrivée).
  # Le nombre de tours d'une washing machine est reporté (Q205).
  Règle: Une washing machine est une étape comme une autre, qui ne sert elle aussi qu'une fois

    @api
    Scénario: Un flow peut être fait d'une washing machine
      Soit la pose publiée "Star" qui peut commencer un flow et peut terminer un flow
      Et la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand un visiteur génère un flow de 1 transition
      Alors le flow généré est « Star → Star », par la transition « Ninja Star »

    @api
    Scénario: Une washing machine ne se répète pas dans un flow
      Soit la pose publiée "Star" qui peut commencer un flow et peut terminer un flow
      Et la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand un visiteur génère un flow de 2 transitions
      Alors aucun flow n'est généré car les critères sont trop restrictifs

  Règle: Seules les poses et les transitions publiées entrent dans un flow

    @api
    Scénario: Une transition en attente de validation n'entre pas dans un flow
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et Alice est utilisateur
      Et Alice a proposé une transition sans nom de "Bird" vers "Throne"
      Quand un visiteur génère un flow de 2 transitions
      Alors aucun flow n'est généré car les critères sont trop restrictifs

  # Q198 : le catalogue est insuffisant quand aucun flow de 1 à 10 transitions n'existe, même sans critère de
  # difficulté ni d'étiquette. Sinon, l'échec tient aux critères (voir « Un flow plus court que la longueur demandée
  # n'est pas proposé à la place »).
  Règle: Un catalogue qui ne permet encore aucun flow est signalé autrement que des critères trop restrictifs

    @api
    Scénario: Un catalogue sans pose ne permet pas encore de générer un flow
      Soit un catalogue sans aucune pose publiée
      Quand un visiteur génère un flow de 1 transition
      Alors aucun flow n'est généré car le catalogue ne permet pas encore d'en générer

    @api
    Scénario: Un catalogue sans transition ne permet pas encore de générer un flow
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Quand un visiteur génère un flow de 1 transition
      Alors aucun flow n'est généré car le catalogue ne permet pas encore d'en générer

    @api
    Scénario: Un catalogue sans pose qui peut commencer un flow ne permet pas encore de générer un flow
      Soit les poses publiées suivantes dans le catalogue :
        | nom       | peut commencer un flow | peut terminer un flow |
        | Bow       | non                    | non                   |
        | Free Bird | non                    | oui                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Bow            | Free Bird      |     |
      Quand un visiteur génère un flow de 1 transition
      Alors aucun flow n'est généré car le catalogue ne permet pas encore d'en générer

  # Une étape est une transition et sa pose d'arrivée. Q209 : chaque pose (départ et arrivées) présente aussi ses
  # difficultés, pour que le duo voie ce que demande chaque élément et lequel porte une étiquette.
  Règle: Le flow présente sa pose de départ puis, étape par étape, la transition et la pose d'arrivée

    @api
    Scénario: Chaque étape du flow présente sa transition, avec ses difficultés et ses étiquettes, et sa pose d'arrivée
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire", avec l'étiquette "pop"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Quand un visiteur génère un flow de 2 transitions
      Alors le flow généré présente les étapes suivantes :
        | étape | pose de départ | transition  | pose d'arrivée | difficulté base | difficulté flyer | étiquettes     |
        | 1     | Throne         | Pop to Bird | Bird           | intermédiaire   | intermédiaire    | dynamique, pop |
        | 2     | Bird           |             | Folded Leaf    | débutant        | débutant         | lunaire        |

    @api
    Scénario: Le flow présente sa pose de départ et chaque pose d'arrivée avec leurs difficultés et leurs étiquettes
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées suivantes dans le catalogue :
        | nom         | difficulté base | difficulté flyer | peut commencer un flow | peut terminer un flow |
        | Bird        | débutant        | découverte       | oui                    | oui                   |
        | Folded Leaf | intermédiaire   | débutant         | oui                    | oui                   |
      Et la pose "Folded Leaf" porte les étiquettes "inversion" et "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition
      Alors le flow généré présente les poses suivantes :
        | place                | pose        | difficulté base | difficulté flyer | étiquettes         |
        | départ               | Bird        | débutant        | découverte       |                    |
        | arrivée de l'étape 1 | Folded Leaf | intermédiaire   | débutant         | inversion, lunaire |

    @api
    Scénario: Chaque étape du flow présente la description de sa transition
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et la transition "Pop to Bird" a pour description "La base propulse le flyer depuis Throne, puis le rattrape en Bird."
      Quand un visiteur génère un flow de 1 transition
      Alors l'étape 1 du flow généré présente la description « La base propulse le flyer depuis Throne, puis le rattrape en Bird. »

    @web
    Scénario: Le site présente le flow en étapes numérotées depuis sa pose de départ
      Soit les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions sur le site
      Alors le site présente le flow qui part de "Throne", avec les étapes suivantes :
        | étape | transition         | pose d'arrivée |
        | 1     | Pop to Bird        | Bird           |
        | 2     | Bird → Folded Leaf | Folded Leaf    |

    @web
    Scénario: Le site résume le flow par son nombre de transitions, sa pose de départ et sa pose d'arrivée
      Soit les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Folded Leaf    |     |
      Quand un visiteur génère un flow de 2 transitions sur le site
      Alors le site résume le flow « 2 transitions, de Throne à Folded Leaf. »

    @web
    Scénario: Le site présente les difficultés et les étiquettes de la pose de départ, de la transition et de la pose d'arrivée
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées suivantes dans le catalogue :
        | nom         | difficulté base | difficulté flyer | peut commencer un flow | peut terminer un flow |
        | Bird        | débutant        | découverte       | oui                    | oui                   |
        | Folded Leaf | intermédiaire   | débutant         | oui                    | oui                   |
      Et la pose "Folded Leaf" porte les étiquettes "inversion" et "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Quand un visiteur génère un flow de 1 transition sur le site
      Alors le site présente le flow ainsi :
        | élément                 | nom                | difficulté base | difficulté flyer | étiquettes         |
        | départ                  | Bird               | débutant        | découverte       |                    |
        | étape 1, transition     | Bird → Folded Leaf | débutant        | débutant         | lunaire            |
        | étape 1, pose d'arrivée | Folded Leaf        | intermédiaire   | débutant         | inversion, lunaire |

    # UX-8 : la description est repliée par défaut, pour garder la liste des étapes lisible.
    @web
    Scénario: Un visiteur déplie la description de la transition d'une étape
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et la transition "Pop to Bird" a pour description "La base propulse le flyer depuis Throne, puis le rattrape en Bird."
      Et un visiteur a généré un flow de 1 transition sur le site
      Quand le visiteur déplie la description de l'étape 1
      Alors le site présente la description « La base propulse le flyer depuis Throne, puis le rattrape en Bird. »

    # Q211 : la washing machine est nommée, en plus de son arrivée « (même pose) ».
    @web
    Scénario: Le site marque une washing machine et son arrivée sur la même pose
      Soit la pose publiée "Star" qui peut commencer un flow et peut terminer un flow
      Et la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand un visiteur génère un flow de 1 transition sur le site
      Alors l'étape 1 du flow présente la transition "Ninja Star", marquée « washing machine », vers la même pose

    @web
    Scénario: Un visiteur ouvre la page d'une pose depuis une étape du flow
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et un visiteur a généré un flow de 1 transition sur le site
      Quand le visiteur ouvre la pose d'arrivée "Bird" depuis l'étape 1 du flow
      Alors le site présente la pose "Bird" du catalogue

    # UX-2 : le flow est gardé dans l'historique de navigation ; revenir ne relance pas de tirage.
    @web
    Scénario: Un visiteur qui revient au flow depuis la page d'une pose retrouve le même flow
      Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Throne         | Star           |     |
        | Star           | Bird           |     |
      Et un visiteur a généré sur le site le flow « Throne → Bird » de 1 transition
      Et le visiteur a ouvert la pose d'arrivée "Bird" depuis l'étape 1 du flow
      Quand le visiteur revient au flow
      Alors le site présente de nouveau le flow « Throne → Bird »

    @mobile
    Scénario: L'application présente le flow en étapes numérotées depuis sa pose de départ
      Soit les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions dans l'application
      Alors l'application présente le flow qui part de "Throne", avec les étapes suivantes :
        | étape | transition         | pose d'arrivée |
        | 1     | Pop to Bird        | Bird           |
        | 2     | Bird → Folded Leaf | Folded Leaf    |

    @mobile
    Scénario: L'application résume le flow par son nombre de transitions, sa pose de départ et sa pose d'arrivée
      Soit les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Folded Leaf    |     |
      Quand un visiteur génère un flow de 2 transitions dans l'application
      Alors l'application résume le flow « 2 transitions, de Throne à Folded Leaf. »

    @mobile
    Scénario: L'application présente les difficultés et les étiquettes de la pose de départ, de la transition et de la pose d'arrivée
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées suivantes dans le catalogue :
        | nom         | difficulté base | difficulté flyer | peut commencer un flow | peut terminer un flow |
        | Bird        | débutant        | découverte       | oui                    | oui                   |
        | Folded Leaf | intermédiaire   | débutant         | oui                    | oui                   |
      Et la pose "Folded Leaf" porte les étiquettes "inversion" et "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Quand un visiteur génère un flow de 1 transition dans l'application
      Alors l'application présente le flow ainsi :
        | élément                 | nom                | difficulté base | difficulté flyer | étiquettes         |
        | départ                  | Bird               | débutant        | découverte       |                    |
        | étape 1, transition     | Bird → Folded Leaf | débutant        | débutant         | lunaire            |
        | étape 1, pose d'arrivée | Folded Leaf        | intermédiaire   | débutant         | inversion, lunaire |

    @mobile
    Scénario: Dans l'application, un visiteur déplie la description de la transition d'une étape
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et la transition "Pop to Bird" a pour description "La base propulse le flyer depuis Throne, puis le rattrape en Bird."
      Et un visiteur a généré un flow de 1 transition dans l'application
      Quand le visiteur déplie la description de l'étape 1
      Alors l'application présente la description « La base propulse le flyer depuis Throne, puis le rattrape en Bird. »

    @mobile
    Scénario: L'application marque une washing machine et son arrivée sur la même pose
      Soit la pose publiée "Star" qui peut commencer un flow et peut terminer un flow
      Et la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand un visiteur génère un flow de 1 transition dans l'application
      Alors l'étape 1 du flow présente la transition "Ninja Star", marquée « washing machine », vers la même pose

  # Q214, AY-4 (story 9b) : équivalent mobile de l'adresse de la page et de l'historique de navigation. Le flow
  # affiché et ses critères sont gardés sur l'appareil, descriptions comprises, lisibles hors ligne ; rouvrir
  # l'application ne relance pas de tirage. Pas d'horodatage du flow (UX-9).
  Règle: L'application garde le flow affiché et ses critères d'une ouverture à l'autre

    @mobile
    Scénario: Un visiteur qui rouvre l'application retrouve le flow affiché
      Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Throne         | Star           |     |
        | Star           | Bird           |     |
      Et un visiteur a généré dans l'application le flow « Throne → Bird » de 1 transition
      Et le visiteur a fermé l'application
      Quand le visiteur rouvre l'application
      Alors l'application présente de nouveau le flow « Throne → Bird »

    @mobile @wip
    Scénario: Hors ligne, le flow gardé reste lisible, descriptions comprises
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et la transition "Pop to Bird" a pour description "La base propulse le flyer depuis Throne, puis le rattrape en Bird."
      Et un visiteur a généré un flow de 1 transition dans l'application, de difficulté base "intermédiaire" au plus et de difficulté flyer "intermédiaire" au plus
      Et le visiteur a fermé l'application
      Et AcroFunJam est momentanément injoignable
      Et le visiteur a rouvert l'application
      Quand le visiteur déplie la description de l'étape 1
      Alors l'application présente la description « La base propulse le flyer depuis Throne, puis le rattrape en Bird. »

    @mobile
    Scénario: Revenir en arrière depuis le flow présente les critères du flow affiché
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Throne         |     |
      Et un visiteur a généré un flow de 2 transitions dans l'application, de difficulté base "débutant" au plus et de difficulté flyer "intermédiaire" au plus
      Quand le visiteur revient en arrière
      Alors le générateur de flow présente les critères suivants :
        | nombre de transitions     | 2             |
        | difficulté base, au plus  | débutant      |
        | difficulté flyer, au plus | intermédiaire |

  # Q199 (et Q146 de la story 8) : le rappel vient du générateur, au-dessus des étapes, sans variante. Application
  # (AY-3, UX-14) : au-dessus de l'étape 1, non repliable, même texte.
  Règle: Chaque flow est présenté avec le rappel du spotter

    @web
    Scénario: Le site présente le rappel du spotter avec le flow généré
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition sur le site
      Alors le site présente avec le flow le rappel « Ce flow est tiré au hasard : il peut contenir des transitions que ton duo n'a jamais faites. Travaillez-les d'abord une par une, avec un spotter. Chacun peut dire stop à tout moment. »

    @mobile
    Scénario: L'application présente le rappel du spotter avec le flow généré
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 1 transition dans l'application
      Alors l'application présente, au-dessus de l'étape 1, le rappel « Ce flow est tiré au hasard : il peut contenir des transitions que ton duo n'a jamais faites. Travaillez-les d'abord une par une, avec un spotter. Chacun peut dire stop à tout moment. »

  # Q195, Q196 : « Générer un autre flow » rejoue les critères du flow affiché (récapitulatif) ; le tirage est
  # indépendant et peut redonner le même flow (UX-5).
  Règle: On génère un autre flow avec les critères du flow affiché

    @web
    Scénario: « Générer un autre flow » reprend les critères du flow affiché
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Throne         |     |
      Et un visiteur a généré un flow de 2 transitions sur le site, de difficulté base "débutant" au plus et de difficulté flyer "débutant" au plus
      Quand le visiteur génère un autre flow
      Alors le site présente un flow généré avec les critères suivants :
        | nombre de transitions     | 2        |
        | difficulté base, au plus  | débutant |
        | difficulté flyer, au plus | débutant |

    @web
    Scénario: Le site signale que le même flow est ressorti
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et un visiteur a généré un flow de 1 transition sur le site
      Quand le visiteur génère un autre flow
      Alors le site indique « Le même flow est ressorti : avec ces critères, le catalogue offre peu de choix. »

    @web
    Scénario: Un visiteur modifie les critères du flow affiché
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Throne         |     |
      Et un visiteur a généré un flow de 2 transitions sur le site, de difficulté base "débutant" au plus et de difficulté flyer "débutant" au plus
      Quand le visiteur modifie les critères
      Alors le générateur de flow présente les critères suivants :
        | nombre de transitions     | 2        |
        | difficulté base, au plus  | débutant |
        | difficulté flyer, au plus | débutant |

    @mobile
    Scénario: Dans l'application, « Générer un autre flow » reprend les critères du flow affiché
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Throne         |     |
      Et un visiteur a généré un flow de 2 transitions dans l'application, de difficulté base "débutant" au plus et de difficulté flyer "débutant" au plus
      Quand le visiteur génère un autre flow
      Alors l'application présente un flow généré avec les critères suivants :
        | nombre de transitions     | 2        |
        | difficulté base, au plus  | débutant |
        | difficulté flyer, au plus | débutant |

    @mobile
    Scénario: L'application signale que le même flow est ressorti
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et un visiteur a généré un flow de 1 transition dans l'application
      Quand le visiteur génère un autre flow
      Alors l'application indique « Le même flow est ressorti : avec ces critères, le catalogue offre peu de choix. »

    @mobile
    Scénario: Dans l'application, un visiteur modifie les critères du flow affiché
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Bird           | Throne         |     |
      Et un visiteur a généré un flow de 2 transitions dans l'application, de difficulté base "débutant" au plus et de difficulté flyer "débutant" au plus
      Quand le visiteur modifie les critères
      Alors le générateur de flow présente les critères suivants :
        | nombre de transitions     | 2        |
        | difficulté base, au plus  | débutant |
        | difficulté flyer, au plus | débutant |

  # AY-2, UX-10 (story 9b) : sur le tapis, un « Générer un autre flow » touché par erreur ne doit pas faire perdre le
  # flow. Règles retenues (bdd-analyst, à relire) :
  # - un nouveau tirage est un flow généré qui remplace le flow présenté : « Générer un autre flow », ou « Générer un
  #   flow » après « Modifier les critères » ; le flow précédent est celui présenté juste avant, avec ses critères ;
  # - un seul flow précédent ; une fois rétabli, il n'est plus proposé d'y revenir (ni de repartir vers l'autre)
  #   jusqu'au tirage suivant ;
  # - rien n'est proposé quand le même flow est ressorti ou quand le tirage échoue (le flow affiché reste présenté) ;
  # - le message disparaît après un délai (test unitaire, durée et texte à fixer avec l'ux-expert) ou dès que le
  #   visiteur modifie les critères ; le flow précédent n'est pas gardé sur l'appareil.
  Règle: Après un nouveau tirage, l'application propose un moment de revenir au flow précédent

    @mobile @wip
    Scénario: Un visiteur revient au flow précédent après avoir généré un autre flow
      Soit les poses publiées suivantes dans le catalogue :
        | nom    | peut commencer un flow | peut terminer un flow |
        | Throne | oui                    | oui                   |
        | Bird   | non                    | oui                   |
        | Star   | non                    | oui                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Throne         | Star           |     |
      Et un visiteur a généré dans l'application le flow « Throne → Bird » de 1 transition
      Et le visiteur a généré un autre flow, « Throne → Star »
      Quand le visiteur revient au flow précédent
      Alors l'application présente de nouveau le flow « Throne → Bird »

    @mobile
    Scénario: Revenir au flow précédent rétablit aussi ses critères
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées "Throne", "Bird" et "Folded Leaf" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant", avec l'étiquette "lunaire"
      Et un visiteur a généré un flow de 1 transition dans l'application sans l'étiquette "lunaire"
      Et le visiteur a modifié les critères, puis généré un flow de 1 transition avec l'une des étiquettes "lunaire"
      Quand le visiteur revient au flow précédent
      Alors l'application présente de nouveau le flow « Throne → Bird », avec les critères suivants :
        | nombre de transitions     | 1        |
        | difficulté base, au plus  | débutant |
        | difficulté flyer, au plus | débutant |
        | étiquettes demandées      | aucune   |
        | étiquettes exclues        | lunaire  |

    @mobile
    Scénario: Une fois le flow précédent rétabli, l'application ne propose plus d'en changer
      Soit les poses publiées suivantes dans le catalogue :
        | nom    | peut commencer un flow | peut terminer un flow |
        | Throne | oui                    | oui                   |
        | Bird   | non                    | oui                   |
        | Star   | non                    | oui                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Throne         | Star           |     |
      Et un visiteur a généré dans l'application le flow « Throne → Bird » de 1 transition
      Et le visiteur a généré un autre flow, « Throne → Star »
      Quand le visiteur revient au flow précédent
      Alors l'application ne propose pas de revenir au flow précédent

    @mobile
    Scénario: L'application ne propose pas de revenir au flow précédent quand le même flow est ressorti
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et un visiteur a généré un flow de 1 transition dans l'application
      Quand le visiteur génère un autre flow
      Alors l'application ne propose pas de revenir au flow précédent

    @mobile
    Scénario: Modifier les critères retire la proposition de revenir au flow précédent
      Soit les poses publiées suivantes dans le catalogue :
        | nom    | peut commencer un flow | peut terminer un flow |
        | Throne | oui                    | oui                   |
        | Bird   | non                    | oui                   |
        | Star   | non                    | oui                   |
      Et les transitions publiées suivantes dans le catalogue :
        | pose de départ | pose d'arrivée | nom |
        | Throne         | Bird           |     |
        | Throne         | Star           |     |
      Et un visiteur a généré dans l'application le flow « Throne → Bird » de 1 transition
      Et le visiteur a généré un autre flow, « Throne → Star »
      Quand le visiteur modifie les critères
      Alors l'application ne propose pas de revenir au flow précédent

  # Q183, Q200, UX-1 : bouton secondaire « Générer un flow », premier des actions du catalogue ; pas dans l'en-tête.
  Règle: Tout le monde, visiteur compris, accède au générateur de flow depuis le catalogue

    @web
    Scénario: Un visiteur ouvre le générateur de flow depuis le catalogue
      Soit un visiteur consulte les poses du catalogue
      Quand le visiteur ouvre le générateur de flow
      Alors le site présente le générateur de flow

  # Q212, Q219, UX-13 (story 9b) : l'application n'a encore ni catalogue ni compte ; elle s'ouvre sur le dernier flow
  # gardé s'il y en a un (voir « Un visiteur qui rouvre l'application retrouve le flow affiché »), sinon sur le
  # générateur. Sa navigation accueillera plus tard d'autres écrans (catalogue, compte).
  Règle: Tout le monde, visiteur compris, trouve le générateur de flow à l'ouverture de l'application

    @mobile
    Scénario: Sans flow gardé, l'application s'ouvre sur le générateur de flow
      Quand un visiteur ouvre l'application
      Alors l'application présente le générateur de flow

    @mobile
    Scénario: L'application présente le nom « AcroFunJam » en en-tête
      Quand un visiteur ouvre l'application
      Alors l'application présente « AcroFunJam » en en-tête

  # Q197 : le site ne dit pas quel critère bloque ; il propose des pistes adaptées aux critères choisis et
  # « Modifier les critères ». Q198 : un catalogue insuffisant n'est pas la faute des critères.
  Règle: La personne qui génère apprend pourquoi aucun flow n'a été généré

    @web
    Scénario: Le site signale des critères trop restrictifs
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions sur le site
      Alors le site indique « Critères trop restrictifs : impossible de générer un flow. »

    @web
    Plan du Scénario: Le site propose des pistes pour élargir le choix, <cas>
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions sur le site, <étiquettes>
      Alors le site propose, pour élargir le choix, les pistes <pistes>

      Exemples:
        | cas                         | étiquettes                          | pistes                                                                                                            |
        | sans critère d'étiquette    | sans critère d'étiquette            | « moins de transitions » et « des plafonds de difficulté plus hauts »                                             |
        | avec une étiquette exclue   | sans l'étiquette "vrille"           | « moins de transitions », « des plafonds de difficulté plus hauts » et « moins d'étiquettes exclues »             |
        | avec une étiquette demandée | avec l'une des étiquettes "lunaire" | « moins de transitions », « des plafonds de difficulté plus hauts » et « plus d'étiquettes demandées, ou aucune » |

    @web
    Scénario: Le site signale un catalogue qui ne permet pas encore de générer un flow
      Soit un catalogue sans aucune pose publiée
      Quand un visiteur génère un flow de 1 transition sur le site
      Alors le site indique « Le catalogue ne permet pas encore de générer un flow. Il manque encore des poses ou des transitions pour former un enchaînement. »

    @web
    Scénario: Depuis un catalogue qui ne permet pas encore de générer un flow, le visiteur rejoint le catalogue
      Soit un catalogue sans aucune pose publiée
      Et un visiteur a généré un flow de 1 transition sur le site
      Quand le visiteur choisit de voir le catalogue
      Alors le site présente les poses du catalogue

    @mobile
    Scénario: L'application signale des critères trop restrictifs
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions dans l'application
      Alors l'application indique « Critères trop restrictifs : impossible de générer un flow. »

    @mobile
    Plan du Scénario: L'application propose des pistes pour élargir le choix, <cas>
      Soit la liste des étiquettes est la liste amorcée
      Et les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur génère un flow de 2 transitions dans l'application, <étiquettes>
      Alors l'application propose, pour élargir le choix, les pistes <pistes>

      Exemples:
        | cas                         | étiquettes                          | pistes                                                                                                            |
        | sans critère d'étiquette    | sans critère d'étiquette            | « moins de transitions » et « des plafonds de difficulté plus hauts »                                             |
        | avec une étiquette exclue   | sans l'étiquette "vrille"           | « moins de transitions », « des plafonds de difficulté plus hauts » et « moins d'étiquettes exclues »             |
        | avec une étiquette demandée | avec l'une des étiquettes "lunaire" | « moins de transitions », « des plafonds de difficulté plus hauts » et « plus d'étiquettes demandées, ou aucune » |

    # Q213 : l'application n'a pas encore de catalogue à montrer ; le message est le même, sans « Voir le catalogue »,
    # jusqu'à la story « catalogue en lecture sur mobile ».
    @mobile
    Scénario: L'application signale un catalogue qui ne permet pas encore de générer un flow
      Soit un catalogue sans aucune pose publiée
      Quand un visiteur génère un flow de 1 transition dans l'application
      Alors l'application indique « Le catalogue ne permet pas encore de générer un flow. Il manque encore des poses ou des transitions pour former un enchaînement. »

  # Le site distingue un AcroFunJam injoignable de critères trop restrictifs.
  Règle: Le site signale une génération impossible à joindre et permet de réessayer

    @web
    Scénario: Le site signale que le flow n'a pas pu être généré
      Soit AcroFunJam est momentanément injoignable
      Quand un visiteur génère un flow de 1 transition sur le site
      Alors le site indique « Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie. »

    @web
    Scénario: Un visiteur obtient un flow en réessayant quand AcroFunJam est de nouveau joignable
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la génération d'un flow de 1 transition a échoué car AcroFunJam était injoignable
      Et AcroFunJam est de nouveau joignable
      Quand le visiteur réessaie de générer le flow
      Alors le site présente le flow qui part de "Throne", avec les étapes suivantes :
        | étape | transition    | pose d'arrivée |
        | 1     | Throne → Bird | Bird           |

  # Q216 (story 9b) : pas de génération hors ligne ; sur le tapis, le flow affiché n'est jamais perdu.
  Règle: L'application signale une génération impossible à joindre, sans perdre le flow affiché

    @mobile
    Scénario: L'application signale que le flow n'a pas pu être généré
      Soit AcroFunJam est momentanément injoignable
      Quand un visiteur génère un flow de 1 transition dans l'application
      Alors l'application indique « Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie. »

    @mobile
    Scénario: Dans l'application, un visiteur obtient un flow en réessayant quand AcroFunJam est de nouveau joignable
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et la génération d'un flow de 1 transition dans l'application a échoué car AcroFunJam était injoignable
      Et AcroFunJam est de nouveau joignable
      Quand le visiteur réessaie de générer le flow
      Alors l'application présente le flow qui part de "Throne", avec les étapes suivantes :
        | étape | transition    | pose d'arrivée |
        | 1     | Throne → Bird | Bird           |

    @mobile
    Scénario: Le flow affiché reste présenté quand un autre flow ne peut pas être généré
      Soit les poses publiées "Throne" et "Bird" dans le catalogue, qui peuvent commencer et terminer un flow
      Et la transition publiée sans nom de "Throne" vers "Bird" de difficulté base "débutant" et de difficulté flyer "débutant"
      Et un visiteur a généré un flow de 1 transition dans l'application
      Et AcroFunJam est momentanément injoignable
      Quand le visiteur génère un autre flow
      Alors l'application présente toujours le flow « Throne → Bird »
