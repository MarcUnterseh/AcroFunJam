# language: fr
@Integration
Fonctionnalité: Ajouter des vidéos à une transition publiée
  Afin que chacun voie comment se fait une transition, ce que ni ses difficultés ni sa description ne montrent
  En tant que validateur ou administrateur
  Je veux téléverser directement de courtes vidéos d'une transition publiée, les décrire et les retirer

  # Story 12 « Vidéos des transitions », volet Catalogue : ajout direct, sur le modèle des photos des poses
  # (catalogue/ajouter-des-photos-a-une-pose.feature, story 10, ADR 0039). Carte réécrite le 2026-11-26 après le
  # changement de cap du porteur du produit, VALIDÉE LE 2026-11-26 avec les avis de l'ux-expert (UX-47 à UX-59) :
  # decouverte.md, « Story 12 Vidéos des transitions ». Scénarios @api et @web implémentés.
  #
  # Décisions du porteur du produit (2026-11-26) :
  # - les vidéos sont téléversées et stockées par AcroFunJam ; aucun lien vers YouTube, Vimeo ou Instagram (Q226) ;
  # - moins de 31 secondes par vidéo (30,9 s acceptée) ; la durée citée dans les messages est tronquée (UX-48) ;
  # - le son est retiré ;
  # - seuls un validateur et un administrateur ajoutent, directement ; les utilisateurs proposeront (story 12b, Q229) ;
  # - le crédit nomme à qui appartient la vidéo : une personne, un duo ou un collectif (UX-49) ;
  # - description de la vidéo FACULTATIVE, 300 caractères au plus, présentée dans un repli sous la vidéo (UX-47, Q302) ;
  # - « Vérification de la vidéo… », « En préparation » (mis à jour sans recharger), « Impossible à préparer » (UX-52,
  #   UX-59) ; retour sur l'élément de la transition après l'ajout (UX-57) ; contrôles dès le choix d'une vidéo HEVC par
  #   la lecture de son en-tête, si l'ADR la juge fiable (UX-55) ;
  # - toutes les autres recommandations de la carte sont retenues :
  # - capacité distincte « gérer les vidéos » (manage-videos) (Q230) ;
  # - MP4, MOV ou WebM reconnus au contenu (Q292) ; 100 Mo au plus (Q293) ; de 2 s à moins de 31 s, refusée au-delà,
  #   jamais coupée (Q294) ; au moins 480 pixels sur le plus petit côté (Q295) ;
  # - AcroFunJam prépare chaque vidéo : son retiré, métadonnées retirées, redressée, 720 pixels au plus sur le plus
  #   petit côté, jamais agrandie, avec pour affiche sa première image ; le fichier d'origine n'est pas gardé (Q296,
  #   Q297, Q301) ;
  # - la préparation se fait en différé : une vidéo « en préparation » n'est présentée qu'aux validateurs et aux
  #   administrateurs ; une préparation impossible leur est signalée (Q298) ;
  # - légende obligatoire, 100 caractères au plus, qui dit ce que montre la vidéo (démonstration ou tutoriel) (Q231) ;
  # - crédit : à qui appartient la vidéo, mêmes règles que le crédit d'une photo (Q287, UX-49) ;
  # - même case des droits que pour une photo, adaptée aux personnes filmées (Q236) ;
  # - au plus 3 vidéos par transition, en préparation comprises, dans l'ordre d'ajout, sans vidéo principale (Q232) ;
  #   aucune règle de doublon (Q233) ;
  # - retrait immédiat, vidéo et affiche plus accessibles ; légende, crédit et description modifiables (Q237 à Q239).
  # La charte des vidéos (transition entière, prises visibles, bonne variante…) est une règle de validation, sans
  # scénario (Q291).
  #
  # Fichiers des scénarios : des fixtures nommées par leur format, leur durée, leur poids et leurs dimensions (« une
  # vidéo MP4 de 30 s, 100 Mo, 1920×1080 ») ; « une vidéo MP4 de 12 s » désigne une vidéo de 20 Mo en 1920×1080,
  # avec du son. Sauf mention, une vidéo est ajoutée avec une légende, un crédit et la case des droits cochée, sans
  # description.
  # Dans un « Soit », une vidéo ajoutée est prête, sauf mention « encore en préparation ». « La transition … a
  # 1 vidéo » compte aussi les vidéos en préparation ; « la vidéo présentée » est la vidéo préparée.
  #
  # Personnages : Alice est utilisatrice, Bruno validateur, Paul administrateur.
  # Hors périmètre : proposer une vidéo (utilisateur, story 12b), vidéos des poses (12c), vidéos dans le générateur de
  # flow et dans l'application (12d), couper une vidéo sur le site (12e), signalement d'un contenu.

  Contexte:
    Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue
    Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"

  Règle: Un validateur ou un administrateur ajoute directement une vidéo à une transition publiée

    @api
    Plan du Scénario: Un <rôle> ajoute une vidéo à une transition publiée, présentée une fois prête
      Soit Bruno est <rôle>
      Et Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente exactement les vidéos :
        | légende                  | crédit     |
        | Pop to Bird, vue de côté | Léa Martin |

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  # Q230 : capacité « gérer les vidéos », refus « Seul un validateur ou un administrateur gère les vidéos. ».
  Règle: Seul un validateur ou un administrateur gère les vidéos d'une transition

    @api
    Scénario: Un utilisateur ne peut pas ajouter une vidéo à une transition publiée
      Soit Alice est utilisateur
      Quand Alice ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s
      Alors l'ajout est refusé car seul un validateur ou un administrateur gère les vidéos

    @api
    Scénario: Un visiteur ne peut pas ajouter une vidéo à une transition publiée
      Quand un visiteur ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s
      Alors l'ajout est refusé car il faut être connecté

    @api
    Scénario: Un utilisateur ne peut pas retirer une vidéo d'une transition
      Soit Bruno est validateur
      Et Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté »
      Et Alice est utilisateur
      Quand Alice retire de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Pop to Bird, vue de côté »
      Alors le retrait est refusé car seul un validateur ou un administrateur gère les vidéos

  # Q225, Q244 : ni pose (story 12c), ni proposition de transition (story 12b).
  Règle: Seule une transition publiée reçoit une vidéo

    @api
    Scénario: Une transition inconnue du catalogue ne peut pas recevoir de vidéo
      Soit Bruno est validateur
      Quand Bruno ajoute à une transition qui n'existe pas dans le catalogue une vidéo MP4 de 12 s
      Alors l'ajout est impossible car la transition est introuvable dans le catalogue

  # Q292 : le format est reconnu au contenu du fichier, pas à son nom. MOV : vidéos des iPhone, souvent en HEVC.
  Règle: Une vidéo est un fichier MP4, MOV ou WebM

    Contexte:
      Soit Bruno est validateur

    @api
    Plan du Scénario: Une vidéo <cas> est acceptée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" <fichier>
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 1 vidéo

      Exemples:
        | cas                     | fichier                                       |
        | MP4 en H.264            | une vidéo MP4 H.264 de 12 s                   |
        | MP4 en HEVC             | une vidéo MP4 HEVC de 12 s                    |
        | MOV filmée par un iPhone | une vidéo MOV HEVC de 12 s filmée par un iPhone |
        | WebM                    | une vidéo WebM VP9 de 12 s                    |

    @api
    Plan du Scénario: Un fichier qui n'est pas une vidéo d'un format accepté rend l'ajout impossible (<cas>)
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" <fichier>
      Alors l'ajout est impossible car le fichier n'est pas une vidéo MP4, MOV ou WebM

      Exemples:
        | cas                         | fichier                                    |
        | GIF animé                   | un GIF animé de 3 s, 2 Mo, 800×800         |
        | photo                       | une photo JPEG de 2 Mo de 1600×1200        |
        | document PDF                | un document PDF de 1 Mo                    |
        | texte nommé comme une vidéo | un fichier texte nommé « pop-to-bird.mp4 » |

    @api
    Scénario: Une vidéo sans fichier ne peut pas être ajoutée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo sans fichier
      Alors l'ajout est impossible car le fichier de la vidéo est obligatoire

  # Q293 : 30 secondes en 1080p tiennent largement dans 100 Mo ; une vidéo en 4K à 60 images par seconde, non.
  # Le site ne réduit pas une vidéo avant l'envoi (contrairement aux photos) : il signale le poids dès le choix.
  Règle: L'API accepte une vidéo de 100 Mo au plus

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une vidéo de 100 Mo est acceptée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 30 s, 100 Mo, 1920×1080
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 1 vidéo

    @api
    Scénario: Une vidéo de plus de 100 Mo rend l'ajout impossible
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 30 s, 101 Mo, 3840×2160
      Alors l'ajout est impossible car la vidéo dépasse 100 Mo

  # Décision du porteur du produit : 30 secondes au plus. Q294 : refusée au-delà, jamais coupée (AcroFunJam ne sait
  # pas quelles 30 secondes garder) ; au moins 2 secondes. UX-48 (2026-11-26) : toute vidéo de moins de 31 secondes est
  # acceptée (un téléphone affiche « 0:30 » jusqu'à 30,9 s).
  Règle: Une vidéo dure au moins 2 secondes et moins de 31 secondes ; plus longue, elle est refusée, jamais coupée

    Contexte:
      Soit Bruno est validateur

    @api
    Plan du Scénario: Une vidéo de <durée> est acceptée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de <durée>
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 1 vidéo

      Exemples:
        | durée  |
        | 2 s    |
        | 30 s   |
        | 30,9 s |

    @api
    Scénario: Une vidéo de plus de 30 secondes rend l'ajout impossible
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 31 s
      Alors l'ajout est impossible car la vidéo dure plus de 30 secondes

    @api
    Scénario: Une vidéo de moins de 2 secondes rend l'ajout impossible
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 1 s
      Alors l'ajout est impossible car la vidéo dure moins de 2 secondes

  # Q295 : assez grande pour voir les prises ; pas de maximum, AcroFunJam la réduit (Q296).
  Règle: Une vidéo mesure au moins 480 pixels sur son plus petit côté

    Contexte:
      Soit Bruno est validateur

    @api
    Plan du Scénario: Une vidéo de <dimensions> est acceptée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, 10 Mo, <dimensions>
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 1 vidéo

      Exemples:
        | dimensions |
        | 854×480    |
        | 480×854    |
        | 3840×2160  |

    @api
    Scénario: Une vidéo trop petite rend l'ajout impossible
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, 5 Mo, 640×360
      Alors l'ajout est impossible car la vidéo doit mesurer au moins 480 pixels sur son plus petit côté

  # Décision du porteur du produit : le son est retiré (musique protégée). Q257 appliquée aux vidéos : rien de ce que
  # contient le fichier d'origine en dehors de l'image ne sort d'AcroFunJam.
  # Côté @api, ffmpeg est simulé (ADR 0041) : ces scénarios ne vérifient que ce que le faux promet. La preuve du son, des
  # métadonnées et du redressement retirés par le vrai ffmpeg est dans FfmpegVideoProcessorTests (tests d'intégration).
  Règle: AcroFunJam retire le son et toutes les métadonnées d'une vidéo, et la présente redressée

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une vidéo présentée n'a plus de son
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s avec de la musique
      Alors la vidéo présentée de la transition "Pop to Bird" de "Throne" vers "Bird" n'a pas de son

    @api
    Scénario: Une vidéo présentée ne contient plus la position GPS du tournage
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MOV HEVC de 12 s filmée par un iPhone, avec une position GPS et le modèle de l'appareil
      Alors la vidéo présentée de la transition "Pop to Bird" de "Throne" vers "Bird" ne contient aucune métadonnée

    @api
    Scénario: Une vidéo filmée en portrait par un téléphone est présentée en portrait
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MOV HEVC de 12 s, 20 Mo, 1920×1080, marquée « à pivoter de 90° »
      Alors la vidéo présentée de la transition "Pop to Bird" de "Throne" vers "Bird" est en portrait

  # Q296 : assez nette pour voir les prises, assez légère pour un téléphone en 4G (environ 6 Mo pour 30 secondes).
  Règle: AcroFunJam présente une vidéo en 720 pixels au plus sur son plus petit côté, sans jamais l'agrandir

    Contexte:
      Soit Bruno est validateur

    @api
    Plan du Scénario: Une vidéo de <envoyée> est présentée en <présentée>
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, 20 Mo, <envoyée>
      Alors la vidéo présentée de la transition "Pop to Bird" de "Throne" vers "Bird" mesure <présentée>

      Exemples:
        | envoyée   | présentée |
        | 3840×2160 | 1280×720  |
        | 1080×1920 | 720×1280  |
        | 854×480   | 854×480   |

  # Q297 : la première image montre la pose de départ ; le gestionnaire ne la choisit pas dans cette story.
  # Côté @api, l'affiche vient du faux ffmpeg : la preuve est dans FfmpegVideoProcessorTests (tests d'intégration).
  Règle: Une vidéo a pour affiche sa première image

    @api
    Scénario: L'affiche d'une vidéo est sa première image
      Soit Bruno est validateur
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté »
      Alors la vidéo présentée « Pop to Bird, vue de côté » a pour affiche sa première image

  # Q298 : une vidéo ne se prépare pas en un instant ; l'ajout répond tout de suite, la préparation suit en différé.
  # Le fichier d'origine n'est jamais gardé, préparation réussie ou non (Q301).
  Règle: Une vidéo n'est présentée aux visiteurs qu'une fois prête ; les validateurs et les administrateurs voient sa préparation

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une vidéo encore en préparation n'est pas présentée aux visiteurs
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté », encore en préparation
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" ne présente aucune vidéo

    @api
    Scénario: Une vidéo est présentée aux visiteurs dès qu'elle est prête
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté », encore en préparation
      Et AcroFunJam a fini de préparer la vidéo « Pop to Bird, vue de côté »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente la vidéo « Pop to Bird, vue de côté »

    @api
    Scénario: Le validateur voit qu'une vidéo est en préparation
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté », encore en préparation
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, vue de côté » de la transition "Pop to Bird" depuis la pose "Throne" est présentée à Bruno comme en préparation

    @api
    Scénario: Le validateur voit qu'une vidéo n'a pas pu être préparée
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s endommagée, avec la légende « Pop to Bird, vue de côté »
      Et AcroFunJam n'a pas pu préparer la vidéo « Pop to Bird, vue de côté »
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, vue de côté » de la transition "Pop to Bird" depuis la pose "Throne" est présentée à Bruno comme impossible à préparer

  # Q231 : la légende dit ce que montre la vidéo, et si c'est une démonstration ou un tutoriel (expert acroyoga) ; elle
  # sert de nom accessible au lecteur ; elle ne nomme pas les personnes filmées.
  Règle: La légende d'une vidéo est obligatoire, sans espaces superflus, et compte au plus 100 caractères

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Les espaces superflus de la légende sont retirés
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende «   Pop to Bird,   tutoriel   »
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a la vidéo « Pop to Bird, tutoriel »

    @api
    Scénario: Une légende de 100 caractères est acceptée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec une légende de 100 caractères
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 1 vidéo

    @api
    Scénario: Une légende de 101 caractères rend l'ajout impossible
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec une légende de 101 caractères
      Alors l'ajout est impossible car la légende de la vidéo est trop longue

    @api
    Scénario: Une vidéo sans légende ne peut pas être ajoutée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, sans légende
      Alors l'ajout est impossible car la légende de la vidéo est obligatoire

    @api
    Scénario: Une légende faite seulement d'espaces vaut absence de légende
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec une légende faite seulement d'espaces
      Alors l'ajout est impossible car la légende de la vidéo est obligatoire

  # Q287 (recommandation révisée) : une vidéo stockée par AcroFunJam est republiée, comme une photo ; son crédit suit
  # les mêmes règles (liste des crédits qui ne nomment personne : glossaire, « Crédit (d'une photo) »). UX-49
  # (2026-11-26) : il nomme à qui appartient la vidéo, une personne, un duo ou un collectif.
  Règle: Le crédit nomme à qui appartient la vidéo : obligatoire, sans espaces superflus, 100 caractères au plus, jamais « inconnu »

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Les espaces superflus du crédit sont retirés
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec le crédit «   Léa   Martin  »
      Alors la vidéo de la transition "Pop to Bird" de "Throne" vers "Bird" est créditée « Léa Martin »

    @api
    Plan du Scénario: Un crédit en pseudonyme, au nom d'un duo ou d'un collectif est accepté (<cas>)
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec le crédit « <crédit> »
      Alors la vidéo de la transition "Pop to Bird" de "Throne" vers "Bird" est créditée « <crédit> »

      Exemples:
        | cas        | crédit             |
        | pseudonyme | Lulu Acro          |
        | duo        | Léa et Hugo        |
        | collectif  | Collectif AcroLyon |

    @api
    Plan du Scénario: Un crédit qui ne nomme personne rend l'ajout impossible (« <crédit> »)
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec le crédit « <crédit> »
      Alors l'ajout est impossible car le crédit doit nommer à qui appartient la vidéo

      Exemples:
        | crédit         |
        | inconnu        |
        | Auteur inconnu |

    @api
    Scénario: Une vidéo sans crédit ne peut pas être ajoutée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, sans crédit
      Alors l'ajout est impossible car le crédit de la vidéo est obligatoire

    @api
    Scénario: Un crédit de 101 caractères rend l'ajout impossible
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec un crédit de 101 caractères
      Alors l'ajout est impossible car le crédit de la vidéo est trop long

  # UX-47, Q302 (décision du porteur du produit, 2026-11-26) : alternative textuelle d'une vidéo seule (WCAG 1.2.1),
  # FACULTATIVE ; sans elle, la légende reste le nom accessible du lecteur. Elle décrit le mouvement, sans nommer les
  # personnes filmées.
  Règle: La description d'une vidéo est facultative, sans espaces superflus, et compte au plus 300 caractères

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une vidéo ajoutée avec une description la présente
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et la description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, vue de côté » de la transition "Pop to Bird" depuis la pose "Throne" a pour description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »

    @api
    Scénario: Une vidéo peut être ajoutée sans description
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté », sans description
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Pop to Bird, vue de côté » de la transition "Pop to Bird" depuis la pose "Throne" n'a pas de description

    @api
    Scénario: Les espaces superflus de la description sont retirés
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et la description «   La base pousse   les pieds du flyer.  »
      Alors la vidéo « Pop to Bird, vue de côté » de la transition "Pop to Bird" de "Throne" vers "Bird" a pour description « La base pousse les pieds du flyer. »

    @api
    Scénario: Une description de 300 caractères est acceptée
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec une description de 300 caractères
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 1 vidéo

    @api
    Scénario: Une description de 301 caractères rend l'ajout impossible
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec une description de 301 caractères
      Alors l'ajout est impossible car la description de la vidéo est trop longue

    @api
    Scénario: Une description faite seulement d'espaces vaut absence de description
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et une description faite seulement d'espaces
      Alors la vidéo « Pop to Bird, vue de côté » de la transition "Pop to Bird" de "Throne" vers "Bird" n'a pas de description

  # Q236 (recommandation révisée) : la case d'une photo, avec « personne filmée » ; gardée avec le compte et la date,
  # jamais présentée.
  Règle: Ajouter une vidéo exige de confirmer l'autorisation de l'auteur, l'accord des personnes filmées et l'absence de mineur reconnaissable

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une vidéo ne peut pas être ajoutée sans la confirmation
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, sans cocher la case des droits
      Alors l'ajout est impossible car il faut confirmer les droits sur la vidéo et l'accord des personnes filmées

    @api
    Scénario: La confirmation est gardée avec la vidéo, avec le compte et la date
      Quand Bruno ajoute le 2026-12-01 à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s
      Alors la vidéo de la transition "Pop to Bird" de "Throne" vers "Bird" garde la confirmation des droits donnée par Bruno le 2026-12-01

  # Q232 : une transition se montre en peu de vidéos ; pas de vidéo principale, aucune vignette n'en dépend. Une vidéo
  # en préparation occupe déjà sa place (Q298). Q233 : aucune règle de doublon, comme pour les photos (Q268).
  Règle: Une transition a au plus 3 vidéos, présentées dans l'ordre où elles ont été ajoutées

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Les vidéos d'une transition sont présentées dans l'ordre où elles ont été ajoutées
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Vue de face »
      Et Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MOV HEVC de 12 s filmée par un iPhone, avec la légende « Vue de côté »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente les vidéos dans cet ordre : « Vue de face », « Vue de côté »

    @api
    Scénario: Une quatrième vidéo ne peut pas être ajoutée à une transition
      Soit la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 3 vidéos
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s
      Alors l'ajout est impossible car la transition a déjà 3 vidéos

    @api
    Scénario: Une vidéo en préparation compte parmi les 3 vidéos d'une transition
      Soit la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 2 vidéos prêtes et 1 vidéo encore en préparation
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s
      Alors l'ajout est impossible car la transition a déjà 3 vidéos

    @api
    Scénario: Retirer une vidéo libère une place pour une autre
      Soit la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 3 vidéos, dont « Vue de face »
      Et Bruno a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand Bruno ajoute à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird au ralenti »
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 3 vidéos, dont « Pop to Bird au ralenti »

  # Q237, Q238 : retrait immédiat, sans motif ni historique ; c'est aussi la réponse à une demande de retrait reçue à
  # l'adresse de contact (une seule suffit, de la base ou du flyer), comme pour une photo (Q267).
  Règle: Un validateur ou un administrateur retire une vidéo d'une transition

    Contexte:
      Soit Bruno est validateur
      Et Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Vue de face »

    @api
    Plan du Scénario: Un <rôle> retire une vidéo, qui n'est plus présentée
      Soit Paul est <rôle>
      Et Paul a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" ne présente aucune vidéo

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api
    Plan du Scénario: Une vidéo retirée n'est plus accessible, même par son adresse (<élément>)
      Soit Bruno a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand un visiteur ouvre l'adresse <élément> retirée « Vue de face »
      Alors la vidéo est introuvable

      Exemples:
        | élément                   |
        | de la vidéo               |
        | de l'affiche de la vidéo  |

    @api
    Scénario: Une vidéo encore en préparation peut être retirée
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Vue de côté », encore en préparation
      Quand Bruno retire de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de côté »
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" a 1 vidéo, « Vue de face »

    @api
    Scénario: Retirer une vidéo déjà retirée est impossible
      Soit Bruno a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand Bruno retire de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Alors le retrait est impossible car la vidéo n'est plus dans le catalogue

  # Q239 (recommandation révisée) : comme le texte alternatif et le crédit d'une photo (Q260) ; la vidéo garde sa
  # place ; la confirmation n'est pas redemandée. Changer de fichier, c'est retirer, puis ajouter. Décision du
  # 2026-11-26 : la description se modifie comme la légende et le crédit ; la vider laisse la vidéo sans description.
  Règle: Un validateur ou un administrateur change la légende, le crédit et la description d'une vidéo

    Contexte:
      Soit Bruno est validateur
      Et Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Vue de face » et le crédit « Lea Martin »
      Et Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Vue de côté »

    @api
    Scénario: Le validateur corrige la légende d'une vidéo, qui garde sa place
      Soit Bruno a changé la légende de la vidéo « Vue de face » de la transition "Pop to Bird" de "Throne" vers "Bird" en « Pop to Bird, démonstration de face »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente les vidéos dans cet ordre : « Pop to Bird, démonstration de face », « Vue de côté »

    @api
    Scénario: Le validateur corrige le crédit d'une vidéo
      Soit Bruno a changé le crédit de la vidéo « Vue de face » de la transition "Pop to Bird" de "Throne" vers "Bird" en « Léa Martin »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Vue de face » de la transition "Pop to Bird" depuis la pose "Throne" est créditée « Léa Martin »

    @api
    Scénario: Une légende corrigée suit les mêmes règles qu'à l'ajout
      Quand Bruno change la légende de la vidéo « Vue de face » de la transition "Pop to Bird" de "Throne" vers "Bird" en une légende faite seulement d'espaces
      Alors le changement est impossible car la légende de la vidéo est obligatoire

    @api
    Scénario: Le validateur ajoute une description à une vidéo qui n'en avait pas
      Soit Bruno a changé la description de la vidéo « Vue de face » de la transition "Pop to Bird" de "Throne" vers "Bird" en « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Vue de face » de la transition "Pop to Bird" depuis la pose "Throne" a pour description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »

    @api
    Scénario: Vider la description d'une vidéo la laisse sans description
      Soit Bruno a changé la description de la vidéo « Vue de face » de la transition "Pop to Bird" de "Throne" vers "Bird" en « Vue de face, au ralenti. »
      Et Bruno a changé la description de la vidéo « Vue de face » de la transition "Pop to Bird" de "Throne" vers "Bird" en une description vide
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la vidéo « Vue de face » de la transition "Pop to Bird" depuis la pose "Throne" n'a pas de description

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site (les pas visent le nom accessible des transitions sans nom, « la transition de Bird vers
  # Star »)
  # ---------------------------------------------------------------------------------------------------

  # Q288 (recommandation révisée) : l'invitation « Ajouter une vidéo » est dans le pied de gestion de la transition, à
  # côté de « Étiqueter » (nom accessible « Ajouter une vidéo à Pop to Bird ») ; l'ajout se fait sur une page dédiée,
  # comme pour une photo (fichier, aperçu, progression). Q289 : repère et maximum calqués sur les photos.
  Règle: Sur le site, un validateur ou un administrateur est invité à ajouter une vidéo, jusqu'à 3 par transition

    @web
    Scénario: Un validateur est invité à ajouter une vidéo à une transition qui n'en a aucune
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose invite Bruno à « Ajouter une vidéo à Pop to Bird »

    @web
    Scénario: Un utilisateur n'est pas invité à ajouter une vidéo à une transition
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte la pose "Throne" du catalogue
      Alors la page de la pose n'invite pas Alice à ajouter une vidéo à Pop to Bird

    @web
    Scénario: Le validateur voit combien de vidéos la transition a sur 3
      Soit Bruno est validateur, connecté sur le site
      Et la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 1 vidéo
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose indique, pour la transition « Pop to Bird », « 1 vidéo sur 3 »

    @web
    Scénario: Le validateur n'est plus invité à ajouter une vidéo à une transition qui en a 3
      Soit Bruno est validateur, connecté sur le site
      Et la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 3 vidéos
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose indique, pour la transition « Pop to Bird », « Pop to Bird a déjà 3 vidéos, le maximum. Retire une vidéo pour en ajouter une autre. »
      Et la page de la pose n'invite pas Bruno à ajouter une vidéo à Pop to Bird

  # Page dédiée « Ajouter une vidéo à Pop to Bird » : vidéo (avec un aperçu muet quand le navigateur sait la lire),
  # légende, crédit, description de la vidéo (facultative), case des droits ; contrôles dès le choix quand le
  # navigateur sait lire la vidéo, ou lit son en-tête MP4/MOV (UX-55, si l'ADR le juge fiable), après l'envoi sinon
  # (Q300) ; progression et « Annuler l'envoi » ; « Vérification de la vidéo… » pendant les contrôles de l'envoi
  # (UX-59) ; saisie toujours conservée ; retour sur l'élément de la transition (UX-57).
  Règle: Sur le site, le validateur ajoute une vidéo depuis une page dédiée

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web
    Scénario: Après l'ajout, le site revient à la transition sur la page de la pose et annonce que la vidéo sera présentée une fois prête
      Quand Bruno ajoute sur le site, depuis la pose "Throne", à la transition « Pop to Bird » une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin »
      Alors le site présente la page de la pose "Throne", sur la transition « Pop to Bird », et annonce « Vidéo ajoutée à Pop to Bird. Elle sera présentée dès qu'elle sera prête. »

    @web
    Scénario: Le validateur ajoute sur le site une vidéo avec sa description
      Soit Bruno a ajouté sur le site, depuis la pose "Throne", à la transition « Pop to Bird » une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté », le crédit « Léa Martin » et la description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »
      Et AcroFunJam a fini de préparer la vidéo « Pop to Bird, vue de côté »
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la transition « Pop to Bird » présente la vidéo « Pop to Bird, vue de côté » avec la description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »

    @web
    Scénario: Pendant les contrôles de l'envoi, le site annonce la vérification de la vidéo
      Quand Bruno envoie sur le site, depuis la pose "Throne", à la transition « Pop to Bird » une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin »
      Alors le site annonce « Vérification de la vidéo… » jusqu'à la fin des contrôles

    @web
    Scénario: La case des droits n'est jamais cochée à l'ouverture de la page d'ajout
      Quand Bruno commence à ajouter sur le site une vidéo à la transition « Pop to Bird », depuis la pose "Throne"
      Alors la case « Je confirme que l'auteur de la vidéo a autorisé sa publication sur AcroFunJam, que chaque personne filmée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable. » n'est pas cochée
      Et le site explique « AcroFunJam garde ta confirmation avec la vidéo (ton compte et la date). »

    @web
    Plan du Scénario: Le site signale dès le choix une vidéo qu'AcroFunJam n'accepte pas (<cas>), et garde la saisie
      Quand Bruno choisit sur le site, pour la transition « Pop to Bird », <fichier>, avec la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin »
      Alors le site signale, sous le champ de la vidéo, <message>
      Et la légende « Pop to Bird, vue de côté », le crédit « Léa Martin » et la case des droits sont conservés

      Exemples:
        | cas                           | fichier                                  | message                                                                                                             |
        | format                        | un document PDF de 1 Mo                  | « Ce fichier n'est pas une vidéo MP4, MOV ou WebM. Choisis une autre vidéo. »                                       |
        | durée, tronquée à la seconde  | une vidéo MP4 de 31,7 s                  | « Cette vidéo dure 31 secondes : 30 secondes au plus. Raccourcis-la sur ton appareil, puis choisis-la de nouveau. » |
        | poids                         | une vidéo MP4 de 30 s, 120 Mo, 3840×2160 | que la vidéo dépasse 100 Mo                                                                                         |

    # UX-55 : une vidéo HEVC que le navigateur ne sait pas lire (hors Safari) n'a pas d'aperçu ; le site lit son
    # en-tête MP4/MOV pour en connaître la durée et les dimensions. Conditionné à l'ADR : si la lecture de l'en-tête
    # n'est pas jugée fiable, ce contrôle se fait après l'envoi et ce scénario est révisé.
    @web
    Scénario: Le site signale dès le choix une vidéo HEVC trop longue, même sans savoir la lire
      Quand Bruno choisit sur le site, pour la transition « Pop to Bird », une vidéo MOV HEVC de 31 s filmée par un iPhone, que le navigateur ne sait pas lire
      Alors le site signale, sous le champ de la vidéo, « Cette vidéo dure 31 secondes : 30 secondes au plus. Raccourcis-la sur ton appareil, puis choisis-la de nouveau. »

    @web
    Scénario: Une vidéo HEVC que le navigateur ne sait pas lire est ajoutée, sans aperçu
      Quand Bruno ajoute sur le site, depuis la pose "Throne", à la transition « Pop to Bird » une vidéo MOV HEVC de 12 s filmée par un iPhone, que le navigateur ne sait pas lire, avec la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin »
      Alors le site présente la page de la pose "Throne", sur la transition « Pop to Bird », et annonce « Vidéo ajoutée à Pop to Bird. Elle sera présentée dès qu'elle sera prête. »

    @web
    Plan du Scénario: Le site signale un champ manquant (<cas>), et garde la saisie
      Quand Bruno ajoute sur le site, depuis la pose "Throne", à la transition « Pop to Bird » une vidéo MP4 de 12 s, <manque>
      Alors le site signale « <message> »
      Et la saisie de la vidéo de Pop to Bird est conservée

      Exemples:
        | cas             | manque                         | message                                                                                    |
        | vidéo           | sans choisir de fichier        | Choisis une vidéo.                                                                         |
        | légende         | sans légende                   | Décris la vidéo : la légende est obligatoire.                                              |
        | crédit          | sans crédit                    | Indique le crédit de la vidéo : la personne, le duo ou le collectif à qui elle appartient. |
        | case des droits | sans cocher la case des droits | Confirme tes droits sur la vidéo et l'accord des personnes filmées.                        |

    @web
    Scénario: AcroFunJam injoignable pendant l'ajout : le site le signale et garde la saisie
      Soit AcroFunJam est injoignable
      Quand Bruno ajoute sur le site, depuis la pose "Throne", à la transition « Pop to Bird » une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin »
      Alors le site signale « La vidéo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. »
      Et la vidéo choisie, la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin » sont conservés

    # Comme pour une photo (décision du 2026-11-23) : le fichier ne survit pas à la reconnexion.
    @web
    Scénario: Session expirée pendant l'envoi : le site demande de se reconnecter et garde la légende et le crédit
      Soit la session de Bruno a expiré
      Quand Bruno ajoute sur le site, depuis la pose "Throne", à la transition « Pop to Bird » une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin »
      Alors le site signale « Ta session a expiré. Connecte-toi de nouveau, puis choisis de nouveau la vidéo. »
      Et la légende « Pop to Bird, vue de côté » et le crédit « Léa Martin » sont conservés

    @web
    Scénario: Quitter la page d'ajout avec une saisie demande de confirmer l'abandon
      Quand Bruno commence à ajouter sur le site une vidéo à la transition « Pop to Bird », depuis la pose "Throne", avec la légende « Pop to Bird, vue de côté »
      Et Bruno annule l'ajout
      Alors le site demande « Abandonner cette vidéo ? Ta saisie sera perdue. », avec « Abandonner » et « Continuer l'ajout »

  # Q298 : repères « En préparation » et « Impossible à préparer » (UX-59), et message d'échec, pour les validateurs et
  # les administrateurs seulement. UX-52 : le repère se met à jour sans recharger la page.
  Règle: Sur le site, le validateur voit les vidéos en préparation et celles qui n'ont pas pu être préparées

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web
    Scénario: Une vidéo en préparation est marquée « En préparation » pour le validateur
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté », encore en préparation
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la transition « Pop to Bird » présente à Bruno la vidéo « Pop to Bird, vue de côté » marquée « En préparation »

    @web
    Scénario: Une vidéo prête pendant que le validateur consulte la page n'est plus marquée « En préparation », sans recharger la page
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Pop to Bird, vue de côté », encore en préparation
      Et Bruno consulte la pose "Throne" du catalogue
      Quand AcroFunJam finit de préparer la vidéo « Pop to Bird, vue de côté »
      Alors la transition « Pop to Bird » présente à Bruno la vidéo « Pop to Bird, vue de côté », sans le repère « En préparation », sans qu'il recharge la page

    @web
    Scénario: Une vidéo qui n'a pas pu être préparée est marquée « Impossible à préparer » pour le validateur
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s endommagée, avec la légende « Pop to Bird, vue de côté »
      Et AcroFunJam n'a pas pu préparer la vidéo « Pop to Bird, vue de côté »
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la transition « Pop to Bird » présente à Bruno la vidéo « Pop to Bird, vue de côté » marquée « Impossible à préparer »
      Et la transition « Pop to Bird » signale à Bruno « La vidéo « Pop to Bird, vue de côté » n'a pas pu être préparée. Retire-la, puis envoie-la de nouveau ou choisis-en une autre. »

    @web
    Scénario: Le validateur peut retirer une vidéo qui n'a pas pu être préparée
      Soit Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s endommagée, avec la légende « Pop to Bird, vue de côté »
      Et AcroFunJam n'a pas pu préparer la vidéo « Pop to Bird, vue de côté »
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose propose à Bruno de retirer la vidéo « Pop to Bird, vue de côté »

  # « Modifier » (légende, crédit et description, sur place) et « Retirer » sous chaque vidéo, noms accessibles suffixés
  # de la légende ; retrait après une confirmation en place qui dit sa conséquence (Q238).
  Règle: Sur le site, le validateur gère chaque vidéo depuis la page de la pose

    Contexte:
      Soit Bruno est validateur, connecté sur le site
      Et Bruno a ajouté à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo MP4 de 12 s, avec la légende « Vue de face » et le crédit « Léa Martin »

    @web
    Scénario: Le validateur modifie sur place la légende et le crédit d'une vidéo
      Quand Bruno modifie sur le site, depuis la pose "Throne", la vidéo « Vue de face » de la transition « Pop to Bird » avec la légende « Pop to Bird, démonstration de face » et le crédit « Hugo Bernard »
      Alors la transition « Pop to Bird » présente la vidéo « Pop to Bird, démonstration de face », créditée « Vidéo : Hugo Bernard »

    @web
    Scénario: Le validateur ajoute sur place une description à une vidéo
      Quand Bruno modifie sur le site, depuis la pose "Throne", la vidéo « Vue de face » de la transition « Pop to Bird » avec la description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »
      Alors la transition « Pop to Bird » présente la vidéo « Vue de face » avec la description « La base pousse les pieds du flyer, qui passe de l'assise à l'horizontale, face au sol. »

    @web
    Scénario: Retirer la dernière vidéo d'une transition annonce qu'elle n'aura plus de vidéo
      Quand Bruno commence à retirer sur le site, depuis la pose "Throne", la vidéo « Vue de face » de la transition « Pop to Bird »
      Alors le site demande « Retirer cette vidéo de Pop to Bird ? » et précise « Pop to Bird n'aura plus de vidéo, et celle-ci ne pourra pas être récupérée. »

    @web
    Scénario: Après confirmation, la vidéo retirée n'est plus présentée
      Quand Bruno retire sur le site, depuis la pose "Throne", la vidéo « Vue de face » de la transition « Pop to Bird », après confirmation
      Alors la transition « Pop to Bird » ne présente aucune vidéo

    # Une washing machine figure dans les deux sections de la page de sa pose (story 7), comme pour l'étiquetage.
    @web
    Scénario: Une vidéo ajoutée à une washing machine depuis une section est présentée dans les deux sections
      Soit la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Et Bruno a ajouté sur le site, depuis la section des transitions depuis la pose "Star", à la transition « Ninja Star » une vidéo MP4 de 12 s, avec la légende « Ninja Star, deux tours »
      Et AcroFunJam a fini de préparer la vidéo « Ninja Star, deux tours »
      Quand Bruno consulte la pose "Star" du catalogue
      Alors les transitions depuis la pose "Star" présentent la transition « Ninja Star » avec la vidéo « Ninja Star, deux tours »
      Et les transitions vers la pose "Star" présentent la transition « Ninja Star » avec la vidéo « Ninja Star, deux tours »
