# language: fr
@web
Fonctionnalité: Mentions légales et confidentialité
  Afin de savoir qui publie AcroFunJam, ce qu'il fait de mes données et comment faire valoir mes droits
  En tant que visiteur ou utilisateur du site
  Je veux trouver, depuis n'importe quelle page, les mentions légales, la politique de confidentialité et l'adresse de contact

  # Story « Mentions légales et confidentialité », présentation du site seule (pas un contexte métier), cible @web.
  # Carte d'example mapping du 2026-11-26 : decouverte.md, « Story « Mentions légales et confidentialité » »
  # (règles R1 à R9, questions Q270 à Q284), validée le 2026-11-26 : toutes les recommandations retenues.
  #
  # Décisions du porteur du produit (non rouvertes) :
  # - éditeur anonyme : « site personnel non professionnel », responsable de la publication non nommé ;
  #   hébergeur identifié (la société IONOS qui facture le serveur, Q270) ; adresse de contact contact@acrofunjam.fr ;
  # - site seulement : l'application pointera vers ces pages à sa publication ;
  # - aucun écran de suppression du compte : la demande passe par l'adresse de contact ;
  # - une seule demande, de la base ou du flyer, suffit pour retirer une photo (Q267).
  #
  # Le texte juridique complet n'est pas vérifié ici : seuls ses éléments essentiels le sont. Les rubriques attendues
  # sont listées dans decouverte.md.

  # Le pied de page est le même dans tous les états de page (chargement, erreur, introuvable) : il ne dépend ni de la
  # session ni de l'API.
  Règle: Toute page du site mène, par son pied de page, aux mentions légales, à la politique de confidentialité et à l'adresse de contact

    Plan du Scénario: Un visiteur trouve les informations légales dans le pied de page de <page>
      Quand un visiteur consulte <page>
      Alors le pied de page mène aux mentions légales, à la politique de confidentialité et à l'adresse de contact "contact@acrofunjam.fr"

      Exemples:
        | page                                      |
        | les poses du catalogue                    |
        | la page de la pose publiée "Throne"       |
        | la page de la pose introuvable "Inconnue" |
        | la page « Générer un flow »               |
        | la page « Étiquettes »                    |
        | la page « Se connecter »                  |
        | la page « S'inscrire »                    |
        | une page introuvable                      |
        | les mentions légales                      |
        | la politique de confidentialité           |

    Plan du Scénario: Une personne connectée trouve les mêmes informations légales dans le pied de page de <page>
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte <page>
      Alors le pied de page mène aux mentions légales, à la politique de confidentialité et à l'adresse de contact "contact@acrofunjam.fr"

      Exemples:
        | page                                |
        | « Mes propositions »                |
        | le formulaire « Proposer une pose » |

  # Arriver directement : lien partagé, favori, rechargement de la page.
  Règle: Les informations légales se consultent sans compte, y compris en y arrivant directement

    Plan du Scénario: Un visiteur qui arrive directement sur <page légale> la lit sans se connecter
      Quand un visiteur arrive sur le site directement par <page légale>
      Alors le site présente <page légale> sans lui demander de se connecter

      Exemples:
        | page légale                     |
        | les mentions légales            |
        | la politique de confidentialité |

  # Coordonnées complètes de l'hébergeur (adresse, téléphone) : Q270, vérifiées à la relecture du texte.
  Règle: Les mentions légales présentent l'éditeur comme un site personnel non professionnel, l'hébergeur et l'adresse de contact

    Plan du Scénario: Les mentions légales présentent <rubrique>
      Quand un visiteur consulte les mentions légales
      Alors les mentions légales présentent <rubrique> : "<contenu>"

      Exemples:
        | rubrique             | contenu                          |
        | l'éditeur            | site personnel non professionnel |
        | l'hébergeur du site  | IONOS                            |
        | l'adresse de contact | contact@acrofunjam.fr            |

  # Durée des propositions et décisions : Q273, UX-36.
  Règle: La politique de confidentialité présente chaque catégorie de données et sa durée de conservation

    Plan du Scénario: La politique de confidentialité présente <données> et leur durée de conservation
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité présente <données>, conservées "<durée>"

      Exemples:
        | données                                                          | durée                                     |
        | les données du compte : adresse e-mail, mot de passe haché, rôle | jusqu'à la suppression du compte          |
        | les propositions et les décisions                                | tant qu'AcroFunJam existe              |
        | la confirmation des droits sur une photo : compte et date        | aussi longtemps que la photo              |
        | les photos, leur crédit et leur texte alternatif                 | jusqu'à leur retrait                      |
        | le cookie de session                                             | jusqu'à la déconnexion, au plus 14 jours après la dernière visite |
        | les sauvegardes de la base de données                           | 30 jours                                  |

  # Seaux Cloudflare R2 hors de la juridiction UE pour l'instant (Q276) : la politique annonce le transfert.
  Règle: La politique de confidentialité nomme les sous-traitants et ce qu'ils hébergent

    Plan du Scénario: La politique de confidentialité nomme le sous-traitant <sous-traitant>
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité nomme le sous-traitant "<sous-traitant>", qui héberge <ce qu'il héberge>

      Exemples:
        | sous-traitant | ce qu'il héberge              |
        | IONOS         | le serveur, la base de données et la messagerie |
        | Cloudflare    | les photos et les sauvegardes |

  Règle: Le site ne dépose que le cookie de session, strictement nécessaire : aucun consentement n'est demandé

    Scénario: La politique de confidentialité indique que seul le cookie de session est déposé
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité indique que seul le cookie de session, strictement nécessaire, est déposé, sans mesure d'audience ni traceur

    Scénario: Un visiteur qui arrive pour la première fois n'a aucun consentement aux cookies à donner
      Quand un visiteur consulte les poses du catalogue pour la première fois
      Alors le site ne lui demande aucun consentement aux cookies

  # Délai de réponse et vérification de l'auteur d'une demande : Q274.
  Règle: La politique de confidentialité explique les droits de chacun et comment les exercer, par l'adresse de contact

    Plan du Scénario: La politique de confidentialité explique comment <demande>
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité indique qu'on peut <demande> en écrivant à "contact@acrofunjam.fr"

      Exemples:
        | demande                                                                                                 |
        | accéder à ses données, les rectifier ou les faire effacer                                               |
        | s'opposer à un traitement ou le limiter                                                                 |
        | faire supprimer son compte                                                                              |
        | faire retirer une photo où l'on figure, sans compte, une seule demande de la base ou du flyer suffisant |

    Scénario: La politique de confidentialité indique qu'on peut adresser une réclamation à la CNIL
      Quand un visiteur consulte la politique de confidentialité
      Alors la politique de confidentialité indique qu'on peut adresser une réclamation à la CNIL

  Règle: L'adresse de contact s'écrit depuis sa messagerie

    Scénario: L'adresse de contact du pied de page, écrite en toutes lettres, prépare un message à contact@acrofunjam.fr
      Quand un visiteur consulte les poses du catalogue
      Alors le pied de page présente l'adresse "contact@acrofunjam.fr" en toutes lettres
      Et l'adresse de contact prépare un message à "contact@acrofunjam.fr" dans sa messagerie

  # Q279 : informer au moment de la collecte, avant les champs (UX).
  Règle: La page d'inscription renvoie à la politique de confidentialité

    Scénario: Une personne qui s'inscrit peut lire la politique de confidentialité avant de donner son adresse
      Quand une personne ouvre la page « S'inscrire »
      Alors la page mène à la politique de confidentialité avant le champ « Adresse e-mail »
