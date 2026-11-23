# language: fr
@Integration
Fonctionnalité: Lier des vidéos à une transition publiée
  Afin que chacun voie comment se fait une transition, ce que ni ses difficultés ni sa description ne montrent
  En tant que validateur ou administrateur
  Je veux lier directement à une transition publiée des vidéos hébergées sur YouTube, Vimeo ou Instagram, et les retirer

  # ATTENTION : STORY ULTÉRIEURE (story 12), NON VALIDÉE. Ces scénarios reposent sur les RECOMMANDATIONS de l'analyse
  # (Q225 à Q245), pas encore tranchées par le porteur du produit. Ils sont tous @wip. Le 2026-11-20, le porteur du
  # produit a choisi de commencer par les photos des poses (Q224, story 10) ; les vidéos viennent après. À revoir
  # avant d'implémenter : decouverte.md, « Story 10 Photos des poses », sous-section « Story 12 Lier des vidéos à une
  # transition (story ultérieure) ». Les références à la « story 10b » ci-dessous désignent désormais la story 12b.
  #
  # Story 12, volet Catalogue : liaison directe, sur le modèle de l'étiquetage direct
  # (catalogue/etiqueter-une-transition-publiee.feature, story 8).
  #
  # Recommandations retenues pour ces scénarios :
  # - une vidéo s'attache à une transition publiée seulement (Q225) ; ni pose, ni proposition en attente ;
  # - une vidéo est un lien vers un hébergeur accepté (YouTube, Vimeo, Instagram) : aucun fichier téléversé (Q226, Q227) ;
  # - seuls un validateur et un administrateur lient ou retirent une vidéo, directement, sans proposition ; nouvelle
  #   capacité « gérer les vidéos » (Q229, Q230) ; les propositions des utilisateurs viendront avec la story 10b ;
  # - légende obligatoire, espaces superflus retirés, 100 caractères au plus : c'est le texte du lien (Q231) ;
  # - au plus 3 vidéos par transition, présentées dans l'ordre où elles ont été liées, sans vidéo principale (Q232) ;
  # - une même vidéo (même hébergeur, même identifiant, quel que soit le moment de départ) n'est liée qu'une fois à une
  #   transition ; elle peut l'être à plusieurs transitions (Q233, Q234) ;
  # - AcroFunJam ne vérifie pas que la vidéo existe chez l'hébergeur (Q235) ;
  # - droits et droit à l'image : charte de validation, sans case à cocher ; un validateur retire une vidéo sur demande
  #   (Q236, Q237, Q238) ; pas de changement de légende : on retire, puis on lie de nouveau (Q239).
  # Site : action « Lier une vidéo » dans le repli de la transition, pour les validateurs et les administrateurs ;
  # libellés exacts à fixer par l'ux-expert.
  #
  # Personnages : Alice est utilisatrice, Bruno validateur, Paul administrateur.
  # Hors périmètre : vidéos des poses, photos, proposer une vidéo (utilisateur), lecteur intégré, vidéos dans le
  # générateur de flow, écran mobile, signalement d'un contenu.

  Contexte:
    Soit les poses publiées "Throne", "Bird" et "Star" dans le catalogue
    Et la transition publiée "Pop to Bird" de "Throne" vers "Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"

  Règle: Un validateur ou un administrateur lie directement une vidéo à une transition publiée

    @api @wip
    Plan du Scénario: Un <rôle> lie une vidéo à une transition publiée, qui la présente aussitôt
      Soit Bruno est <rôle>
      Et Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK" avec la légende « Pop to Bird, vue de côté »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente exactement les vidéos :
        | légende                  | hébergeur |
        | Pop to Bird, vue de côté | YouTube   |

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  Règle: Seul un validateur ou un administrateur lie ou retire une vidéo

    @api @wip
    Scénario: Un utilisateur ne peut pas lier une vidéo à une transition publiée
      Soit Alice est utilisateur
      Quand Alice lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK" avec la légende « Pop to Bird, vue de côté »
      Alors la liaison est refusée car seul un validateur ou un administrateur gère les vidéos

    @api @wip
    Scénario: Un visiteur ne peut pas lier une vidéo à une transition publiée
      Quand un visiteur lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK" avec la légende « Pop to Bird, vue de côté »
      Alors la liaison est refusée car il faut être connecté

    @api @wip
    Scénario: Un utilisateur ne peut pas retirer une vidéo d'une transition publiée
      Soit Bruno est validateur
      Et Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK" avec la légende « Pop to Bird, vue de côté »
      Et Alice est utilisateur
      Quand Alice retire de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Pop to Bird, vue de côté »
      Alors le retrait est refusé car seul un validateur ou un administrateur gère les vidéos

  Règle: Seule une transition publiée reçoit une vidéo

    @api @wip
    Scénario: Une transition inconnue du catalogue ne peut pas recevoir de vidéo
      Soit Bruno est validateur
      Quand Bruno lie à une transition qui n'existe pas dans le catalogue la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK" avec la légende « Pop to Bird, vue de côté »
      Alors la liaison est impossible car la transition est introuvable dans le catalogue

  # Q227 : liste fermée d'hébergeurs ; l'hébergeur est reconnu à l'adresse. Q235 : aucune vérification auprès de
  # l'hébergeur (la vidéo peut ne pas exister ou être privée).
  Règle: Une vidéo est l'adresse d'une vidéo chez un hébergeur accepté : YouTube, Vimeo ou Instagram

    Contexte:
      Soit Bruno est validateur

    @api @wip
    Plan du Scénario: Une vidéo <hébergeur> est reconnue à son adresse
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "<adresse>" avec la légende « Pop to Bird, vue de côté »
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" présente la vidéo « Pop to Bird, vue de côté » hébergée sur <hébergeur>

      Exemples:
        | adresse                                       | hébergeur |
        | https://www.youtube.com/watch?v=AbCdEfGhIjK   | YouTube   |
        | https://youtu.be/AbCdEfGhIjK                  | YouTube   |
        | https://vimeo.com/123456789                   | Vimeo     |
        | https://www.instagram.com/reel/C1a2b3c4d5e/   | Instagram |

    @api @wip
    Plan du Scénario: Une adresse qui n'est pas celle d'une vidéo d'un hébergeur accepté rend la liaison impossible (<cas>)
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "<adresse>" avec la légende « Pop to Bird, vue de côté »
      Alors la liaison est impossible car l'adresse n'est pas celle d'une vidéo YouTube, Vimeo ou Instagram

      Exemples:
        | cas                             | adresse                             |
        | hébergeur non accepté           | https://example.org/pop-to-bird.mp4 |
        | page d'une chaîne               | https://www.youtube.com/@acroyoga   |
        | texte qui n'est pas une adresse | Pop to Bird sur YouTube             |

    @api @wip
    Scénario: Une vidéo sans adresse ne peut pas être liée
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" une vidéo sans adresse avec la légende « Pop to Bird, vue de côté »
      Alors la liaison est impossible car l'adresse de la vidéo est obligatoire

  # Q231 : la légende est le texte du lien, lu par les lecteurs d'écran ; mêmes règles de normalisation qu'un nom.
  Règle: La légende d'une vidéo est obligatoire, sans espaces superflus, et compte au plus 100 caractères

    Contexte:
      Soit Bruno est validateur

    @api @wip
    Scénario: Les espaces superflus de la légende sont retirés
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec la légende «   Pop to Bird,   vue de face   »
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" présente la vidéo « Pop to Bird, vue de face » hébergée sur Vimeo

    @api @wip
    Scénario: Une légende de 100 caractères est acceptée
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec une légende de 100 caractères
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" présente 1 vidéo

    @api @wip
    Scénario: Une légende de 101 caractères rend la liaison impossible
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec une légende de 101 caractères
      Alors la liaison est impossible car la légende de la vidéo est trop longue

    @api @wip
    Scénario: Une vidéo sans légende ne peut pas être liée
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" sans légende
      Alors la liaison est impossible car la légende de la vidéo est obligatoire

    @api @wip
    Scénario: Une légende faite seulement d'espaces vaut absence de légende
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec une légende faite seulement d'espaces
      Alors la liaison est impossible car la légende de la vidéo est obligatoire

  # Q232 : une transition se montre en peu de vidéos ; au-delà, le validateur choisit lesquelles garder.
  Règle: Une transition a au plus 3 vidéos, présentées dans l'ordre où elles ont été liées

    Contexte:
      Soit Bruno est validateur

    @api @wip
    Scénario: Les vidéos d'une transition sont présentées dans l'ordre où elles ont été liées
      Soit Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec la légende « Vue de face »
      Et Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://youtu.be/AbCdEfGhIjK" avec la légende « Vue de côté »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" présente exactement les vidéos :
        | légende      | hébergeur |
        | Vue de face  | Vimeo     |
        | Vue de côté  | YouTube   |

    @api @wip
    Scénario: Une quatrième vidéo ne peut pas être liée à une transition
      Soit la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 3 vidéos
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.instagram.com/reel/C1a2b3c4d5e/" avec la légende « Pop to Bird au ralenti »
      Alors la liaison est impossible car la transition a déjà 3 vidéos

    @api @wip
    Scénario: Retirer une vidéo libère une place pour une autre
      Soit la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 3 vidéos, dont « Vue de face »
      Et Bruno a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.instagram.com/reel/C1a2b3c4d5e/" avec la légende « Pop to Bird au ralenti »
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" présente 3 vidéos, dont « Pop to Bird au ralenti »

  # Q233, Q234 : on compare la vidéo (hébergeur et identifiant), pas l'adresse ; le moment de départ (« t=42 ») ne
  # compte pas. L'adresse est conservée telle que saisie, moment de départ compris.
  Règle: Une même vidéo n'est liée qu'une fois à une transition, mais peut l'être à plusieurs transitions

    Contexte:
      Soit Bruno est validateur
      Et Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK" avec la légende « Vue de côté »

    @api @wip
    Plan du Scénario: La même vidéo, sous une autre adresse, ne peut pas être liée deux fois à une transition (<cas>)
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "<adresse>" avec la légende « Encore Pop to Bird »
      Alors la liaison est impossible car cette vidéo est déjà liée à la transition

      Exemples:
        | cas                       | adresse                                          |
        | même adresse              | https://www.youtube.com/watch?v=AbCdEfGhIjK      |
        | adresse courte            | https://youtu.be/AbCdEfGhIjK                     |
        | autre moment de départ    | https://www.youtube.com/watch?v=AbCdEfGhIjK&t=42 |

    # Une même vidéo montre souvent un enchaînement : Throne, puis Bird, puis Star.
    @api @wip
    Scénario: Une vidéo déjà liée à une transition peut être liée à une autre transition
      Soit la transition publiée sans nom de "Bird" vers "Star" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand Bruno lie à la transition sans nom de "Bird" vers "Star" la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK&t=42" avec la légende « Enchaînement Throne, Bird, Star »
      Alors la transition sans nom de "Bird" vers "Star" présente la vidéo « Enchaînement Throne, Bird, Star » hébergée sur YouTube

  # Q238 : retrait immédiat, sans motif ni historique ; c'est aussi la réponse à une demande de retrait (droit à
  # l'image, droits d'auteur, lien mort), transmise au validateur hors d'AcroFunJam pour l'instant (Q237).
  Règle: Un validateur ou un administrateur retire une vidéo d'une transition

    Contexte:
      Soit Bruno est validateur
      Et Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec la légende « Vue de face »

    @api @wip
    Plan du Scénario: Un <rôle> retire une vidéo, qui n'est plus présentée
      Soit Paul est <rôle>
      Et Paul a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la transition "Pop to Bird" depuis la pose "Throne" ne présente aucune vidéo

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api @wip
    Scénario: Une vidéo retirée peut être liée de nouveau, avec une autre légende
      Soit Bruno a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand Bruno lie à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec la légende « Pop to Bird, vue de face »
      Alors la transition "Pop to Bird" de "Throne" vers "Bird" présente la vidéo « Pop to Bird, vue de face » hébergée sur Vimeo

    @api @wip
    Scénario: Retirer une vidéo déjà retirée est impossible
      Soit Paul est administrateur
      Et Paul a retiré de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Quand Bruno retire de la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo « Vue de face »
      Alors le retrait est impossible car la vidéo n'est plus liée à la transition

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site (les pas visent le nom accessible des transitions sans nom, « de Bird vers Star »)
  # ---------------------------------------------------------------------------------------------------

  Règle: Sur le site, seul un validateur ou un administrateur est invité à lier une vidéo à une transition

    @web @wip
    Scénario: Un validateur est invité à lier une vidéo à une transition qui n'en a aucune
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose invite Bruno à lier une vidéo à la transition « Pop to Bird »

    @web @wip
    Scénario: Un utilisateur n'est pas invité à lier une vidéo à une transition
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte la pose "Throne" du catalogue
      Alors la page de la pose n'invite pas Alice à lier une vidéo à la transition « Pop to Bird »

    @web @wip
    Scénario: Le validateur n'est plus invité à lier une vidéo à une transition qui en a 3
      Soit Bruno est validateur, connecté sur le site
      Et la transition "Pop to Bird" de "Throne" vers "Bird" a déjà 3 vidéos
      Quand Bruno consulte la pose "Throne" du catalogue
      Alors la page de la pose n'invite pas Bruno à lier une vidéo à la transition « Pop to Bird »
      Et la page de la pose indique que la transition « Pop to Bird » a déjà le nombre maximal de vidéos

  Règle: Sur le site, le validateur lie et retire une vidéo depuis la page d'une pose

    Contexte:
      Soit Bruno est validateur, connecté sur le site

    @web @wip
    Scénario: La page de la pose présente aussitôt la vidéo liée par le validateur
      Quand Bruno lie sur le site, depuis la pose "Throne", à la transition « Pop to Bird » la vidéo "https://youtu.be/AbCdEfGhIjK" avec la légende « Pop to Bird, vue de côté »
      Alors la transition « Pop to Bird » présente la vidéo « Pop to Bird, vue de côté » hébergée sur YouTube

    @web @wip
    Scénario: Le site signale une adresse qui n'est pas celle d'une vidéo d'un hébergeur accepté, et garde la saisie
      Quand Bruno lie sur le site, depuis la pose "Throne", à la transition « Pop to Bird » la vidéo "https://example.org/pop-to-bird.mp4" avec la légende « Pop to Bird, vue de côté »
      Alors le site signale, sous le champ de l'adresse, qu'il faut l'adresse d'une vidéo YouTube, Vimeo ou Instagram
      Et la légende « Pop to Bird, vue de côté » est conservée

    @web @wip
    Scénario: Le site signale qu'une vidéo est déjà liée à la transition
      Soit Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://www.youtube.com/watch?v=AbCdEfGhIjK" avec la légende « Vue de côté »
      Quand Bruno lie sur le site, depuis la pose "Throne", à la transition « Pop to Bird » la vidéo "https://youtu.be/AbCdEfGhIjK" avec la légende « Encore Pop to Bird »
      Alors le site signale, sous le champ de l'adresse, que cette vidéo est déjà liée à la transition

    @web @wip
    Scénario: Le validateur confirme avant de retirer une vidéo, qui n'est plus présentée
      Soit Bruno a lié à la transition "Pop to Bird" de "Throne" vers "Bird" la vidéo "https://vimeo.com/123456789" avec la légende « Vue de face »
      Quand Bruno retire sur le site, depuis la pose "Throne", la vidéo « Vue de face » de la transition « Pop to Bird », après confirmation
      Alors la transition « Pop to Bird » ne présente aucune vidéo

    # Une washing machine figure dans les deux sections de la page de sa pose (story 7).
    @web @wip
    Scénario: Une vidéo liée à une washing machine depuis une section est présentée dans les deux sections
      Soit la transition publiée "Ninja Star" de "Star" vers "Star" de difficulté base "avancé" et de difficulté flyer "avancé"
      Quand Bruno lie sur le site, depuis la section des transitions depuis la pose "Star", à la transition « Ninja Star » la vidéo "https://vimeo.com/987654321" avec la légende « Ninja Star, deux tours »
      Alors les transitions depuis la pose "Star" présentent la transition « Ninja Star » avec la vidéo « Ninja Star, deux tours »
      Et les transitions vers la pose "Star" présentent la transition « Ninja Star » avec la vidéo « Ninja Star, deux tours »
