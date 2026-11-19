# language: fr
@Integration
Fonctionnalité: Consulter les étiquettes des poses
  Afin de savoir, avant de la travailler, si une pose est par exemple une inversion ou une pose lunaire
  En tant que visiteur
  Je veux voir les étiquettes de chaque pose dans le catalogue et sur la page de la pose

  # Story 9a « Étiqueter les poses », volet Catalogue : présentation. Décisions du porteur du produit (2026-11-18) :
  # decouverte.md, « Story 9a Étiqueter les poses ». Prolonge catalogue/consulter-les-poses.feature,
  # catalogue/consulter-les-transitions.feature (page d'une pose) et catalogue/consulter-les-etiquettes-des-transitions.feature
  # (story 8), dont les règles ne sont pas répétées.
  #
  # Décisions principales :
  # - les poses publiées avant la story restent publiées, sans étiquette ;
  # - la carte d'une pose du catalogue présente ses étiquettes, sans description, et rien (pas « aucune ») si la pose
  #   n'en porte pas (Q173) ;
  # - la page d'une pose présente ses étiquettes en pastilles dans son en-tête ; leur description se lit dans le repli
  #   « Ce que veulent dire les étiquettes de la pose » (Q174) ;
  # - ordre du catalogue sur le nom ; nom actuel des étiquettes (story 8) ;
  # - les étiquettes d'une pose et celles de ses transitions sont indépendantes, sans héritage (Q177).
  # Exemples (expert acroyoga) : Folded Leaf et Straddle Bat (lunaire, inversion), Candlestick (inversion), Throne (aucune).
  # Hors périmètre : filtre par étiquette dans le catalogue (Q179), générateur de flow, écran mobile (Q180).

  Contexte:
    Soit la liste des étiquettes est la liste amorcée
    Et les poses publiées "Throne", "Bird", "Folded Leaf", "Candlestick" et "Straddle Bat" dans le catalogue

  Règle: Les poses publiées avant les étiquettes des poses restent publiées, sans étiquette

    @api
    Scénario: Une pose publiée avant les étiquettes des poses n'en porte aucune
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page présente la pose "Throne" sans étiquette

  Règle: La page d'une pose présente les étiquettes de la pose

    @api @web
    Scénario: Un visiteur voit les étiquettes d'une pose sur sa page
      Soit la pose "Folded Leaf" porte les étiquettes "lunaire" et "inversion"
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "inversion" et "lunaire"

  Règle: Le catalogue présente les étiquettes de chaque pose

    @api @web
    Scénario: Un visiteur voit les étiquettes des poses dans le catalogue
      Soit la pose "Straddle Bat" porte les étiquettes "lunaire" et "inversion"
      Et la pose "Candlestick" porte l'étiquette "inversion"
      Quand un visiteur consulte les poses du catalogue
      Alors les poses du catalogue présentent exactement les étiquettes suivantes :
        | nom          | étiquettes         |
        | Bird         |                    |
        | Candlestick  | inversion          |
        | Folded Leaf  |                    |
        | Straddle Bat | inversion, lunaire |
        | Throne       |                    |

  # Garanti par l'API (ADR 0007) : vérifié une fois côté @api, le site affiche l'ordre reçu.
  Règle: Les étiquettes d'une pose sont présentées dans l'ordre du catalogue sur leur nom

    @api
    Scénario: Les étiquettes d'une pose sont triées par nom
      Soit la pose "Folded Leaf" porte les étiquettes "lunaire" et "inversion"
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la pose "Folded Leaf" présente ses étiquettes dans cet ordre : "inversion", "lunaire"

  # Q173 : ni « aucune », ni ligne vide.
  Règle: Une pose sans étiquette n'en présente aucune

    @web
    Scénario: Le site ne présente aucune étiquette sur la page d'une pose qui n'en porte pas
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page de la pose "Throne" ne présente aucune étiquette

    @web
    Scénario: Le site ne présente aucune étiquette sur la carte d'une pose qui n'en porte pas
      Quand un visiteur consulte les poses du catalogue
      Alors la carte de la pose "Throne" ne présente aucune étiquette

  Règle: Le visiteur lit, depuis la page d'une pose, la description de ses étiquettes

    @web
    Scénario: Un visiteur lit la description d'une étiquette de la pose
      Soit la pose "Folded Leaf" porte l'étiquette "lunaire"
      Quand un visiteur déplie « Ce que veulent dire les étiquettes de la pose » sur la page de la pose "Folded Leaf"
      Alors le site présente la description de l'étiquette « lunaire » : « Pratique thérapeutique : le flyer, détendu et passif, se laisse porter et étirer par la base ; les passages se font lentement. Ex. : Folded Leaf, Straddle Bat. »

  Règle: Une pose présente le nom actuel de ses étiquettes

    @api
    Scénario: Après le renommage d'une étiquette, la pose la présente sous son nouveau nom
      Soit Bruno est validateur
      Et la pose "Folded Leaf" porte l'étiquette "lunaire"
      Et Bruno a renommé l'étiquette "lunaire" en "Lunaire"
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" avec les étiquettes "Lunaire"

  # Q177 : le générateur de flow (story 9) décidera comment il combine les deux.
  Règle: Les étiquettes d'une pose ne s'appliquent pas à ses transitions

    @api
    Scénario: Une transition vers une pose étiquetée ne porte pas les étiquettes de la pose
      Soit la pose "Folded Leaf" porte l'étiquette "lunaire"
      Et la transition publiée sans nom de "Bird" vers "Folded Leaf" de difficulté base "débutant" et de difficulté flyer "débutant"
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors les transitions depuis la pose "Bird" sont exactement :
        | pose d'arrivée | nom | étiquettes |
        | Folded Leaf    |     |            |
