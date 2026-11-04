# language: fr
Fonctionnalité: Consulter les poses du catalogue
  Afin de découvrir les poses d'acroyoga
  En tant que visiteur
  Je veux voir la liste des poses publiées du catalogue avec leur nom, leur difficulté base, leur difficulté flyer
  et si elles peuvent commencer ou terminer un flow

  # Le catalogue ne contient que des poses publiées (voir context-map.md) :
  # une pose non publiée vit dans le contexte Contribution et ne peut pas apparaître ici.
  # Story 1 : poses publiées par amorçage de données, visiteur sans compte.
  # Refonte de la liste (décidée le 2026-11-03 avec la story « Proposer une pose ») : poses présentées en cartes
  # (mise en forme : docs/design/, hors scénarios), indicateurs en Oui / Non explicites, nombre de poses,
  # légende de l'échelle, avertissement de responsabilité sous la légende, état vide qui invite une personne
  # connectée à proposer la première pose. Les scénarios @web de la refonte sont livrés (story 3, étape B).
  # Hors périmètre : vignette photo, recherche, filtres, pagination ; définitions concrètes des niveaux
  # (textes à rédiger plus tard : seule l'échelle ordonnée est vérifiée).
  # L'invitation à proposer une pose depuis un catalogue non vide est spécifiée dans contribution/proposer-une-pose.feature.

  Règle: La liste présente toutes les poses publiées, chacune avec son nom, sa difficulté base et sa difficulté flyer

    @api @web
    Scénario: Un visiteur voit toutes les poses publiées du catalogue
      Soit les poses publiées suivantes dans le catalogue :
        | nom       | difficulté base | difficulté flyer |
        | Throne    | débutant        | découverte       |
        | Bird      | découverte      | découverte       |
        | High Bird | intermédiaire   | intermédiaire    |
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom       | difficulté base | difficulté flyer |
        | Throne    | débutant        | découverte       |
        | Bird      | découverte      | découverte       |
        | High Bird | intermédiaire   | intermédiaire    |

    @web
    Scénario: Le catalogue annonce le nombre de poses publiées
      Soit les poses publiées "Throne", "Bird" et "High Bird" dans le catalogue
      Quand un visiteur consulte les poses du catalogue
      Alors le catalogue annonce 3 poses

  Règle: La difficulté base et la difficulté flyer d'une pose sont présentées séparément, sur l'échelle découverte < débutant < intermédiaire < avancé

    @api @web
    Plan du Scénario: La pose "<nom>" est présentée avec sa difficulté base et sa difficulté flyer
      Soit la pose publiée "<nom>" de difficulté base "<difficulté base>" et de difficulté flyer "<difficulté flyer>"
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "<nom>" est présentée avec la difficulté base "<difficulté base>" et la difficulté flyer "<difficulté flyer>"

      Exemples: Chaque niveau de l'échelle, difficultés identiques ou différentes pour la base et le flyer
        | nom                   | difficulté base | difficulté flyer |
        | Folded Leaf           | découverte      | découverte       |
        | Reverse Bird          | débutant        | débutant         |
        | Star                  | intermédiaire   | intermédiaire    |
        | Hand-to-Hand (L-base) | intermédiaire   | avancé           |
        | Throne                | débutant        | découverte       |

  Règle: Le catalogue présente l'échelle de difficulté et l'avertissement de responsabilité

    @web
    Scénario: Un visiteur voit la légende de l'échelle de difficulté
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors le catalogue présente l'échelle de difficulté découverte < débutant < intermédiaire < avancé

    @web
    Scénario: Un visiteur voit l'avertissement de responsabilité sous la légende
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors le catalogue présente l'avertissement de responsabilité sous la légende de l'échelle de difficulté

  # Révise la décision de la story 1 (indicateurs non affichés sur la liste) : le langage publié du catalogue
  # expose désormais les deux indicateurs ; le site les présente en Oui / Non explicites.
  Règle: Chaque pose indique si elle peut commencer un flow et si elle peut terminer un flow

    # Révision du 2026-11-04 (expert acroyoga) : Folded Leaf et Whale, contestés, sont remplacés par Free Bird (termine
    # seulement) et Candlestick (commence seulement : exemple, pas une référence).
    # Mêmes exemples pour les deux cibles : livrés côté @api (story 3, étape A) et côté @web (étape B, refonte du catalogue).
    Plan du Scénario: La pose "<nom>" est présentée avec ses indicateurs de début et de fin de flow
      Soit la pose publiée "<nom>" qui <commencer> commencer un flow et <terminer> terminer un flow
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "<nom>" est présentée comme une pose qui <commencer> commencer un flow et <terminer> terminer un flow

      @api
      Exemples: API
        | nom         | commencer   | terminer    |
        | Bird        | peut        | peut        |
        | Free Bird   | ne peut pas | peut        |
        | Candlestick | peut        | ne peut pas |
        | Bow         | ne peut pas | ne peut pas |

      @web
      Exemples: Site
        | nom         | commencer   | terminer    |
        | Bird        | peut        | peut        |
        | Free Bird   | ne peut pas | peut        |
        | Candlestick | peut        | ne peut pas |
        | Bow         | ne peut pas | ne peut pas |

  Règle: Un catalogue sans pose publiée donne une liste vide, signalée au visiteur

    @api @web
    Scénario: Un visiteur est informé que le catalogue ne contient encore aucune pose
      Soit un catalogue sans aucune pose publiée
      Quand un visiteur consulte les poses du catalogue
      Alors le visiteur est informé que le catalogue ne contient encore aucune pose

    # Un visiteur ne voit aucune invitation à proposer une pose, même dans l'état vide.
    @web
    Scénario: Un catalogue vide n'invite pas un visiteur à proposer une pose
      Soit un catalogue sans aucune pose publiée
      Quand un visiteur consulte les poses du catalogue
      Alors le catalogue n'invite pas à proposer une pose

    @web
    Scénario: Un catalogue vide invite une personne connectée à proposer la première pose
      Soit un catalogue sans aucune pose publiée
      Et Alice est connectée sur le site avec l'adresse "alice@example.org"
      Quand Alice consulte les poses du catalogue
      Alors le catalogue invite à proposer la première pose

  # Ordre provisoire : un tri par difficulté ou par famille pourra le remplacer (decouverte.md).
  # Même comparaison que l'unicité du nom (décidée le 2026-11-03) : espaces superflus retirés, casse, accents
  # et ponctuation (trait d'union, apostrophe, parenthèses) ignorés ; le nom exact départage deux noms équivalents.
  # Règle garantie par l'API (ADR 0007) : vérifiée une fois côté @api ; le web affiche l'ordre reçu.
  Règle: Les poses sont présentées dans l'ordre alphabétique de leur nom, sans tenir compte de la casse, des accents ni de la ponctuation

    @api
    Scénario: Les poses sont présentées par ordre alphabétique de nom
      Soit les poses publiées "Throne", "Star", "Bird", "Hand-to-Hand (L-base)", "High Bird" et "Folded Leaf" dans le catalogue
      Quand un visiteur consulte les poses du catalogue
      Alors les poses sont présentées dans cet ordre :
        | nom                   |
        | Bird                  |
        | Folded Leaf           |
        | Hand-to-Hand (L-base) |
        | High Bird             |
        | Star                  |
        | Throne                |

    @api
    Scénario: Un nom accentué est classé comme s'il ne l'était pas
      Soit les poses publiées "Folded Leaf", "Étoile" et "Bird" dans le catalogue
      Quand un visiteur consulte les poses du catalogue
      Alors les poses sont présentées dans cet ordre :
        | nom         |
        | Bird        |
        | Étoile      |
        | Folded Leaf |

  # Le site distingue un AcroFunJam injoignable d'un catalogue vide.
  Règle: Le site signale un catalogue impossible à charger et permet de réessayer

    @web
    Scénario: Le site signale que le catalogue n'a pas pu être chargé
      Soit AcroFunJam est momentanément injoignable
      Quand un visiteur consulte les poses du catalogue
      Alors le site indique « Impossible de charger le catalogue. Vérifie ta connexion Internet, puis réessaie. »

    @web
    Scénario: Un visiteur charge le catalogue en réessayant quand AcroFunJam est de nouveau joignable
      Soit la pose publiée "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Et le chargement du catalogue a échoué car AcroFunJam était injoignable
      Et AcroFunJam est de nouveau joignable
      Quand le visiteur réessaie de charger le catalogue
      Alors la pose "Throne" est présentée avec la difficulté base "débutant" et la difficulté flyer "découverte"
