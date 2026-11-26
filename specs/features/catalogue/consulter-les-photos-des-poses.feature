# language: fr
@Integration
Fonctionnalité: Consulter les photos des poses
  Afin de reconnaître une pose d'un coup d'œil
  En tant que visiteur
  Je veux voir la photo principale de chaque pose dans le catalogue, et toutes ses photos sur la page de la pose

  # Story 10 « Photos des poses », volet Catalogue : présentation. Validée le 2026-11-20 par le porteur du produit, avec
  # les avis de l'expert acroyoga (AY-8 à AY-15) et de l'ux-expert (UX-15 à UX-29) : decouverte.md, « Story 10 Photos
  # des poses ». Scénarios @wip : pas encore implémentés. Prolonge catalogue/consulter-les-poses.feature (story 1, qui
  # avait mis la vignette hors périmètre) et catalogue/consulter-les-transitions.feature (page d'une pose, story 7).
  # Les règles d'ajout sont dans catalogue/ajouter-des-photos-a-une-pose.feature.
  #
  # Décisions principales :
  # - la carte d'une pose du catalogue présente sa photo principale en petite vignette carrée, à côté du nom, dans la
  #   ligne du haut ; décorative pour les lecteurs d'écran ; ni vignette ni espace réservé sans photo (décision 4) ;
  # - révisé le 2026-11-20 par le porteur du produit : en tête du corps de la page d'une pose, seule la photo
  #   principale ; sous elle, quand il y a d'autres photos, « Voir les 2 autres photos » (« Voir l'autre photo »), qui
  #   descend vers la section « Autres photos de Bird », tout en bas de la page, après les transitions ;
  #   « Photo : <crédit> » sous chaque photo ; rien pour un visiteur quand la pose n'a pas de photo (Q261, UX-15) ;
  # - agrandissement en dialogue sur toutes les photos, principale comprise : « Photo 2 sur 3 de Bird », « Fermer »,
  #   « Photo précédente », « Photo suivante » ; Échap ferme ; l'adresse porte la photo agrandie, si bien que revenir
  #   en arrière la ferme ;
  # - vignette du catalogue : à revoir avec de vraies photos (remarque du porteur du produit) ;
  # - révisé le 2026-11-26 : texte alternatif facultatif ; sans lui, le site présente « Photo 2 de Bird » (pose et rang) ;
  # - le repère « Photo principale » n'est présenté qu'aux validateurs et aux administrateurs.
  # Règles d'interface sans scénario dédié (tests unitaires, revue des captures, ui-designer) : cadrage de la vignette
  # (qui ne coupe pas les poses verticales), disposition de la galerie, avertissement de responsabilité visible avant
  # ou à côté des photos, chargement différé.
  #
  # Hors périmètre : photos des transitions, photos dans le flow généré, écran mobile, consultation hors ligne.

  Contexte:
    Soit les poses publiées "Bird", "Throne", "Folded Leaf" et "Reverse Bird" dans le catalogue
    Et la pose "Bird" a pour photos, dans cet ordre :
      | fichier                             | texte alternatif   | crédit       |
      | une photo JPEG de 2 Mo de 1600×1200 | Bird vue de profil | Léa Martin   |
      | une photo WebP de 1 Mo de 1200×1600 | Bird vue de face   | Hugo Bernard |
      | une photo PNG de 3 Mo de 1600×1200  | Bird, les prises   | Lulu Acro    |

  Règle: La carte d'une pose du catalogue présente sa photo principale en vignette

    @api
    Scénario: Le catalogue indique la photo principale de chaque pose qui en a une
      Quand un visiteur consulte les poses du catalogue
      Alors la pose "Bird" est présentée avec la vignette de sa photo « Bird vue de profil »
      Et la pose "Throne" est présentée sans vignette

    @web
    Scénario: Sur le site, la carte d'une pose présente une petite vignette carrée à côté de son nom
      Quand un visiteur consulte les poses du catalogue
      Alors la carte de la pose "Bird" présente une vignette carrée à côté du nom de la pose
      Et la carte de la pose "Throne" ne présente aucune vignette ni espace réservé

    @web
    Scénario: La vignette d'une carte n'est pas lue par les lecteurs d'écran, qui lisent déjà le nom de la pose
      Quand un visiteur consulte les poses du catalogue
      Alors la vignette de la carte de la pose "Bird" est décorative pour les lecteurs d'écran

  Règle: La page d'une pose présente toutes ses photos, la principale en premier, avec leur texte alternatif et leur crédit

    @api @web
    Scénario: Un visiteur voit les photos d'une pose sur sa page
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la page présente la pose "Bird" avec exactement les photos :
        | texte alternatif   | crédit       |
        | Bird vue de profil | Léa Martin   |
        | Bird vue de face   | Hugo Bernard |
        | Bird, les prises   | Lulu Acro    |

  # Révisé le 2026-11-20 : seule la photo principale en tête de la page ; les autres en bas, après les transitions.
  Règle: Sur le site, la photo principale est en tête de la page d'une pose, les autres photos tout en bas, après les transitions

    @web
    Scénario: Seule la photo principale est présentée en tête de la page, avec son crédit
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la page de la pose présente en tête la seule photo « Bird vue de profil », avec le crédit « Photo : Léa Martin »

    @web
    Scénario: Sous la photo principale, un lien mène aux autres photos, tout en bas de la page
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la page de la pose présente, sous la photo principale, le lien « Voir les 2 autres photos »
      Et la section « Autres photos de Bird », après les transitions, présente dans cet ordre « Bird vue de face » et « Bird, les prises »
      Et le site présente la photo « Bird vue de face » avec le crédit « Photo : Hugo Bernard »

    @web
    Scénario: Le lien dit « Voir l'autre photo » quand la pose n'a qu'une autre photo
      Soit la pose "Reverse Bird" a pour photos, dans cet ordre :
        | fichier                             | texte alternatif           | crédit     |
        | une photo JPEG de 2 Mo de 1600×1200 | Reverse Bird vu de profil  | Léa Martin |
        | une photo JPEG de 2 Mo de 1600×1200 | Reverse Bird vu de face    | Léa Martin |
      Quand un visiteur consulte la pose "Reverse Bird" du catalogue
      Alors la page de la pose présente, sous la photo principale, le lien « Voir l'autre photo »

    @web
    Scénario: Une pose qui n'a que sa photo principale ne présente ni lien ni section des autres photos à un visiteur
      Soit la pose "Throne" a pour photos, dans cet ordre :
        | fichier                             | texte alternatif     | crédit     |
        | une photo JPEG de 2 Mo de 1600×1200 | Throne vu de profil  | Léa Martin |
      Quand un visiteur consulte la pose "Throne" du catalogue
      Alors la page de la pose présente en tête la seule photo « Throne vu de profil »
      Et la page de la pose ne présente ni lien vers d'autres photos ni section « Autres photos de Throne »

    @web
    Scénario: Un visiteur ne voit pas quelle photo est la photo principale
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors aucune photo de la pose "Bird" n'est marquée « Photo principale »

  # Révision du porteur du produit (2026-11-26) : le texte alternatif est facultatif. Le site, pas l'API, présente un
  # texte de repli tiré de la pose et du rang de la photo dans l'ordre de présentation ; la vignette du catalogue reste
  # décorative (règle de la vignette inchangée).
  Règle: Sur le site, une photo sans texte alternatif est décrite par la pose et son rang

    @web
    Scénario: Une photo sans texte alternatif porte le texte « Photo 2 de Bird »
      Soit la photo « Bird vue de face » de la pose "Bird" n'a plus de texte alternatif
      Quand un visiteur consulte la pose "Bird" du catalogue
      Alors la section « Autres photos de Bird » présente dans cet ordre « Photo 2 de Bird » et « Bird, les prises »

  Règle: Une pose sans photo n'en présente aucune

    @api
    Scénario: La page d'une pose sans photo ne présente aucune photo
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page présente la pose "Folded Leaf" sans photo

    @web
    Scénario: Pour un visiteur, la page d'une pose sans photo ne présente aucune photo ni section des photos
      Quand un visiteur consulte la pose "Folded Leaf" du catalogue
      Alors la page de la pose ne présente ni photo principale, ni lien vers d'autres photos, ni section « Autres photos de Folded Leaf »

  Règle: Sur le site, un visiteur agrandit une photo et passe d'une photo à l'autre, parmi toutes les photos de la pose

    @web
    Scénario: Depuis la photo principale agrandie, la photo suivante est la première des autres photos
      Soit un visiteur a agrandi la photo « Bird vue de profil » sur la page de la pose "Bird"
      Quand le visiteur passe à la photo suivante
      Alors le site présente en grand la photo « Photo 2 sur 3 de Bird », « Bird vue de face »


    @web
    Scénario: Le visiteur agrandit une photo de la pose
      Quand un visiteur agrandit la photo « Bird vue de face » sur la page de la pose "Bird"
      Alors le site présente en grand la photo « Photo 2 sur 3 de Bird », avec le crédit « Photo : Hugo Bernard »
      Et le visiteur peut fermer l'agrandissement, ou passer à la photo précédente ou à la photo suivante

    @web
    Scénario: Le visiteur passe à la photo suivante dans l'agrandissement
      Soit un visiteur a agrandi la photo « Bird vue de face » sur la page de la pose "Bird"
      Quand le visiteur passe à la photo suivante
      Alors le site présente en grand la photo « Photo 3 sur 3 de Bird », « Bird, les prises »

    # Le retour du téléphone ferme l'agrandissement plutôt que de quitter la page.
    @web
    Scénario: Revenir en arrière ferme l'agrandissement et laisse le visiteur sur la page de la pose
      Soit un visiteur a agrandi la photo « Bird vue de face » sur la page de la pose "Bird"
      Quand le visiteur revient en arrière
      Alors le site présente la page de la pose "Bird", sans agrandissement
