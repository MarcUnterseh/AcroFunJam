# language: fr
@Integration
Fonctionnalité: Ajouter des photos à une pose publiée
  Afin que chacun reconnaisse une pose d'un coup d'œil, ce que son nom et ses difficultés ne suffisent pas à montrer
  En tant que validateur ou administrateur
  Je veux téléverser directement des photos d'une pose publiée, les décrire, en choisir la principale et les retirer

  # Story 10 « Photos des poses », volet Catalogue : ajout direct. Validée le 2026-11-20 par le porteur du produit, avec
  # les avis de l'expert acroyoga (AY-8 à AY-15) et de l'ux-expert (UX-15 à UX-29) : decouverte.md, « Story 10 Photos
  # des poses ». Scénarios @wip : pas encore implémentés. Prérequis : l'ADR de stockage des photos (aucun scénario ne
  # dépend de ses choix). La présentation (page d'une pose, vignette, agrandissement) est dans
  # catalogue/consulter-les-photos-des-poses.feature.
  #
  # Décisions principales :
  # - les photos viennent de l'équipe et de la communauté ; dans cette story, seuls un validateur et un administrateur
  #   les ajoutent, directement (capacité « gérer les photos ») ; la communauté proposera avec la story 11 (Q246, Q247) ;
  # - pose publiée seulement ; formats JPEG, PNG, WebP, HEIC reconnus au contenu ; 10 Mo au plus pour l'API ; au moins
  #   800 pixels sur le plus petit côté (Q254 à Q256) ; le site réduit avant l'envoi une photo plus lourde qu'il sait
  #   lire (JPEG, environ 2400 pixels sur le plus grand côté) ;
  # - texte alternatif obligatoire, 200 caractères au plus, sur le modèle de la charte : position de la base, prises,
  #   orientation du flyer, vue (Q251) ;
  # - crédit : l'auteur de la photo seulement, obligatoire, 100 caractères au plus ; pseudonyme ou collectif acceptés,
  #   « inconnu » refusé ; les personnes photographiées restent anonymes (Q252) ;
  # - une seule case, jamais cochée par défaut : « Je confirme que l'auteur de la photo a autorisé sa publication sur
  #   AcroFunJam, que chaque personne photographiée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable. »,
  #   gardée avec le compte et la date (Q253) ;
  # - métadonnées retirées, photo redressée, fichier d'origine jamais présenté (Q257, Q258) ;
  # - au plus 5 photos ; ordre d'ajout, la première est la principale, un validateur en choisit une autre (Q248, Q249) ;
  # - retrait immédiat ; texte alternatif et crédit modifiables ; ajouter une photo ne change pas la pose (Q259, Q260,
  #   Q264).
  # La charte des photos (vue de profil, pose tenue, prises visibles, deux personnes, pas de trio…) est une règle de
  # validation, sans scénario.
  #
  # Fichiers des scénarios : des fixtures nommées par leur format, leur poids et leurs dimensions (« une photo JPEG de
  # 2 Mo de 1600×1200 »). Sauf mention contraire, une photo est ajoutée avec un texte alternatif, un crédit et la case
  # des droits cochée. Les textes alternatifs courts (« Bird vue de face ») abrègent les exemples ; la charte demande
  # le modèle en quatre parties.
  #
  # Personnages : Alice est utilisatrice, Bruno validateur, Paul administrateur.
  # Hors périmètre : proposer une photo (utilisateur), photo d'une proposition de pose, photos des transitions, photos
  # dans le générateur de flow, écran mobile, signalement d'un contenu, vidéos.

  Contexte:
    Soit les poses publiées "Bird", "Throne", "Folded Leaf" et "Reverse Bird" dans le catalogue

  Règle: Un validateur ou un administrateur ajoute directement une photo à une pose publiée

    @api
    Plan du Scénario: Un <rôle> ajoute une photo à une pose publiée, qui la présente aussitôt
      Soit Bruno est <rôle>
      Et Bruno a ajouté à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Bird : la base, allongée sur le dos, a les pieds sur les hanches du flyer ; mains dans les mains ; le flyer, face au sol, à l'horizontale ; vue de profil. » et le crédit « Léa Martin »
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la page présente la pose "Bird" avec exactement les photos :
        | texte alternatif                                                                                                                                   | crédit     |
        | Bird : la base, allongée sur le dos, a les pieds sur les hanches du flyer ; mains dans les mains ; le flyer, face au sol, à l'horizontale ; vue de profil. | Léa Martin |

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  Règle: Seul un validateur ou un administrateur gère les photos d'une pose

    @api
    Scénario: Un utilisateur ne peut pas ajouter une photo à une pose publiée
      Soit Alice est utilisateur
      Quand Alice ajoute à la pose "Throne" une photo JPEG de 2 Mo de 1600×1200
      Alors l'ajout est refusé car seul un validateur ou un administrateur gère les photos

    @api
    Scénario: Un visiteur ne peut pas ajouter une photo à une pose publiée
      Quand un visiteur ajoute à la pose "Throne" une photo JPEG de 2 Mo de 1600×1200
      Alors l'ajout est refusé car il faut être connecté

    @api
    Scénario: Un utilisateur ne peut pas retirer une photo d'une pose
      Soit Bruno est validateur
      Et Bruno a ajouté à la pose "Throne" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Throne vu de profil »
      Et Alice est utilisateur
      Quand Alice retire de la pose "Throne" la photo « Throne vu de profil »
      Alors le retrait est refusé car seul un validateur ou un administrateur gère les photos

  Règle: Seule une pose publiée reçoit une photo

    @api
    Scénario: Une pose inconnue du catalogue ne peut pas recevoir de photo
      Soit Bruno est validateur
      Quand Bruno ajoute à une pose qui n'existe pas dans le catalogue une photo JPEG de 2 Mo de 1600×1200
      Alors l'ajout est impossible car la pose est introuvable dans le catalogue

  # Q254 : le format est reconnu au contenu du fichier, pas à son nom. HEIC (photos des iPhone) est converti à
  # l'arrivée, sous réserve de faisabilité confirmée par l'ADR de stockage.
  Règle: Une photo est un fichier JPEG, PNG, WebP ou HEIC

    Contexte:
      Soit Bruno est validateur

    @api
    Plan du Scénario: Une photo <format> est acceptée
      Quand Bruno ajoute à la pose "Folded Leaf" une photo <format> de 2 Mo de 1600×1200
      Alors la pose "Folded Leaf" présente 1 photo

      Exemples:
        | format |
        | JPEG   |
        | PNG    |
        | WebP   |
        | HEIC   |

    @api
    Plan du Scénario: Un fichier qui n'est pas une photo d'un format accepté rend l'ajout impossible (<cas>)
      Quand Bruno ajoute à la pose "Folded Leaf" <fichier>
      Alors l'ajout est impossible car le fichier n'est pas une photo JPEG, PNG, WebP ou HEIC

      Exemples:
        | cas                         | fichier                                    |
        | GIF animé                   | un GIF animé de 2 Mo de 800×800            |
        | document PDF                | un document PDF de 1 Mo                    |
        | vidéo                       | une vidéo MP4 de 8 Mo                      |
        | texte nommé comme une photo | un fichier texte nommé « folded-leaf.jpg » |

    @api
    Scénario: Une photo sans fichier ne peut pas être ajoutée
      Quand Bruno ajoute à la pose "Folded Leaf" une photo sans fichier
      Alors l'ajout est impossible car le fichier de la photo est obligatoire

  # Q255 et décision 5 : 10 Mo est la limite de l'API ; le site réduit avant l'envoi ce qu'il sait lire (scénario @web
  # plus bas).
  Règle: L'API accepte une photo de 10 Mo au plus

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une photo de 10 Mo est acceptée
      Quand Bruno ajoute à la pose "Reverse Bird" une photo JPEG de 10 Mo de 4000×3000
      Alors la pose "Reverse Bird" présente 1 photo

    @api
    Scénario: Une photo de plus de 10 Mo rend l'ajout impossible
      Quand Bruno ajoute à la pose "Reverse Bird" une photo JPEG de 12 Mo de 6000×4000
      Alors l'ajout est impossible car la photo dépasse 10 Mo

  # Q256 : assez grande pour la page d'une pose ; pas de maximum, AcroFunJam la redimensionne (Q258).
  Règle: Une photo mesure au moins 800 pixels sur son plus petit côté

    Contexte:
      Soit Bruno est validateur

    @api
    Plan du Scénario: Une photo de <dimensions> est acceptée
      Quand Bruno ajoute à la pose "Throne" une photo JPEG de 2 Mo de <dimensions>
      Alors la pose "Throne" présente 1 photo

      Exemples:
        | dimensions |
        | 1200×800   |
        | 800×1200   |
        | 6000×4000  |

    @api
    Scénario: Une photo trop petite rend l'ajout impossible
      Quand Bruno ajoute à la pose "Throne" une photo JPEG de 1 Mo de 1200×799
      Alors l'ajout est impossible car la photo doit mesurer au moins 800 pixels sur son plus petit côté

  # Q251 et charte des photos : position de la base, prises, orientation du flyer, vue.
  Règle: Le texte alternatif est obligatoire, sans espaces superflus, et compte au plus 200 caractères

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Les espaces superflus du texte alternatif sont retirés
      Quand Bruno ajoute à la pose "Folded Leaf" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif «   Folded Leaf : la base, allongée sur le dos ;   ses pieds dans les plis de l'aine du flyer ; le flyer replié, buste relâché vers le sol ; vue de profil.   »
      Alors la pose "Folded Leaf" présente la photo « Folded Leaf : la base, allongée sur le dos ; ses pieds dans les plis de l'aine du flyer ; le flyer replié, buste relâché vers le sol ; vue de profil. »

    @api
    Scénario: Un texte alternatif de 200 caractères est accepté
      Quand Bruno ajoute à la pose "Folded Leaf" une photo JPEG de 2 Mo de 1600×1200, avec un texte alternatif de 200 caractères
      Alors la pose "Folded Leaf" présente 1 photo

    @api
    Scénario: Un texte alternatif de 201 caractères rend l'ajout impossible
      Quand Bruno ajoute à la pose "Folded Leaf" une photo JPEG de 2 Mo de 1600×1200, avec un texte alternatif de 201 caractères
      Alors l'ajout est impossible car le texte alternatif est trop long

    @api
    Scénario: Une photo sans texte alternatif ne peut pas être ajoutée
      Quand Bruno ajoute à la pose "Folded Leaf" une photo JPEG de 2 Mo de 1600×1200, sans texte alternatif
      Alors l'ajout est impossible car le texte alternatif est obligatoire

    @api
    Scénario: Un texte alternatif fait seulement d'espaces vaut absence de texte alternatif
      Quand Bruno ajoute à la pose "Folded Leaf" une photo JPEG de 2 Mo de 1600×1200, avec un texte alternatif fait seulement d'espaces
      Alors l'ajout est impossible car le texte alternatif est obligatoire

  # Q252, décision 3 : le crédit nomme l'auteur de la photo, jamais les personnes photographiées. « Inconnu » est
  # comparé avec la clé de comparaison du nom (casse, accents, ponctuation), sur la clé entière ; valeurs refusées :
  # inconnu(e), auteur/auteure/autrice inconnu(e), photographe inconnu(e), anonyme, unknown, anonymous (decouverte.md).
  Règle: Le crédit nomme l'auteur de la photo : obligatoire, sans espaces superflus, 100 caractères au plus, jamais « inconnu »

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Les espaces superflus du crédit sont retirés
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec le crédit «   Léa   Martin  »
      Alors la photo de la pose "Bird" est créditée « Léa Martin »

    @api
    Plan du Scénario: Un crédit en pseudonyme ou au nom d'un collectif est accepté (<cas>)
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec le crédit « <crédit> »
      Alors la photo de la pose "Bird" est créditée « <crédit> »

      Exemples:
        | cas        | crédit             |
        | pseudonyme | Lulu Acro          |
        | collectif  | Collectif AcroLyon |

    @api
    Plan du Scénario: Un crédit qui ne nomme pas l'auteur rend l'ajout impossible (« <crédit> »)
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec le crédit « <crédit> »
      Alors l'ajout est impossible car le crédit doit nommer l'auteur de la photo

      Exemples:
        | crédit         |
        | inconnu        |
        | Inconnu        |
        | Auteur inconnu |

    @api
    Scénario: Une photo sans crédit ne peut pas être ajoutée
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, sans crédit
      Alors l'ajout est impossible car le crédit de la photo est obligatoire

    @api
    Scénario: Un crédit de 101 caractères rend l'ajout impossible
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec un crédit de 101 caractères
      Alors l'ajout est impossible car le crédit de la photo est trop long

  # Q253, décision 2 : une seule case, deux engagements et les mineurs ; gardée avec le compte et la date, jamais
  # présentée.
  Règle: Ajouter une photo exige de confirmer l'autorisation de l'auteur, l'accord des personnes photographiées et l'absence de mineur reconnaissable

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une photo ajoutée sans la confirmation ne peut pas être ajoutée
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, sans cocher la case des droits
      Alors l'ajout est impossible car il faut confirmer les droits sur la photo et l'accord des personnes photographiées

    @api
    Scénario: La confirmation est gardée avec la photo, avec le compte et la date
      Quand Bruno ajoute le 2026-11-21 à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200
      Alors la photo de la pose "Bird" garde la confirmation des droits donnée par Bruno le 2026-11-21

  # Q257, Q258 : rien de ce que contient le fichier d'origine en dehors de l'image ne sort d'AcroFunJam.
  Règle: AcroFunJam retire toutes les métadonnées d'une photo et la présente redressée

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une photo présentée ne contient plus la position GPS de la prise de vue
      Quand Bruno ajoute à la pose "Reverse Bird" une photo JPEG de 3 Mo de 4000×3000 avec une position GPS et le modèle de l'appareil
      Alors la photo présentée de la pose "Reverse Bird" ne contient aucune métadonnée

    @api
    Scénario: Une photo prise en portrait par un téléphone est présentée en portrait
      Quand Bruno ajoute à la pose "Reverse Bird" une photo JPEG de 3 Mo de 4000×3000 marquée « à pivoter de 90° »
      Alors la photo présentée de la pose "Reverse Bird" est en portrait

  # Q248 : une pose se montre sous quelques angles.
  Règle: Une pose a au plus 5 photos

    Contexte:
      Soit Bruno est validateur

    @api
    Scénario: Une sixième photo ne peut pas être ajoutée à une pose
      Soit la pose "Bird" a déjà 5 photos
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200
      Alors l'ajout est impossible car la pose a déjà 5 photos

    @api
    Scénario: Retirer une photo libère une place pour une autre
      Soit la pose "Bird" a déjà 5 photos, dont « Bird vue de face »
      Et Bruno a retiré de la pose "Bird" la photo « Bird vue de face »
      Quand Bruno ajoute à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Bird vue de profil »
      Alors la pose "Bird" présente 5 photos, dont « Bird vue de profil »

  # Q249 : la photo principale sert de vignette sur la carte du catalogue ; la charte la veut de profil, base et flyer
  # entiers, jamais une photo spectaculaire.
  Règle: Les photos d'une pose sont présentées dans l'ordre où elles ont été ajoutées, la photo principale en premier

    Contexte:
      Soit Bruno est validateur
      Et Bruno a ajouté à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Bird vue de face »
      Et Bruno a ajouté à la pose "Bird" une photo PNG de 3 Mo de 1600×1200, avec le texte alternatif « Bird vue de profil »

    @api
    Scénario: La première photo ajoutée est la photo principale
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la page présente les photos de la pose "Bird" dans cet ordre : « Bird vue de face », « Bird vue de profil »
      Et la photo principale de la pose "Bird" est « Bird vue de face »

    @api
    Scénario: Le validateur choisit une autre photo principale, qui passe en premier
      Soit Paul est administrateur
      Et Paul a choisi « Bird vue de profil » comme photo principale de la pose "Bird"
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la page présente les photos de la pose "Bird" dans cet ordre : « Bird vue de profil », « Bird vue de face »

    @api
    Scénario: Retirer la photo principale fait de la suivante la photo principale
      Soit Bruno a retiré de la pose "Bird" la photo « Bird vue de face »
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la photo principale de la pose "Bird" est « Bird vue de profil »

  # Q259, Q267 : retrait immédiat, sans motif ni historique ; c'est aussi la réponse à une demande de retrait (une seule
  # suffit, de la base ou du flyer), transmise par l'adresse de contact du site pour l'instant.
  Règle: Un validateur ou un administrateur retire une photo d'une pose

    Contexte:
      Soit Bruno est validateur
      Et Bruno a ajouté à la pose "Throne" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Throne vu de profil »

    @api
    Plan du Scénario: Un <rôle> retire une photo, qui n'est plus présentée
      Soit Paul est <rôle>
      Et Paul a retiré de la pose "Throne" la photo « Throne vu de profil »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page présente la pose "Throne" sans photo

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api
    Scénario: Une photo retirée n'est plus accessible, même par son adresse
      Soit Bruno a retiré de la pose "Throne" la photo « Throne vu de profil »
      Quand un visiteur ouvre l'adresse de la photo retirée « Throne vu de profil »
      Alors la photo est introuvable

    @api
    Scénario: Retirer une photo déjà retirée est impossible
      Soit Bruno a retiré de la pose "Throne" la photo « Throne vu de profil »
      Quand Bruno retire de la pose "Throne" la photo « Throne vu de profil »
      Alors le retrait est impossible car la photo n'est plus dans le catalogue

  # Q260 : corriger une description ne demande pas de téléverser de nouveau ; changer de fichier, c'est retirer, puis
  # ajouter.
  Règle: Un validateur ou un administrateur change le texte alternatif et le crédit d'une photo

    Contexte:
      Soit Bruno est validateur
      Et Bruno a ajouté à la pose "Folded Leaf" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Photo de Folded Leaf » et le crédit « Lea Martin »

    @api
    Scénario: Le validateur corrige le texte alternatif d'une photo
      Soit Bruno a changé le texte alternatif de la photo « Photo de Folded Leaf » en « Folded Leaf : la base, allongée sur le dos ; ses pieds dans les plis de l'aine du flyer ; le flyer replié, buste relâché vers le sol ; vue de profil. »
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec la photo « Folded Leaf : la base, allongée sur le dos ; ses pieds dans les plis de l'aine du flyer ; le flyer replié, buste relâché vers le sol ; vue de profil. »

    @api
    Scénario: Le validateur corrige le crédit d'une photo
      Soit Bruno a changé le crédit de la photo « Photo de Folded Leaf » en « Léa Martin »
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la photo « Photo de Folded Leaf » de la pose "Folded Leaf" est créditée « Léa Martin »

    @api
    Scénario: Un texte alternatif corrigé suit les mêmes règles qu'à l'ajout
      Quand Bruno change le texte alternatif de la photo « Photo de Folded Leaf » en un texte fait seulement d'espaces
      Alors le changement est impossible car le texte alternatif est obligatoire

  # Q264 : les photos ne font pas partie du contenu d'une modification de pose (story 6) ; contrairement à
  # l'étiquetage direct (story 9a), elles ne changent pas la version de la pose.
  Règle: Ajouter une photo ne change pas la pose, même quand une modification de la pose est en attente

    Contexte:
      Soit Alice est utilisateur
      Et Bruno est validateur

    @api
    Scénario: Une photo s'ajoute à une pose dont une modification est en attente
      Soit Alice a proposé de modifier la pose "Reverse Bird" en changeant la difficulté flyer en "avancé"
      Quand Bruno ajoute à la pose "Reverse Bird" une photo JPEG de 2 Mo de 1600×1200
      Alors la pose "Reverse Bird" présente 1 photo

    @api
    Scénario: Une modification commencée avant l'ajout d'une photo reste recevable
      Soit Alice a commencé à modifier la pose "Reverse Bird"
      Et Bruno a ajouté entre-temps à la pose "Reverse Bird" une photo JPEG de 2 Mo de 1600×1200
      Quand Alice propose la modification commencée en changeant la difficulté flyer en "avancé"
      Alors la proposition de modification de la pose "Reverse Bird" par Alice est en attente de validation

    @api
    Scénario: Une pose renommée garde ses photos
      Soit Bruno a ajouté à la pose "Reverse Bird" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Reverse Bird vu de profil »
      Et Bruno a proposé de modifier la pose "Reverse Bird" en changeant le nom en "Reverse Bird (L-base)"
      Quand un visiteur consulte la pose "Reverse Bird (L-base)" du catalogue
      Alors la page présente la pose "Reverse Bird (L-base)" avec la photo « Reverse Bird vu de profil »

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site (UX-15 à UX-29)
  # ---------------------------------------------------------------------------------------------------

  # Révisé le 2026-11-20 par le porteur du produit : seule la photo principale est en tête de la page ; les autres
  # photos sont dans la section « Autres photos de <pose> », tout en bas, après les transitions. Le pied de gestion de
  # la photo principale reste sous elle, en haut ; celui des autres photos, l'invitation « Ajouter une photo » et le
  # repère « 2 photos sur 5 » sont en bas. Pose sans photo : l'invitation est en haut, à la place de la photo
  # principale. L'invitation et le repère suivent la dernière photo présentée : sous la photo principale quand la pose
  # n'a qu'une photo (pas de section du bas), dans la section du bas sinon (galerie-photos.md, 2026-11-20).
  Règle: Sur le site, un validateur ou un administrateur est invité à ajouter une photo, jusqu'à 5

    @web
    Scénario: Un validateur est invité, en tête de la page, à ajouter la première photo d'une pose
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose indique en tête, à la place de la photo principale, « Throne n'a pas encore de photo. »
      Et la page de la pose invite Bruno à « Ajouter une photo de Throne », en tête de la page

    @web
    Scénario: Pour une pose qui n'a que sa photo principale, l'invitation à ajouter une photo est sous elle
      Soit Bruno est validateur, connecté sur le site
      Et la pose "Throne" a déjà 1 photo
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose invite Bruno à « Ajouter une photo de Throne », sous la photo principale
      Et la page de la pose indique « 1 photo sur 5 »
      Et la page ne présente pas de section « Autres photos de Throne »

    @web
    Scénario: Un utilisateur n'est pas invité à ajouter une photo
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte la pose "Throne" du catalogue
      Alors la page de la pose n'invite pas Alice à ajouter une photo de Throne

    @web
    Scénario: Le validateur voit combien de photos la pose a sur 5
      Soit Bruno est validateur, connecté sur le site
      Et la pose "Bird" a déjà 2 photos
      Quand Bruno consulte la pose "Bird" du catalogue
      Alors la section « Autres photos de Bird » indique « 2 photos sur 5 »

    @web
    Scénario: Le validateur n'est plus invité à ajouter une photo à une pose qui en a 5
      Soit Bruno est validateur, connecté sur le site
      Et la pose "Bird" a déjà 5 photos
      Quand Bruno consulte la pose "Bird" du catalogue
      Alors la section « Autres photos de Bird » indique « Bird a déjà 5 photos, le maximum. Retire une photo pour en ajouter une autre. »
      Et la page de la pose n'invite pas Bruno à ajouter une photo de Bird

    @web
    Scénario: L'invitation à ajouter une photo revient quand le validateur retire la cinquième
      Soit Bruno est validateur, connecté sur le site
      Et la pose "Bird" a déjà 5 photos, dont « Bird vue de face »
      Quand Bruno retire sur le site la photo « Bird vue de face » de la pose "Bird", après confirmation
      Alors la section « Autres photos de Bird » invite Bruno à « Ajouter une photo de Bird »

  # UX-16 à UX-23 : page dédiée « Ajouter une photo de Throne », contrôles dès le choix quand le navigateur sait lire
  # la photo, saisie toujours conservée, retour à la page de la pose et annonce après l'ajout.
  Règle: Sur le site, le validateur ajoute une photo depuis une page dédiée

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web
    Scénario: Après l'ajout, le site revient à la page de la pose et annonce la photo ajoutée
      Quand Bruno ajoute sur le site, depuis la pose "Throne", une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Throne : la base, allongée sur le dos, jambes à la verticale, tient les chevilles du flyer ; le flyer, assis sur ses pieds, genoux pliés ; vue de profil. » et le crédit « Léa Martin »
      Alors le site présente la page de la pose "Throne" et annonce « Photo ajoutée à Throne. »
      Et la page présente la pose "Throne" avec la photo « Throne : la base, allongée sur le dos, jambes à la verticale, tient les chevilles du flyer ; le flyer, assis sur ses pieds, genoux pliés ; vue de profil. », créditée « Photo : Léa Martin »

    @web
    Scénario: La case des droits n'est jamais cochée à l'ouverture de la page d'ajout
      Quand Bruno commence à ajouter sur le site une photo de la pose "Throne"
      Alors la case « Je confirme que l'auteur de la photo a autorisé sa publication sur AcroFunJam, que chaque personne photographiée l'a acceptée, et qu'aucune personne mineure n'y est reconnaissable. » n'est pas cochée
      Et le site explique « AcroFunJam garde ta confirmation avec la photo (ton compte et la date). »

    # Décision 5 : réduite en JPEG, environ 2400 pixels sur le plus grand côté, au lieu d'être refusée.
    @web
    Scénario: Le site réduit avant l'envoi une photo trop lourde qu'il sait lire
      Quand Bruno ajoute sur le site, depuis la pose "Throne", une photo JPEG de 12 Mo de 6000×4000
      Alors le site annonce « Photo ajoutée à Throne. »
      Et la pose "Throne" présente 1 photo

    @web
    Plan du Scénario: Le site signale dès le choix un fichier qu'AcroFunJam n'accepte pas (<cas>), et garde la saisie
      Quand Bruno choisit sur le site, pour la pose "Throne", <fichier>, avec le texte alternatif « Throne vu de profil » et le crédit « Léa Martin »
      Alors le site signale, sous le champ de la photo, <message>
      Et le texte alternatif « Throne vu de profil », le crédit « Léa Martin » et la case des droits sont conservés

      Exemples:
        | cas                         | fichier                                                         | message                                                                                                                      |
        | format                      | un document PDF de 1 Mo                                         | « Ce fichier n'est pas une photo JPEG, PNG, WebP ou HEIC. Choisis une autre photo. »                                         |
        | dimensions                  | une photo JPEG de 1 Mo de 1200×799                              | « Cette photo mesure 1200 × 799 pixels : il faut au moins 800 pixels sur le plus petit côté. Choisis une photo plus grande. » |
        | poids, photo illisible      | une photo HEIC de 12 Mo que le navigateur ne sait pas lire      | que la photo dépasse 10 Mo                                                                                                   |

    @web
    Plan du Scénario: Le site signale un champ manquant (<cas>), et garde la saisie
      Quand Bruno ajoute sur le site, depuis la pose "Throne", une photo JPEG de 2 Mo de 1600×1200, <manque>
      Alors le site signale « <message> »
      Et la saisie de la photo de Throne est conservée

      Exemples:
        | cas              | manque                         | message                                                                   |
        | photo            | sans choisir de fichier        | Choisis une photo.                                                        |
        | texte alternatif | sans texte alternatif          | Décris la photo : le texte alternatif est obligatoire.                    |
        | crédit           | sans crédit                    | Indique le crédit de la photo : le nom de la personne qui l'a prise.      |
        | case des droits  | sans cocher la case des droits | Confirme tes droits sur la photo et l'accord des personnes photographiées. |

    @web
    Scénario: AcroFunJam injoignable pendant l'ajout : le site le signale et garde la saisie
      Soit AcroFunJam est injoignable
      Quand Bruno ajoute sur le site, depuis la pose "Throne", une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Throne vu de profil » et le crédit « Léa Martin »
      Alors le site signale « La photo n'a pas pu être envoyée : impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie. »
      Et la photo choisie, le texte alternatif « Throne vu de profil » et le crédit « Léa Martin » sont conservés

    @web
    Scénario: Session expirée pendant l'envoi : le site demande de se reconnecter et garde la saisie
      Soit la session de Bruno a expiré
      Quand Bruno ajoute sur le site, depuis la pose "Throne", une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Throne vu de profil » et le crédit « Léa Martin »
      Alors le site signale « Ta session a expiré. Connecte-toi de nouveau, puis choisis de nouveau la photo. »
      Et la photo choisie, le texte alternatif « Throne vu de profil » et le crédit « Léa Martin » sont conservés

    @web
    Scénario: Quitter la page d'ajout avec une saisie demande de confirmer l'abandon
      Quand Bruno commence à ajouter sur le site une photo de la pose "Throne", avec le texte alternatif « Throne vu de profil »
      Et Bruno annule l'ajout
      Alors le site demande « Abandonner cette photo ? Ta saisie sera perdue. », avec « Abandonner » et « Continuer l'ajout »

  # UX-24 à UX-27 : actions sous chaque photo, noms accessibles suffixés du texte alternatif.
  Règle: Sur le site, le validateur gère chaque photo depuis la page de la pose

    Contexte:
      Soit Bruno est validateur, connecté sur le site
      Et Bruno a ajouté à la pose "Bird" une photo JPEG de 2 Mo de 1600×1200, avec le texte alternatif « Bird vue de face » et le crédit « Léa Martin »
      Et Bruno a ajouté à la pose "Bird" une photo PNG de 3 Mo de 1600×1200, avec le texte alternatif « Bird vue de profil » et le crédit « Léa Martin »

    @web
    Scénario: Le validateur voit quelle photo est la photo principale
      Quand Bruno consulte la pose "Bird" du catalogue
      Alors la photo « Bird vue de face » est marquée « Photo principale »

    # Révisé le 2026-11-20 : la gestion de la photo principale reste sous elle, en haut ; celle des autres, en bas.
    @web
    Scénario: La gestion de la photo principale est en tête de la page, celle des autres photos dans la section du bas
      Quand Bruno consulte la pose "Bird" du catalogue
      Alors la page de la pose propose, sous la photo principale « Bird vue de face », de la modifier ou de la retirer
      Et la section « Autres photos de Bird » propose, pour la photo « Bird vue de profil », de la choisir comme photo principale, de la modifier ou de la retirer

    @web
    Scénario: Le validateur choisit la photo principale depuis la page de la pose
      Quand Bruno choisit sur le site « Bird vue de profil » comme photo principale de la pose "Bird"
      Alors la page présente les photos de la pose "Bird" dans cet ordre : « Bird vue de profil », « Bird vue de face »
      Et la photo « Bird vue de profil » est marquée « Photo principale »

    @web
    Scénario: Le validateur modifie sur place le texte alternatif et le crédit d'une photo
      Quand Bruno modifie sur le site la photo « Bird vue de face » de la pose "Bird" avec le texte alternatif « Bird : la base, allongée sur le dos, a les pieds sur les hanches du flyer ; mains dans les mains ; le flyer, face au sol, à l'horizontale ; vue de face. » et le crédit « Hugo Bernard »
      Alors la page présente la pose "Bird" avec la photo « Bird : la base, allongée sur le dos, a les pieds sur les hanches du flyer ; mains dans les mains ; le flyer, face au sol, à l'horizontale ; vue de face. », créditée « Photo : Hugo Bernard »

    @web
    Scénario: Retirer la photo principale annonce que la suivante deviendra la photo principale et la vignette
      Quand Bruno commence à retirer sur le site la photo « Bird vue de face » de la pose "Bird"
      Alors le site demande « Retirer cette photo de Bird ? » et précise « La photo suivante deviendra la photo principale et la vignette du catalogue. »

    @web
    Scénario: Retirer la dernière photo annonce que la pose n'aura plus de photo
      Soit Bruno a retiré de la pose "Bird" la photo « Bird vue de profil »
      Quand Bruno commence à retirer sur le site la photo « Bird vue de face » de la pose "Bird"
      Alors le site demande « Retirer cette photo de Bird ? » et précise « Bird n'aura plus de photo. »

    @web
    Scénario: Après confirmation, la photo retirée n'est plus présentée
      Quand Bruno retire sur le site la photo « Bird vue de profil » de la pose "Bird", après confirmation
      Alors la page présente les photos de la pose "Bird" dans cet ordre : « Bird vue de face »
