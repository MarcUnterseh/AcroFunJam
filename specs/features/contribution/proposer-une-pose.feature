# language: fr
@Integration
Fonctionnalité: Proposer une pose
  Afin d'enrichir le catalogue avec les poses que je pratique
  En tant qu'utilisateur
  Je veux proposer une nouvelle pose avec son nom, sa difficulté base, sa difficulté flyer
  et les indicateurs « peut commencer un flow » et « peut terminer un flow »

  # Story 3, contexte Contribution, cibles @api et @web. Décisions du porteur du produit du 2026-11-03.
  # Reprend les règles de contenu de l'ancien brouillon catalogue/publier-une-pose.feature, après la clarification
  # des rôles (decouverte.md, « Rôles ») : la proposition d'un utilisateur est en attente de validation,
  # celle d'un validateur ou d'un administrateur est publiée directement. Une publication directe crée une
  # proposition acceptée aussitôt (non observable, donc sans scénario).
  # Hors périmètre : description, photos, transitions, étiquettes ; alias et synonymes de nom ; poses à plus de
  # deux personnes ; accepter ou refuser une proposition (story suivante) ; liste « mes propositions ».
  # Les règles de contenu sont vérifiées une fois côté @api ; @web vérifie le parcours sur le site.
  # « Irrecevable » : la proposition ne respecte pas une règle, elle n'est pas enregistrée. À ne pas confondre
  # avec « refuser une proposition », décision d'un validateur. Côté site, on vérifie le message affiché, pas ce mot.
  # Personnages, comme dans identite/ : Alice et Chloé sont utilisatrices, Bruno est validateur, Paul administrateur.
  # @Integration : rôles réels, unicité et publication directe vérifiées sur un vrai PostgreSQL (ADR 0020).

  # ---------------------------------------------------------------------------------------------------
  # Qui propose, et ce que devient la proposition
  # ---------------------------------------------------------------------------------------------------

  Règle: Une pose proposée par un utilisateur est en attente de validation et n'apparaît pas dans le catalogue

    @api
    Scénario: La pose proposée par un utilisateur est en attente de validation
      Soit Alice est utilisateur
      Quand Alice propose la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors la proposition de la pose "Throne" par Alice est en attente de validation

    @api
    Scénario: Une pose en attente de validation n'apparaît pas dans le catalogue consulté par les visiteurs
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom  | difficulté base | difficulté flyer |
        | Bird | découverte      | découverte       |

    @api
    Scénario: Le contributeur ne voit pas sa pose en attente de validation dans le catalogue
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom  | difficulté base | difficulté flyer |
        | Bird | découverte      | découverte       |

  Règle: Une pose proposée par un validateur ou un administrateur est publiée directement

    @api
    Plan du Scénario: Une pose proposée par un <rôle> est publiée directement dans le catalogue
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Bruno est <rôle>
      Et Bruno a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom    | difficulté base | difficulté flyer |
        | Bird   | découverte      | découverte       |
        | Throne | débutant        | découverte       |

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  Règle: Seule une personne connectée peut proposer une pose

    @api
    Scénario: La proposition d'un visiteur est irrecevable
      Quand un visiteur propose la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors la proposition est irrecevable car il faut être connecté

  Règle: Une proposition irrecevable n'enregistre rien

    # Observé côté API tant que ni « mes propositions » ni la file de validation (story suivante) n'existent.
    @api
    Scénario: Une proposition irrecevable d'un utilisateur ne laisse aucune proposition en attente de validation
      Soit Alice est utilisateur
      Quand Alice propose une pose nommée ""
      Alors aucune proposition d'Alice n'est en attente de validation

    @api
    Scénario: Une proposition irrecevable d'un validateur ne publie rien
      Soit un catalogue sans aucune pose publiée
      Et Bruno est validateur
      Et Bruno a tenté de proposer une pose nommée ""
      Quand un visiteur consulte les poses du catalogue
      Alors le visiteur est informé que le catalogue ne contient encore aucune pose

  # ---------------------------------------------------------------------------------------------------
  # Contenu d'une pose proposée (vérifié avec Alice, utilisatrice)
  # Dans « Quand Alice propose une pose nommée … », les autres informations de la pose sont valides.
  # ---------------------------------------------------------------------------------------------------

  Règle: Le nom d'une pose est obligatoire

    Contexte:
      Soit Alice est utilisateur

    # Les cellules d'un tableau Gherkin sont rognées : les noms à espaces sont écrits en clair dans les étapes.
    @api
    Scénario: Une pose sans nom est irrecevable
      Quand Alice propose une pose nommée ""
      Alors la proposition est irrecevable car le nom de la pose est obligatoire

    @api
    Scénario: Une pose dont le nom ne contient que des espaces est irrecevable
      Quand Alice propose une pose nommée "   "
      Alors la proposition est irrecevable car le nom de la pose est obligatoire

  Règle: Les espaces superflus du nom sont supprimés, le reste du nom est conservé tel que saisi

    Contexte:
      Soit Alice est utilisateur

    @api
    Scénario: Les espaces en début et en fin de nom sont supprimés
      Quand Alice propose une pose nommée "  Folded Leaf  "
      Alors la pose est proposée sous le nom "Folded Leaf"

    @api
    Scénario: Les espaces consécutifs à l'intérieur du nom sont réduits à un seul
      Quand Alice propose une pose nommée "High    Bird"
      Alors la pose est proposée sous le nom "High Bird"

    @api
    Plan du Scénario: Le nom "<nom>" est proposé tel que saisi
      Quand Alice propose une pose nommée "<nom>"
      Alors la pose est proposée sous le nom "<nom>"

      Exemples: Casse, traits d'union, parenthèses et accents conservés
        | nom                   |
        | Hand-to-Hand (L-base) |
        | reverse bird          |
        | Free Bird             |
        | Étoile                |

  # Longueur comptée après suppression des espaces superflus.
  Règle: Le nom d'une pose compte au plus 60 caractères

    Contexte:
      Soit Alice est utilisateur

    @api
    Scénario: Un nom de la longueur maximale est accepté
      Quand Alice propose une pose dont le nom compte 60 caractères
      Alors la proposition d'Alice est en attente de validation

    @api
    Scénario: Un nom plus long que la longueur maximale est irrecevable
      Quand Alice propose une pose dont le nom compte 61 caractères
      Alors la proposition est irrecevable car le nom de la pose est trop long

  # Comparaison des noms : espaces superflus retirés ; casse, accents et ponctuation (trait d'union, apostrophe,
  # parenthèses) ignorés. C'est aussi la comparaison de l'ordre alphabétique du catalogue.
  # Vérifiée dès la proposition ; le catalogue la revérifiera à l'acceptation (story suivante).
  Règle: Une pose ne peut pas être proposée sous le nom d'une pose du catalogue

    @api
    Plan du Scénario: Le nom "<nom proposé>" est irrecevable car il désigne la pose publiée "<pose publiée>"
      Soit la pose publiée "<pose publiée>" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Alice est utilisateur
      Quand Alice propose une pose nommée "<nom proposé>"
      Alors la proposition est irrecevable car une pose de ce nom existe déjà dans le catalogue

      Exemples: Même nom, à la casse, aux espaces, aux accents ou à la ponctuation près
        | pose publiée          | nom proposé         |
        | High Bird             | High Bird           |
        | High Bird             | high bird           |
        | High Bird             | HIGH BIRD           |
        | High Bird             | High-Bird           |
        | High Bird             | high-bird           |
        | High Bird             | High  Bird          |
        | Étoile                | Etoile              |
        | Hand-to-Hand (L-base) | Hand-to-Hand L-base |
        | Hand-to-Hand (L-base) | hand to hand l base |

    @api
    Scénario: Un validateur ne publie pas directement une pose sous le nom d'une pose du catalogue
      Soit la pose publiée "High Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Bruno est validateur
      Quand Bruno propose une pose nommée "high bird"
      Alors la proposition est irrecevable car une pose de ce nom existe déjà dans le catalogue

  Règle: Une variante est une pose distincte, proposée sous son propre nom

    @api
    Plan du Scénario: La variante "<variante>" est proposée à côté de la pose publiée "Bird"
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Alice est utilisateur
      Quand Alice propose une pose nommée "<variante>"
      Alors la pose est proposée sous le nom "<variante>"

      Exemples:
        | variante     |
        | High Bird    |
        | Reverse Bird |
        | Free Bird    |

  # Même comparaison des noms que face au catalogue ; s'applique à tous, validateurs et administrateurs compris.
  # Couvre aussi la proposition envoyée deux fois par le même contributeur.
  Règle: Une pose ne peut pas être proposée sous le nom d'une pose déjà en attente de validation

    @api
    Scénario: Un utilisateur ne propose pas deux fois la même pose
      Soit Alice est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice propose une pose nommée "throne"
      Alors la proposition est irrecevable car une pose de ce nom est déjà en attente de validation

    @api
    Scénario: Un utilisateur ne propose pas une pose déjà proposée par un autre utilisateur
      Soit Alice est utilisateur
      Et Chloé est utilisateur
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Chloé propose une pose nommée "Throne"
      Alors la proposition est irrecevable car une pose de ce nom est déjà en attente de validation

    @api
    Plan du Scénario: Un <rôle> ne publie pas directement une pose déjà en attente de validation
      Soit Alice est utilisateur
      Et Bruno est <rôle>
      Et Alice a proposé la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno propose une pose nommée "Throne"
      Alors la proposition est irrecevable car une pose de ce nom est déjà en attente de validation

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  Règle: Une pose a obligatoirement une difficulté base et une difficulté flyer, sur l'échelle découverte < débutant < intermédiaire < avancé

    Contexte:
      Soit Alice est utilisateur

    @api
    Plan du Scénario: La pose "<nom>" est proposée avec la difficulté base "<difficulté base>" et la difficulté flyer "<difficulté flyer>"
      Quand Alice propose la pose "<nom>" de difficulté base "<difficulté base>" et de difficulté flyer "<difficulté flyer>"
      Alors la pose "<nom>" est proposée avec la difficulté base "<difficulté base>" et la difficulté flyer "<difficulté flyer>"

      Exemples: Chaque niveau de l'échelle, difficultés identiques ou différentes pour la base et le flyer
        | nom                   | difficulté base | difficulté flyer |
        | Folded Leaf           | découverte      | découverte       |
        | Throne                | débutant        | découverte       |
        | Whale                 | débutant        | intermédiaire    |
        | Star                  | intermédiaire   | intermédiaire    |
        | Hand-to-Hand (L-base) | avancé          | avancé           |
        | Standing Hand-to-Hand | avancé          | avancé           |

    @api
    Plan du Scénario: Une pose sans <difficulté manquante> est irrecevable
      Quand Alice propose la pose "Throne" sans <difficulté manquante>
      Alors la proposition est irrecevable car <motif>

      Exemples:
        | difficulté manquante | motif                               |
        | difficulté base      | la difficulté base est obligatoire  |
        | difficulté flyer     | la difficulté flyer est obligatoire |

    @api
    Scénario: Une difficulté hors de l'échelle est irrecevable
      Quand Alice propose la pose "Throne" de difficulté base "expert" et de difficulté flyer "découverte"
      Alors la proposition est irrecevable car le niveau de difficulté "expert" n'existe pas

  # Indicateurs obligatoires, sans valeur par défaut ; une pose peut n'avoir aucun des deux.
  # « Peut commencer un flow » : le duo s'installe dans la pose directement depuis le sol.
  # « Peut terminer un flow » : le flyer redescend au sol directement et sans danger depuis la pose.
  Règle: Une pose précise si elle peut commencer un flow et si elle peut terminer un flow

    Contexte:
      Soit Alice est utilisateur

    # Révision du 2026-11-04 (expert acroyoga) : Folded Leaf peut aussi commencer un flow, Whale peut aussi en terminer
    # un selon les écoles ; ces exemples contestés sont remplacés (Q18) par Free Bird (termine seulement : on y arrive
    # depuis Bird) et Candlestick (commence seulement : exemple, pas une référence, certaines écoles enseignent une
    # sortie en déroulé).
    @api
    Plan du Scénario: La pose "<nom>" est proposée avec ses indicateurs de début et de fin de flow
      Quand Alice propose la pose "<nom>" qui <commencer> commencer un flow et <terminer> terminer un flow
      Alors la pose proposée "<nom>" <commencer> commencer un flow et <terminer> terminer un flow

      Exemples:
        | nom                   | commencer   | terminer    |
        | Bird                  | peut        | peut        |
        | Candlestick           | peut        | ne peut pas |
        | Free Bird             | ne peut pas | peut        |
        | Hand-to-Hand (L-base) | ne peut pas | ne peut pas |

    @api
    Plan du Scénario: Une pose qui ne précise pas si elle peut <indicateur> un flow est irrecevable
      Quand Alice propose la pose "Throne" sans préciser si elle peut <indicateur> un flow
      Alors la proposition est irrecevable car il faut préciser si la pose peut <indicateur> un flow

      Exemples:
        | indicateur |
        | commencer  |
        | terminer   |

  # ---------------------------------------------------------------------------------------------------
  # Parcours sur le site
  # Le site connaît le rôle de la personne connectée (« mon compte »). Le bouton d'envoi est « Proposer la pose ».
  # ---------------------------------------------------------------------------------------------------

  # Le lien n'apparaît ni pour un visiteur ni dans l'en-tête. État vide : voir catalogue/consulter-les-poses.feature.
  Règle: Seule une personne connectée est invitée à proposer une pose depuis le catalogue

    @web
    Scénario: Un visiteur n'est pas invité à proposer une pose
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors le catalogue n'invite pas à proposer une pose

    @web
    Scénario: Une personne connectée est invitée à proposer une pose depuis le catalogue
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte les poses du catalogue
      Alors le catalogue invite à proposer une pose

  # Un visiteur n'accède jamais au formulaire de proposition.
  Règle: Un visiteur qui accède directement à la page « Proposer une pose » doit d'abord se connecter

    @web
    Scénario: Un visiteur qui accède directement à la page « Proposer une pose » est invité à se connecter
      Quand un visiteur accède directement à la page « Proposer une pose »
      Alors le site invite le visiteur à se connecter, sans lui présenter le formulaire de proposition

    @web
    Scénario: Après la connexion, la personne arrive sur le formulaire de proposition
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Et Alice a accédé directement à la page « Proposer une pose » en tant que visiteur
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors Alice peut proposer une pose

  Règle: Le formulaire annonce à un validateur ou un administrateur que la pose sera publiée directement

    @web
    Plan du Scénario: Le formulaire annonce à un <rôle> que sa pose sera publiée directement
      Soit Bruno est <rôle>, connecté sur le site
      Quand Bruno commence à proposer une pose sur le site
      Alors le site annonce à Bruno que la pose sera publiée directement dans le catalogue

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

  # Après l'envoi : un message de confirmation, avec « Proposer une autre pose » et « Voir le catalogue ».
  Règle: Sur le site, le contributeur sait ce que devient sa proposition et choisit la suite

    @web
    Scénario: Un utilisateur qui propose une pose est informé qu'elle est en attente de validation
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice propose sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors le site indique à Alice que sa proposition de la pose "Throne" est en attente de validation

    @web
    Scénario: Un validateur qui propose une pose est informé qu'elle est publiée dans le catalogue
      Soit Bruno est validateur, connecté sur le site
      Quand Bruno propose sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors le site indique à Bruno que la pose "Throne" est publiée dans le catalogue

    @web
    Scénario: Proposer une autre pose présente un formulaire vide
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et Alice a proposé sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice choisit de proposer une autre pose
      Alors le formulaire de proposition est vide

    @web
    Scénario: La pose publiée par un validateur apparaît dans le catalogue qu'il choisit de voir
      Soit Bruno est validateur, connecté sur le site
      Et Bruno a proposé sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Bruno choisit de voir le catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "débutant" et la difficulté flyer "découverte"

  # Vérifié par le site avant l'envoi, avec les mêmes règles que l'API.
  Règle: Le site signale une information manquante ou un nom trop long avant d'envoyer la proposition

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"

    @web
    Plan du Scénario: Le site signale une proposition <cas>
      Quand Alice propose sur le site une pose <cas>
      Alors le site indique que <motif>

      Exemples:
        | cas                                          | motif                                              |
        | sans nom                                     | le nom de la pose est obligatoire                  |
        | sans difficulté base                         | la difficulté base est obligatoire                 |
        | sans difficulté flyer                        | la difficulté flyer est obligatoire                |
        | sans préciser si elle peut commencer un flow | il faut préciser si la pose peut commencer un flow |
        | sans préciser si elle peut terminer un flow  | il faut préciser si la pose peut terminer un flow  |

    @web
    Scénario: Le site signale un nom plus long que la longueur maximale
      Quand Alice propose sur le site une pose dont le nom compte 61 caractères
      Alors le site indique que le nom de la pose ne doit pas dépasser 60 caractères

  # Une seule règle vérifiée par l'API suffit à montrer que le site relaie le motif.
  Règle: Le site explique pourquoi une proposition n'est pas reçue

    @web
    Scénario: Le site signale qu'une pose de ce nom existe déjà dans le catalogue
      Soit la pose publiée "High Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice propose sur le site une pose nommée "high bird"
      Alors le site indique « Une pose de ce nom existe déjà dans le catalogue. »

  # Un incident technique ne doit pas passer pour un refus, ni faire perdre la saisie (comme à la story 2b).
  Règle: Le site conserve la saisie quand la proposition n'a pas pu aboutir

    @web
    Scénario: Le site signale qu'AcroFunJam est injoignable et conserve la pose saisie
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et AcroFunJam est momentanément injoignable
      Quand Alice propose sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors le site indique que la proposition n'a pas pu aboutir et qu'Alice peut réessayer
      Et la pose "Throne" saisie par Alice est conservée

  # Sur cette page, une alerte dans le formulaire remplace le bandeau global « session expirée » ;
  # la saisie est gardée dans l'onglet et retrouvée après la reconnexion.
  Règle: Une session expirée pendant la saisie ne fait pas perdre la pose saisie

    Contexte:
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et la session d'Alice a expiré

    @web
    Scénario: Le formulaire signale que la session a expiré pendant la saisie
      Quand Alice propose sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Alors le formulaire de proposition informe Alice que sa session a expiré et qu'elle peut se connecter de nouveau

    @web
    Scénario: Après s'être reconnectée, la personne retrouve la pose qu'elle avait saisie
      Soit Alice a tenté de proposer sur le site la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand Alice se connecte de nouveau sur le site
      Alors Alice retrouve dans le formulaire de proposition la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
