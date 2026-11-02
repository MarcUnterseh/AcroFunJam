# language: fr
# BROUILLON : rédigé avant la clarification des rôles (decouverte.md, « Rôles »). Ses règles de contenu
# seront reprises dans la story « Proposer une pose » ; ne pas implémenter en l’état.
Fonctionnalité: Publier une pose dans le catalogue
  Afin que les visiteurs découvrent une nouvelle pose
  En tant que validateur
  Je veux publier une pose dans le catalogue avec son nom, sa difficulté base, sa difficulté flyer
  et les indicateurs « peut commencer un flow » et « peut terminer un flow »

  # Le circuit de propositions (contexte Contribution) n'existe pas encore : un validateur
  # publie directement dans le catalogue (context-map.md, « Option pesée », conséquence à assumer).
  # Hors périmètre : description, photos, transitions, étiquettes.
  # Scénarios marqués « Q<n> » : rédigés selon la recommandation de l'analyse, à confirmer
  # par l'expert métier avant implémentation (voir les questions ouvertes de la story 2).
  # Cible : @api seule tant que la question d'un parcours web de publication n'est pas tranchée (Q9).

  Contexte:
    Soit Paul est validateur

  Règle: Une pose publiée par un validateur est visible des visiteurs dans le catalogue

    @api @wip
    Scénario: Une pose publiée par un validateur apparaît dans la liste consultée par les visiteurs
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Et Paul a publié la pose "Throne" de difficulté base "débutant" et de difficulté flyer "découverte"
      Quand un visiteur consulte les poses du catalogue
      Alors la liste présente exactement les poses suivantes :
        | nom    | difficulté base | difficulté flyer |
        | Bird   | découverte      | découverte       |
        | Throne | débutant        | découverte       |

  # Dépend de l'ADR Identité (Q8) : comment distinguer un validateur d'un visiteur.
  Règle: Seul un validateur peut publier une pose

    @api @wip
    Scénario: Un visiteur ne peut pas publier une pose
      Quand un visiteur publie une pose nommée "Throne"
      Alors la publication est refusée car seul un validateur peut publier une pose

  Règle: Une publication refusée ne publie rien

    @api @wip
    Scénario: Le catalogue reste inchangé après une publication refusée
      Soit un catalogue sans aucune pose publiée
      Et Paul a tenté de publier une pose sans nom
      Quand un visiteur consulte les poses du catalogue
      Alors le visiteur est informé que le catalogue ne contient encore aucune pose

  Règle: Le nom d'une pose est obligatoire

    # Les cellules d'un tableau Gherkin sont rognées : les noms à espaces sont écrits en clair dans les étapes.
    @api @wip
    Scénario: Une pose sans nom est refusée
      Quand Paul publie une pose nommée ""
      Alors la publication est refusée car le nom de la pose est obligatoire

    @api @wip
    Scénario: Une pose dont le nom ne contient que des espaces est refusée
      Quand Paul publie une pose nommée "   "
      Alors la publication est refusée car le nom de la pose est obligatoire

  # Q3 : suppression des espaces en début et en fin, espaces intérieurs consécutifs réduits à un seul.
  Règle: Les espaces superflus du nom sont supprimés, le reste du nom est conservé tel que saisi

    @api @wip
    Scénario: Les espaces en début et en fin de nom sont supprimés
      Quand Paul publie une pose nommée "  Folded Leaf  "
      Alors la pose est publiée sous le nom "Folded Leaf"

    @api @wip
    Scénario: Les espaces consécutifs à l'intérieur du nom sont réduits à un seul
      Quand Paul publie une pose nommée "High    Bird"
      Alors la pose est publiée sous le nom "High Bird"

    @api @wip
    Plan du Scénario: Le nom "<nom>" est publié tel que saisi
      Quand Paul publie une pose nommée "<nom>"
      Alors la pose est publiée sous le nom "<nom>"

      Exemples: Casse, traits d'union et parenthèses conservés
        | nom                   |
        | Hand-to-Hand (L-base) |
        | reverse bird          |
        | Front Bird            |

  # Q4 : longueur maximale recommandée de 60 caractères, après suppression des espaces superflus.
  Règle: Le nom d'une pose ne dépasse pas la longueur maximale

    @api @wip
    Scénario: Un nom de la longueur maximale est accepté
      Quand Paul publie une pose dont le nom compte 60 caractères
      Alors la pose est publiée

    @api @wip
    Scénario: Un nom plus long que la longueur maximale est refusé
      Quand Paul publie une pose dont le nom compte 61 caractères
      Alors la publication est refusée car le nom de la pose est trop long

  # Q1 [bloquant] : clé d'unicité recommandée = nom sans espaces superflus, sans tenir compte
  # de la casse, un trait d'union équivalant à un espace.
  Règle: Deux poses du catalogue ne peuvent pas porter le même nom

    @api @wip
    Plan du Scénario: Le nom "<nom>" est refusé car il désigne la pose déjà publiée "High Bird"
      Soit la pose publiée "High Bird" de difficulté base "intermédiaire" et de difficulté flyer "intermédiaire"
      Quand Paul publie une pose nommée "<nom>"
      Alors la publication est refusée car une pose de ce nom existe déjà dans le catalogue

      Exemples:
        | nom        |
        | High Bird  |
        | high bird  |
        | HIGH BIRD  |
        | High-Bird  |
        | high-bird  |
        | High  Bird |

    @api @wip
    Plan du Scénario: La variante "<variante>" est publiée à côté de la pose "Bird"
      Soit la pose publiée "Bird" de difficulté base "découverte" et de difficulté flyer "découverte"
      Quand Paul publie une pose nommée "<variante>"
      Alors la pose est publiée sous le nom "<variante>"

      Exemples:
        | variante     |
        | High Bird    |
        | Reverse Bird |
        | Front Bird   |

  Règle: Une pose a obligatoirement une difficulté base et une difficulté flyer, sur l'échelle découverte < débutant < intermédiaire < avancé

    @api @wip
    Plan du Scénario: La pose "<nom>" est publiée avec la difficulté base "<difficulté base>" et la difficulté flyer "<difficulté flyer>"
      Quand Paul publie la pose "<nom>" de difficulté base "<difficulté base>" et de difficulté flyer "<difficulté flyer>"
      Alors la pose "<nom>" est publiée avec la difficulté base "<difficulté base>" et la difficulté flyer "<difficulté flyer>"

      Exemples: Chaque niveau de l'échelle, difficultés identiques ou différentes pour la base et le flyer
        | nom                   | difficulté base | difficulté flyer |
        | Folded Leaf           | découverte      | découverte       |
        | Reverse Bird          | débutant        | débutant         |
        | Star                  | intermédiaire   | intermédiaire    |
        | Hand-to-Hand (L-base) | avancé          | avancé           |
        | Throne                | débutant        | découverte       |

    @api @wip
    Plan du Scénario: Une pose sans <difficulté manquante> est refusée
      Quand Paul publie la pose "Throne" sans <difficulté manquante>
      Alors la publication est refusée car <motif>

      Exemples:
        | difficulté manquante | motif                                |
        | difficulté base      | la difficulté base est obligatoire   |
        | difficulté flyer     | la difficulté flyer est obligatoire  |

    @api @wip
    Scénario: Une difficulté hors de l'échelle est refusée
      Quand Paul publie la pose "Throne" de difficulté base "expert" et de difficulté flyer "découverte"
      Alors la publication est refusée car le niveau de difficulté "expert" n'existe pas

  # Q5 : indicateurs obligatoires, sans valeur par défaut ; une pose peut n'avoir aucun des deux.
  # Q6 : comment ces indicateurs sont-ils observables (ils ne figurent pas dans la liste de la story 1) ?
  # Les valeurs ci-dessous illustrent les combinaisons, elles sont à faire valider par l'expert métier.
  Règle: Une pose précise si elle peut commencer un flow et si elle peut terminer un flow

    @api @wip
    Plan du Scénario: La pose "<nom>" est publiée avec ses indicateurs de début et de fin de flow
      Quand Paul publie la pose "<nom>" qui <commencer> commencer un flow et <terminer> terminer un flow
      Alors la pose publiée "<nom>" <commencer> commencer un flow
      Et la pose publiée "<nom>" <terminer> terminer un flow

      Exemples:
        | nom         | commencer    | terminer     |
        | Bird        | peut         | peut         |
        | Throne      | peut         | ne peut pas  |
        | Folded Leaf | ne peut pas  | peut         |
        | Star        | ne peut pas  | ne peut pas  |

    @api @wip
    Plan du Scénario: Une pose qui ne précise pas si elle peut <indicateur> un flow est refusée
      Quand Paul publie la pose "Throne" sans préciser si elle peut <indicateur> un flow
      Alors la publication est refusée car il faut préciser si la pose peut <indicateur> un flow

      Exemples:
        | indicateur |
        | commencer  |
        | terminer   |
