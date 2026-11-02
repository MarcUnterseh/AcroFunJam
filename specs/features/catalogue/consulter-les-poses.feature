# language: fr
Fonctionnalité: Consulter les poses du catalogue
  Afin de découvrir les poses d'acroyoga
  En tant que visiteur
  Je veux voir la liste des poses publiées du catalogue avec leur nom, leur difficulté base et leur difficulté flyer

  # Le catalogue ne contient que des poses publiées (voir context-map.md) :
  # une pose non publiée vit dans le contexte Contribution et ne peut pas apparaître ici.
  # Dans cette story, les poses sont publiées par amorçage de données, et le visiteur n'a pas de compte.

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
        | Hand-to-Hand (L-base) | avancé          | avancé           |
        | Throne                | débutant        | découverte       |

  Règle: Un catalogue sans pose publiée donne une liste vide, signalée au visiteur

    @api @web
    Scénario: Un visiteur est informé que le catalogue ne contient encore aucune pose
      Soit un catalogue sans aucune pose publiée
      Quand un visiteur consulte les poses du catalogue
      Alors le visiteur est informé que le catalogue ne contient encore aucune pose

  # Ordre provisoire : un tri par difficulté ou par famille pourra le remplacer (decouverte.md).
  # Règle garantie par l’API (ADR 0007) : vérifiée une fois côté @api ; le web affiche l’ordre reçu.
  Règle: Les poses sont présentées dans l'ordre alphabétique de leur nom, sans tenir compte de la casse ni des traits d'union

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
