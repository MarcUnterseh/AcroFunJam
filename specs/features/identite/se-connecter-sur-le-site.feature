# language: fr
Fonctionnalité: S'inscrire et se connecter sur le site
  Afin de pouvoir bientôt proposer des poses
  En tant que personne qui utilise AcroFunJam sur le site
  Je veux m'inscrire, me connecter, me déconnecter et savoir à tout moment si je suis connectée

  # Story 2b, contexte Identité, cible @web seule. Décisions : decouverte.md, « Story 2b » (validé le 2026-11-03).
  # Les règles métier (rôle utilisateur à l'inscription, unicité de l'adresse, refus de connexion générique,
  # longueur minimale du mot de passe, verrouillage) sont vérifiées une fois côté @api dans comptes-et-roles.feature :
  # on ne vérifie ici que le parcours sur le site.
  # Observations stables : un visiteur voit l'en-tête lui proposer de se connecter et de s'inscrire ;
  # une personne connectée voit l'en-tête indiquer son adresse e-mail.

  Règle: Une personne qui s'inscrit sur le site est aussitôt connectée

    @web
    Scénario: Une personne qui s'inscrit sur le site est connectée avec son adresse
      Quand Alice s'inscrit sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors l'en-tête indique qu'Alice est connectée avec l'adresse "alice@example.org"

  Règle: Le site explique pourquoi une inscription est refusée

    @web
    Scénario: Le site signale qu'une adresse e-mail sert déjà à un compte
      Soit Alice a un compte avec l'adresse "alice@example.org"
      Quand une personne s'inscrit sur le site avec l'adresse "alice@example.org"
      Alors le site indique que l'inscription est refusée car l'adresse e-mail sert déjà à un compte
      Et l'en-tête propose de se connecter et de s'inscrire

  # Règle de mot de passe : au moins 10 caractères, sans exigence de composition (phrases de passe).
  # Le site applique la même règle que l'API, avant l'envoi.
  Règle: Le site annonce et vérifie la longueur minimale du mot de passe

    @web
    Scénario: L'exigence de mot de passe est annoncée avant la saisie
      Quand une personne commence à s'inscrire sur le site
      Alors le site indique « Ton mot de passe doit contenir au moins 10 caractères. »

    @web
    Scénario: Le site refuse un mot de passe trop court
      Quand une personne s'inscrit sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-26"
      Alors le site indique que l'inscription est refusée car le mot de passe doit contenir au moins 10 caractères

  # Vérifié par le site avant l'envoi.
  Règle: Le site signale une adresse e-mail ou un mot de passe manquant ou mal formé

    @web
    Plan du Scénario: Le site refuse de <demande> quand <cas>
      Quand une personne demande à <demande> sur le site avec l'adresse "<adresse>" et le mot de passe "<mot de passe>"
      Alors le site indique que <motif>

      Exemples:
        | demande      | cas                          | adresse           | mot de passe     | motif                              |
        | s'inscrire   | l'adresse est vide           |                   | Throne-Bird-2026 | l'adresse e-mail est obligatoire   |
        | s'inscrire   | l'adresse est mal formée     | alice.example.org | Throne-Bird-2026 | l'adresse e-mail n'est pas valide  |
        | s'inscrire   | le mot de passe est vide     | alice@example.org |                  | le mot de passe est obligatoire    |
        | se connecter | l'adresse est vide           |                   | Throne-Bird-2026 | l'adresse e-mail est obligatoire   |
        | se connecter | l'adresse est mal formée     | alice.example.org | Throne-Bird-2026 | l'adresse e-mail n'est pas valide  |
        | se connecter | le mot de passe est vide     | alice@example.org |                  | le mot de passe est obligatoire    |

  Règle: Une personne inscrite se connecte sur le site avec son adresse e-mail et son mot de passe

    Contexte:
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"

    @web
    Scénario: Une personne inscrite qui se connecte sur le site voit qu'elle est connectée
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors l'en-tête indique qu'Alice est connectée avec l'adresse "alice@example.org"

    # Retour à la page d'origine (pages du site uniquement) ; aujourd'hui, la seule page est le catalogue.
    @web
    Scénario: Après la connexion, la personne retrouve la page qu'elle consultait
      Soit Alice consulte les poses du catalogue en tant que visiteur
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors Alice retrouve les poses du catalogue

    # Refus générique : un seul cas suffit côté site, l'API couvre l'adresse inconnue.
    @web
    Scénario: Le site signale que l'adresse e-mail ou le mot de passe est incorrect
      Quand une personne se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Star-2026-Bird"
      Alors le site indique que la connexion est refusée car l'adresse e-mail ou le mot de passe est incorrect
      Et l'en-tête propose de se connecter et de s'inscrire

    # Verrouillage : réglages par défaut d'ASP.NET Core Identity (5 échecs, 5 minutes).
    @web
    Scénario: Le site signale qu'il y a eu trop de tentatives de connexion
      Soit 5 tentatives de connexion avec l'adresse "alice@example.org" ont échoué
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors le site indique qu'il y a eu trop de tentatives de connexion et qu'il faut réessayer dans quelques minutes

  # Un incident technique ne doit pas passer pour un refus, ni faire perdre la saisie.
  Règle: Le site distingue un AcroFunJam injoignable d'un refus de connexion

    Contexte:
      Soit Alice a un compte avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"

    @web
    Scénario: Le site signale qu'AcroFunJam est injoignable et conserve la saisie
      Soit AcroFunJam est momentanément injoignable
      Quand Alice se connecte sur le site avec l'adresse "alice@example.org" et le mot de passe "Throne-Bird-2026"
      Alors le site indique que la connexion n'a pas pu aboutir et qu'Alice peut réessayer
      Et l'adresse "alice@example.org" saisie par Alice est conservée

    @web
    Scénario: Une personne se connecte en réessayant quand AcroFunJam est de nouveau joignable
      Soit la connexion d'Alice n'a pas pu aboutir car AcroFunJam était injoignable
      Et AcroFunJam est de nouveau joignable
      Quand Alice réessaie de se connecter
      Alors l'en-tête indique qu'Alice est connectée avec l'adresse "alice@example.org"

  # Une déconnexion vaut pour tous les onglets (session portée par des cookies gérés par l'API).
  Règle: Une personne qui se déconnecte redevient visiteur, partout sur le site

    @web
    Scénario: Une personne qui se déconnecte redevient visiteur
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice se déconnecte
      Alors l'en-tête propose de se connecter et de s'inscrire

    @web
    Scénario: Une personne déconnectée reste visiteur après un rechargement du site
      Soit Alice s'est déconnectée du site
      Quand Alice recharge le site
      Alors l'en-tête propose de se connecter et de s'inscrire

    @web
    Scénario: Se déconnecter dans un onglet déconnecte aussi les autres
      Soit Alice a le site ouvert deux fois, connectée avec l'adresse "alice@example.org"
      Et Alice s'est déconnectée sur l'un des deux
      Quand Alice revient sur l'autre
      Alors l'en-tête propose de se connecter et de s'inscrire

  Règle: La session d'une personne connectée est conservée tant qu'elle n'a pas expiré

    @web
    Scénario: La session survit à un rechargement du site
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice recharge le site
      Alors l'en-tête indique qu'Alice est connectée avec l'adresse "alice@example.org"

    # Le renouvellement de la session est invisible pour la personne.
    # Le renouvellement de la session (cookie glissant) est vérifié côté API, horloge simulée
    # (api/tests/AcroFunJam.Api.Tests/SessionCookieTests.cs) : le site n'a rien à faire pour le permettre.

    @web
    Scénario: Une personne dont la session a expiré en est informée et peut se reconnecter
      Soit Alice est connectée sur le site avec l'adresse "alice@example.org"
      Et la session d'Alice a expiré
      Quand Alice consulte les poses du catalogue
      Alors le site informe Alice que sa session a expiré et qu'elle peut se connecter de nouveau
      Et l'en-tête propose de se connecter et de s'inscrire

  # Le contenu du catalogue est vérifié dans catalogue/consulter-les-poses.feature.
  Règle: Un visiteur consulte le catalogue sans compte et se voit proposer de se connecter ou de s'inscrire

    @web
    Scénario: Un visiteur se voit proposer de se connecter ou de s'inscrire
      Quand un visiteur consulte les poses du catalogue
      Alors l'en-tête propose de se connecter et de s'inscrire

    # Garde-fou contre un futur « mur de connexion » : réutilise les steps du catalogue.
    @web
    Scénario: Un visiteur consulte les poses du catalogue sans compte
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "débutant" et la difficulté flyer "découverte"
