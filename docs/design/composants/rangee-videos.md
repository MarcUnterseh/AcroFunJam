# Rangée de vidéos (bloc « Vidéos » d'un élément de transition)

Story 12 (V15, V18 à V20, V22 ; UX-50 option (b), UX-58). Dans l'élément d'une transition (`element-transition.md`), les vidéos sont présentées en **rangée horizontale d'affiches compactes**, précédées du **rappel de sécurité**. Chaque vidéo : `lecteur-video.md` (prête) ou `bloc-preparation-video.md` (en préparation, impossible à préparer). Écran : `../ecrans/12-videos-des-transitions.md`. Tokens nouveaux : `sizes.videoPoster` (120), `sizes.videoMaxHeight` (480).

## Place dans l'élément

Titre, autre pose, difficultés, ligne « Étiquettes », description de la transition, **bloc « Vidéos »**, repli « Ce que veulent dire ces étiquettes », pied de gestion. Le bloc est **absent du DOM** quand la transition n'a aucune vidéo présentée à la personne (visiteur : aucune vidéo prête ; validateur : aucune vidéo du tout) : ni titre, ni rappel, ni place réservée.

## Structure

```
Vidéos                                        <- h4 (proposé), size.sm, semibold, textMuted
(!) Une vidéo montre une façon de faire ;     <- rappel : icône spot sunStrong + size.sm text
    elle ne remplace ni un cours ni un spotter.
┌────────────┐ ┌────────────┐                 <- grille : colonnes d'au moins videoPoster (120)
│ affiche 1  │ │ affiche 2  │                    2 colonnes à 320 px, 3 dans une colonne de 448 px
└────────────┘ └────────────┘
légende 1      légende 2
Vidéo : …      Vidéo : …
┌────────────┐
│ affiche 3  │
└────────────┘
…
```

Balisage : `div.transition-videos` (`role="group"`, `aria-labelledby` = titre) > `h4.transition-videos__title` (« Vidéos » + texte masqué « de Pop to Bird ») + `p.transition-videos__reminder` + `ul.transition-videos__list[role="list"]` > `li.video` × 1 à 3 ; puis, pour un validateur, le message d'échec de préparation (ci-dessous).

| Élément | Tokens |
|---|---|
| Bloc | `display: grid`, écart `spacing.sm` ; marge haute `spacing.xs` (en plus de l'écart de l'élément, comme la description) ; `min-width: 0` |
| Titre « Vidéos » (**proposé**, `ux-expert`) | `h4`, `size.sm`, `semibold`, `textMuted` (7,0 / 7,3:1 sur `surface`), interligne `tight`, `margin: 0` : même rendu que le terme « Étiquettes » de la ligne d'étiquettes. Il donne une entrée de titre aux lecteurs d'écran (« Vidéos de Pop to Bird ») |
| Rappel de sécurité | `p`, `display: flex`, `align-items: flex-start`, écart `spacing.xs` ; `size.sm`, `text` (16,2 / 14,4:1) ; icône **spot** `sizes.icon` en **`sunStrong`** (5,2 / 10,4:1 sur `surface`), `aria-hidden` ; **sans fond** : c'est une phrase, pas la note de sécurité de la page (fond `sunSurface`), qui resterait le seul encadré de sécurité. Texte validé : « Une vidéo montre une façon de faire ; elle ne remplace ni un cours ni un spotter. » |
| Grille (`ul`) | `display: grid`, **`grid-template-columns: repeat(auto-fill, minmax(sizes.videoPoster, 1fr))`**, écart `spacing.md` (rangées) `spacing.sm` (colonnes) ; `margin: 0`, `padding: 0`, `list-style: none` ; jamais de `dense` |

### Pourquoi une grille qui passe à la ligne, et pas un ruban qui défile

À 320 px, la colonne de l'élément fait 256 px : trois affiches de front y feraient 80 px, trop étroites pour la légende, le crédit et les boutons « Modifier » / « Retirer ». Un ruban à défilement horizontal cacherait la troisième vidéo, rognerait l'anneau de focus et se disputerait le geste de balayage avec la page. La grille `auto-fill` garde des affiches **compactes** (120 à 146 px) partout et ne cache rien :

| Largeur de l'élément (contenu) | Colonnes | Largeur d'une affiche |
|---|---|---|
| 256 px (téléphone 320 px) | 2 | 124 px |
| 448 px (grand écran, transitions côte à côte) | 3 | 144 px |
| 560 à 720 px (40 à 64em, une seule colonne) | 4 à 5 | 120 à 140 px (3 vidéos au plus : la rangée reste à gauche) |

Une seule vidéo : une affiche de 124 à 144 px, à gauche ; elle ne s'étire jamais sur toute la largeur tant qu'elle n'est pas lancée.

### Une vidéo qui a besoin de place prend toute la rangée

Lancée (`lecteur-video.md`), en **modification** ou en **confirmation de retrait**, la vidéo prend `grid-column: 1 / -1`, **à sa place** : les vidéos avant et après restent compactes, dans l'ordre d'ajout (une cellule vide peut rester sur la ligne précédente). Une seule à la fois.

## Validateur et administrateur

### Sous chaque vidéo : « Modifier », « Retirer »

```
Pop to Bird, tutoriel
Vidéo : Hugo Bernard
┄┄┄┄┄┄┄┄┄┄┄┄          <- pointillé divider
[  Modifier  ]         <- secondaires 44 px, pleine largeur de la cellule, empilés
[  Retirer   ]
```

| Élément | Tokens |
|---|---|
| Pied de la vidéo (`div.video__actions`) | bordure haute `borderWidth` **pointillée** `divider`, padding haut `spacing.sm`, marge haute `spacing.xs` ; `display: grid`, écart `spacing.sm` |
| Boutons | `bouton.md` **secondaires**, `min-block-size: sizes.touchTarget`, padding `0 spacing.md`, **pleine largeur de la cellule** (une cellule fait au moins 120 px : « Modifier » ≈ 92 px tient) ; noms accessibles suffixés de la légende (texte masqué) : « Modifier Pop to Bird, tutoriel », « Retirer Pop to Bird, tutoriel » |

**Modifier** (en place) : la vidéo prend toute la rangée ; l'affiche reste **compacte** (`inline-size: sizes.videoPoster`), et la figcaption et le pied sont remplacés par la zone de `galerie-photos.md` (« Modification sur place ») sur fond **`background`**, rayon `radius.sm`, padding `spacing.md` (rendu de la zone « Étiqueter » dans un élément `surface`) : titre « Modifier la vidéo » (proposé), champs Légende, Crédit, Description de la vidéo (`champ-video.md`, mêmes aides et compteurs), « Enregistrer la vidéo » (primaire, proposé) et « Annuler ».

**Retirer** : même zone, « Retirer cette vidéo de Pop to Bird ? » (`semibold`), conséquence pour la dernière « Pop to Bird n'aura plus de vidéo. » (`size.sm`, `textMuted`), « Retirer la vidéo » et « Annuler », **deux secondaires**, jamais de rouge plein ; empilés sous 22em de zone, en ligne au-delà.

### Échec de préparation : message au niveau du bloc

Une cellule « Impossible à préparer » (`bloc-preparation-video.md`) est trop étroite pour la phrase d'aide ; elle est donnée **sous la grille**, pleine largeur du bloc, une par vidéo concernée :

```
┃(!) La vidéo « Pop to Bird, vue de côté » n'a pas pu
┃    être préparée. Retire-la, puis envoie-la de nouveau
┃    ou choisis-en une autre.
```

Rendu de l'**alerte** (`alerte-formulaire.md`) : fond `dangerSurface`, barre gauche `sizes.accentBar` `danger`, rayon `radius.md`, padding `spacing.sm spacing.md`, icône erreur `danger` ; texte **`size.sm`** `text`. Pas de `role="alert"` au chargement de la page (ce n'est pas une réponse à une action) ; quand l'échec survient pendant la consultation, l'annonce passe par la zone de statut (`annonce-statut.md`, `ux-expert`).

### Pied de gestion de la transition

Le pied existant (« Étiqueter », `zone-etiqueter.md`) reçoit l'invitation aux vidéos :

```
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
[ Étiqueter ]
[ + Ajouter une vidéo ]  1 vidéo sur 3       <- groupe insécable : bouton et repère ensemble

à 3 vidéos :
[ Étiqueter ]
Pop to Bird a déjà 3 vidéos, le maximum.
Retire une vidéo pour en ajouter une autre.
```

| Élément | Tokens |
|---|---|
| Pied (`div.transition__manage`) | inchangé (pointillé `divider`, padding haut `spacing.sm`) + `display: flex`, `flex-wrap: wrap`, `align-items: center`, écart `spacing.sm spacing.md`. Zone « Étiqueter » ouverte : `flex-basis: 100%` |
| Groupe vidéos (`div.transition__videos-manage`) | `display: flex`, `flex-wrap: wrap`, `align-items: center`, écart `spacing.sm spacing.md` |
| « Ajouter une vidéo » | `lien-bouton.md` **secondaire**, 44 px, padding `0 spacing.md`, icône **plus**, largeur du contenu ; nom accessible « Ajouter une vidéo à Pop to Bird » |
| Repère « 1 vidéo sur 3 » | `size.sm`, `textMuted`, `tabular-nums` ; « 2 vidéos sur 3 » ; **absent à 0** (proposé, comme les photos) ; compte les vidéos en préparation et impossibles à préparer (V15) |
| Phrase du maximum | `size.md`, `textMuted` ; ni icône ni couleur d'alerte ; remplace le groupe |

À 320 px, « Étiqueter » et le groupe vidéos sont sur deux lignes ; à partir de ≈ 30em d'élément, sur une seule.

## Retour après l'ajout (UX-57)

La page de la pose s'ouvre **sur l'élément de la transition** : `li.transition` avec `scroll-margin-block-start: spacing.lg` ; aucune mise en valeur colorée ni animation ; la nouvelle vidéo est là, « En préparation ».

## Couleurs forcées

Pied et pointillés en `CanvasText` inutiles (décoratifs) ; message d'échec avec contour `CanvasText` ; rappel sans changement (icône `CanvasText`).

## Mobile (React Native)

Hors périmètre de la story 12 (12d).
