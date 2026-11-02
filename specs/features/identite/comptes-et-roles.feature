# language: fr
@Integration
Fonctionnalité: Comptes et rôles
  Afin que chacun n'agisse sur le catalogue que dans la limite de son rôle
  En tant que personne qui utilise AcroFunJam
  Je veux m'inscrire, me connecter et, si je suis administrateur, attribuer ou retirer les rôles des autres utilisateurs

  # Contexte Identité (generic), ADR 0008 : comptes délégués à ASP.NET Core Identity.
  # On ne spécifie pas ce que la bibliothèque garantit déjà (règles de mot de passe, hachage,
  # durée de validité d'une connexion…) : seules les règles propres au produit figurent ici.
  # Rôles cumulatifs : utilisateur ⊂ validateur ⊂ administrateur. Un visiteur n'est pas connecté.
  # Les capacités « proposer » et « accepter ou refuser une proposition » n'existent pas encore :
  # elles sont observées en consultant ses capacités (Q1).
  # Les commentaires « Q<n> » renvoient aux décisions de decouverte.md (story « Comptes et rôles »).
  # @Integration : les comptes sont gérés par ASP.NET Core Identity sur un vrai PostgreSQL (ADR 0009).
  # Cible : @api seule (les écrans viennent avec la story « Proposer une pose »).

  Règle: Une personne qui s'inscrit obtient un compte avec le seul rôle utilisateur

    @api
    Scénario: Une personne qui s'inscrit devient utilisateur
      Quand Alice s'inscrit avec l'adresse "alice@example.org"
      Alors Alice a pour seul rôle utilisateur

  # Q10 : l'adresse est comparée sans tenir compte de la casse.
  Règle: Une adresse e-mail ne sert qu'à un seul compte

    @api
    Plan du Scénario: L'inscription avec l'adresse "<adresse>" est refusée car elle sert déjà à un compte
      Soit Alice a un compte avec l'adresse "alice@example.org"
      Quand une personne s'inscrit avec l'adresse "<adresse>"
      Alors l'inscription est refusée car l'adresse e-mail sert déjà à un compte

      Exemples:
        | adresse           |
        | alice@example.org |
        | Alice@Example.org |

  # Q11 : même motif que l'adresse soit inconnue ou le mot de passe incorrect.
  Règle: Seule une personne inscrite qui donne son mot de passe se connecte

    @api
    Scénario: Une personne inscrite se connecte avec son adresse et son mot de passe
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Quand Alice se connecte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors Alice est connectée

    @api
    Plan du Scénario: La connexion est refusée quand <cas>
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Quand une personne se connecte avec l'adresse "<adresse>" et le mot de passe "<mot de passe>"
      Alors la connexion est refusée car l'adresse e-mail ou le mot de passe est incorrect

      Exemples:
        | cas                                | adresse           | mot de passe     |
        | le mot de passe est incorrect      | alice@example.org | Star-2026        |
        | l'adresse ne sert à aucun compte   | paul@example.org  | Throne-Bird-2026 |

  # Q1 : les capacités sont observées en consultant ses capacités.
  # Q13 : « gérer la liste des étiquettes » sera ajoutée avec la story correspondante.
  Règle: Les capacités d'un rôle s'ajoutent à celles du rôle précédent

    @api
    Plan du Scénario: Un <rôle> a exactement les capacités de son rôle
      Soit Alice est <rôle>
      Quand Alice consulte ses capacités
      Alors les capacités d'Alice sont exactement : <capacités>

      Exemples:
        | rôle           | capacités                                                            |
        | utilisateur    | proposer                                                             |
        | validateur     | proposer, accepter ou refuser une proposition                        |
        | administrateur | proposer, accepter ou refuser une proposition, gérer les rôles       |

  # Q8 : l'administrateur désigne l'utilisateur par son adresse e-mail.
  Règle: Un administrateur attribue le rôle validateur ou administrateur à un autre utilisateur

    Contexte:
      Soit Paul est administrateur
      Et Alice est utilisateur avec l'adresse "alice@example.org"

    @api
    Plan du Scénario: Un administrateur attribue le rôle <rôle> à un utilisateur
      Quand Paul attribue le rôle <rôle> à "alice@example.org"
      Alors Alice est <rôle>

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    @api
    Scénario: Un administrateur promeut un validateur administrateur
      Soit Bruno est validateur avec l'adresse "bruno@example.org"
      Quand Paul attribue le rôle administrateur à "bruno@example.org"
      Alors Bruno est administrateur

    # Q4 : attribuer un rôle déjà détenu réussit sans rien changer.
    @api
    Scénario: Attribuer à un utilisateur un rôle qu'il a déjà ne change rien
      Soit Bruno est validateur avec l'adresse "bruno@example.org"
      Quand Paul attribue le rôle validateur à "bruno@example.org"
      Alors Bruno est validateur

    @api
    Scénario: Attribuer le rôle utilisateur est refusé
      Quand Paul attribue le rôle utilisateur à "alice@example.org"
      Alors l'attribution est refusée car le rôle utilisateur est celui de tout compte

    @api
    Scénario: Attribuer un rôle sans adresse e-mail est refusé
      Quand Paul attribue le rôle validateur à ""
      Alors l'attribution est refusée car l'adresse e-mail est absente ou invalide

    @api
    Scénario: Attribuer un rôle à une adresse qui ne sert à aucun compte est refusé
      Quand Paul attribue le rôle validateur à "chloe@example.org"
      Alors l'attribution est refusée car aucun compte n'a l'adresse "chloe@example.org"

  # Q2, Q3 : un compte a un seul rôle ; retirer un rôle ramène le compte au rôle utilisateur.
  Règle: Un administrateur retire le rôle validateur ou administrateur à un autre utilisateur

    Contexte:
      Soit Paul est administrateur

    @api
    Plan du Scénario: Un administrateur retire le rôle <rôle> à un utilisateur
      Soit Bruno est <rôle> avec l'adresse "bruno@example.org"
      Quand Paul retire le rôle <rôle> à "bruno@example.org"
      Alors Bruno a pour seul rôle utilisateur

      Exemples:
        | rôle           |
        | validateur     |
        | administrateur |

    # Q3 : un administrateur n'est pas « validateur » en propre ; on le rétrograde en lui attribuant le rôle validateur.
    @api
    Scénario: Retirer le rôle validateur à un administrateur est refusé
      Soit Bruno est administrateur avec l'adresse "bruno@example.org"
      Quand Paul retire le rôle validateur à "bruno@example.org"
      Alors le retrait est refusé car Bruno est administrateur, pas validateur

    @api
    Scénario: Retirer le rôle validateur à un utilisateur qui ne l'a pas est refusé
      Soit Bruno est utilisateur avec l'adresse "bruno@example.org"
      Quand Paul retire le rôle validateur à "bruno@example.org"
      Alors le retrait est refusé car Bruno n'est pas validateur

    # Q3 : attribuer un rôle inférieur à un administrateur le rétrograde.
    @api
    Scénario: Un administrateur rétrograde un autre administrateur validateur
      Soit Bruno est administrateur avec l'adresse "bruno@example.org"
      Quand Paul attribue le rôle validateur à "bruno@example.org"
      Alors Bruno est validateur

    # Q9 : le retrait prend effet dès l'action suivante, sans attendre une nouvelle connexion.
    @api
    Scénario: Un utilisateur perd les capacités d'un rôle dès que ce rôle lui est retiré
      Soit Bruno est validateur avec l'adresse "bruno@example.org"
      Et Bruno est connecté
      Et Paul a retiré le rôle validateur à "bruno@example.org"
      Quand Bruno consulte ses capacités
      Alors les capacités de Bruno sont exactement : proposer

  # Q5 : le rôle utilisateur est celui de tout compte ; la suspension d'un compte est hors périmètre.
  Règle: Le rôle utilisateur ne s'attribue ni ne se retire

    @api
    Scénario: Retirer le rôle utilisateur est refusé
      Soit Paul est administrateur
      Et Alice est utilisateur avec l'adresse "alice@example.org"
      Quand Paul retire le rôle utilisateur à "alice@example.org"
      Alors le retrait est refusé car le rôle utilisateur est celui de tout compte

  Règle: Seul un administrateur gère les rôles

    @api
    Plan du Scénario: Un <rôle> ne peut pas attribuer de rôle
      Soit Alice est <rôle>
      Et Bruno est utilisateur avec l'adresse "bruno@example.org"
      Quand Alice attribue le rôle validateur à "bruno@example.org"
      Alors l'attribution est refusée car seul un administrateur gère les rôles
      Et Bruno a pour seul rôle utilisateur

      Exemples:
        | rôle        |
        | utilisateur |
        | validateur  |

    @api
    Scénario: Un validateur ne peut pas retirer de rôle
      Soit Alice est validateur
      Et Bruno est validateur avec l'adresse "bruno@example.org"
      Quand Alice retire le rôle validateur à "bruno@example.org"
      Alors le retrait est refusé car seul un administrateur gère les rôles

    @api
    Scénario: Un visiteur ne peut pas attribuer de rôle
      Soit Bruno est utilisateur avec l'adresse "bruno@example.org"
      Quand un visiteur attribue le rôle administrateur à "bruno@example.org"
      Alors l'attribution est refusée car il faut être connecté

  # Q6 : AcroFunJam a toujours au moins un administrateur.
  Règle: Le dernier administrateur ne peut pas perdre son rôle

    @api
    Scénario: Le dernier administrateur ne peut pas retirer son propre rôle administrateur
      Soit Paul est le seul administrateur, avec l'adresse "paul@example.org"
      Quand Paul retire le rôle administrateur à "paul@example.org"
      Alors le retrait est refusé car il doit rester au moins un administrateur

    @api
    Scénario: Le dernier administrateur ne peut pas être rétrogradé validateur
      Soit Paul est le seul administrateur, avec l'adresse "paul@example.org"
      Quand Paul attribue le rôle validateur à "paul@example.org"
      Alors l'attribution est refusée car il doit rester au moins un administrateur

    @api
    Scénario: Un administrateur retire son propre rôle administrateur quand il en reste un autre
      Soit Paul est administrateur avec l'adresse "paul@example.org"
      Et Bruno est administrateur
      Quand Paul retire le rôle administrateur à "paul@example.org"
      Alors Paul a pour seul rôle utilisateur

  # Q7 : la désignation par configuration ne sert qu'à l'amorçage, au déploiement, quand aucun administrateur n'existe.
  Règle: Le premier administrateur est désigné par son adresse e-mail au déploiement

    # Sécurité (revue de la story) : rien ne prouve encore qu'une personne possède l'adresse qu'elle saisit.
    # La promotion n'a donc lieu qu'au déploiement : la personne désignée s'inscrit, vérifie qu'elle se connecte,
    # puis AcroFunJam est redéployé. Une usurpation de l'adresse se voit avant toute promotion.
    @api
    Scénario: S'inscrire avec l'adresse désignée ne donne pas le rôle administrateur
      Soit AcroFunJam est déployé avec l'adresse "marc@example.org" désignée comme premier administrateur
      Et aucun administrateur n'existe
      Quand Marc s'inscrit avec l'adresse "marc@example.org"
      Alors Marc a pour seul rôle utilisateur

    @api
    Scénario: Le compte existant désigné comme premier administrateur le devient au déploiement
      Soit Marc est utilisateur avec l'adresse "marc@example.org"
      Et aucun administrateur n'existe
      Quand AcroFunJam est déployé avec l'adresse "marc@example.org" désignée comme premier administrateur
      Alors Marc est administrateur

    @api
    Scénario: Une personne qui n'est pas désignée comme premier administrateur reste utilisateur en s'inscrivant
      Soit AcroFunJam est déployé avec l'adresse "marc@example.org" désignée comme premier administrateur
      Quand Alice s'inscrit avec l'adresse "alice@example.org"
      Alors Alice a pour seul rôle utilisateur

    @api
    Scénario: La désignation d'un premier administrateur n'a plus d'effet quand un administrateur existe
      Soit Paul est administrateur
      Et Marc est utilisateur avec l'adresse "marc@example.org"
      Quand AcroFunJam est déployé avec l'adresse "marc@example.org" désignée comme premier administrateur
      Alors Marc a pour seul rôle utilisateur
