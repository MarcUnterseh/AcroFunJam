# Lecteur de vidéo (une vidéo d'une transition)

Story 12 (V18, V19, V23 ; UX-47, UX-51, UX-53, UX-54, UX-56). Une vidéo prête, dans la rangée de son élément de transition (`rangee-videos.md`) : son **affiche compacte** avec le **bouton « Lire » du site** et la **pastille de durée**, sa légende, « Vidéo : <crédit> », le repli « Description de la vidéo » s'il y en a une. Une fois lancée, elle **s'agrandit à sa place** et le lecteur natif du navigateur prend le relais. Écran : `../ecrans/12-videos-des-transitions.md` ; maquette : `../maquettes/12-videos-des-transitions.html`. Tokens nouveaux : `sizes.videoPoster` (120), `sizes.videoMaxHeight` (480) ; le reste existe (`photoMat`, `surface`, `border`…).

## Principe : comme une photo, une vidéo est toujours entière

L'affiche et la vidéo sont **contenues** (`object-fit: contain`) sur le **passe-partout** `photoMat`, jamais recadrées : une vidéo en portrait (la plupart, filmées au téléphone) garde la tête du flyer et les pieds de la base, une vidéo en paysage ses deux extrémités. Aucune ombre, aucun voile sur l'image, aucun effet au survol.

## Au repos : l'affiche compacte

```
┌──────────────┐
│▒▒┌────────┐ (0:12)      <- pastille de durée (surface, text), coin haut droit
│▒▒│ affiche│▒▒│
│▒▒│ 9:16   │▒▒│        <- cadre 3:4 (largeur de la colonne, ≥ 120 px), photoMat, radius.md
│▒▒│        │▒▒│
│(▶ Lire)    │▒▒│        <- pastille « Lire » 44 px, coin bas gauche
└──────────────┘
Pop to Bird,             <- légende (size.sm, semibold, text)
tutoriel
Vidéo : Hugo Bernard     <- crédit (size.sm, textMuted)
Description de la ⌄      <- repli (seulement s'il y a une description)
vidéo
```

Balisage : `li.video` > `figure.video__figure` > (`button.video__play` [`img.video__poster` + `span.video__play-pill` + `span.video__duration`] + `figcaption.video__caption` [`p.video__legend` + `p.video__credit`]) ; puis `details.video__description` ; puis, pour un validateur, `div.video__actions` (`rangee-videos.md`).

| Élément | Tokens |
|---|---|
| Élément (`li.video`) | `display: grid`, écart `spacing.xs`, `align-content: start`, `min-width: 0` |
| Figure | `margin: 0` ; `display: grid`, écart `spacing.xs` (affiche → légende) |
| Bouton « Lire » (`button.video__play`) = **toute l'affiche** | `position: relative`, `display: block`, `inline-size: 100%`, **`aspect-ratio: 3 / 4`** ; `padding: 0`, aucune bordure ; fond **`photoMat`** ; rayon `radius.md` ; `overflow: hidden` ; `cursor: pointer` |
| Affiche (`img.video__poster`) | `position: absolute`, `inset: 0`, 100 % × 100 %, **`object-fit: contain`** ; `alt=""` (la légende nomme la vidéo) ; `width` / `height` de l'API ; `loading="lazy"` sauf pour la première transition de la page |
| Pastille « Lire » | `position: absolute`, à `spacing.sm` du bas et du début ; `display: inline-flex`, `align-items: center`, écart `spacing.xs` ; **`min-block-size: sizes.touchTarget` (44)** ; padding `0 spacing.md 0 spacing.sm` ; rayon `pill` ; fond **`surface`**, contour `borderWidth` **`border`** (3,4:1 sur `surface`), texte « Lire » `size.md` `semibold` **`text`** (16,2 / 14,4:1) ; icône **lecture** (triangle) `sizes.icon` en `text`, `aria-hidden` ; ≈ 76 px de large : tient dans la plus petite cellule (120 px) |
| Pastille de durée | `position: absolute`, à `spacing.sm` du haut et de la fin ; padding `0 spacing.sm` ; rayon `pill` ; fond **`surface`**, texte **`text`** `size.sm` `semibold`, `tabular-nums` ; format **« 0:12 »** (minutes:secondes, celui des téléphones ; au plus « 0:30 ») ; `aria-hidden` (la durée est dans le nom du bouton) ; aucun contour (non interactive) |
| Légende (`p.video__legend`) | `size.sm`, `semibold`, `text`, interligne `tight`, `overflow-wrap: anywhere` (100 caractères : ≈ 6 lignes dans 124 px) ; `id` : nom accessible du lecteur une fois lancé |
| Crédit (`p.video__credit`) | `size.sm`, `regular`, `textMuted` (7,0 / 7,3:1 sur `surface`) ; « Vidéo : » compris ; `overflow-wrap: anywhere` |

Nom accessible du bouton (**proposé**, `ux-expert`) : « Lire Pop to Bird, tutoriel (20 secondes) » (texte masqué : le mot visible « Lire » en tête, conforme à 2.5.3). Les pastilles sont dans le bouton ; elles ne sont pas des cibles séparées.

### Pourquoi « Lire » en pastille plutôt qu'un triangle au centre

Le triangle seul, au milieu de l'image, cache le sujet (le corps de la base) et ne dit rien à qui ne connaît pas le code ; la pastille écrite reprend la **pastille loupe** des photos (`galerie-photos.md`) : même fond, même contour, même coin réservé, même état au survol. Une seule forme d'action sur une image dans tout le site.

### États du bouton « Lire »

| État | Rendu |
|---|---|
| Repos | pastille `surface` + contour `border` |
| Survol (pointeur fin) | pastille `surfaceHover`, contour `text` ; l'affiche ne change pas |
| Focus (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px **autour de toute l'affiche** (rayon `radius.md`), sur la `surface` de l'élément (5,7 / 9,1:1) ; distinct du survol |
| Pressé | pastille `divider` |

## Description de la vidéo (repli, UX-47)

Présent **seulement** quand la vidéo a une description (V23). `details.video__description` sous la figure, **fermé** par défaut.

| Élément | Tokens |
|---|---|
| `summary` « Description de la vidéo » | rendu de `repli-descriptions-etiquettes.md` (`.tag-meanings__summary`) : `size.sm`, `semibold`, **`primary`** (7,1 / 8,1:1 sur `surface`), `min-block-size: sizes.touchTarget`, chevron bas `sizes.icon` après le texte (retourné quand ouvert), aucun marqueur natif ; deux lignes dans une cellule de 124 px |
| Texte | `p`, `size.sm`, `text`, `overflow-wrap: anywhere`, `white-space: pre-line` ; fond **`surfaceHover`** (13,5 / 12,6:1), padding `spacing.sm`, rayon `radius.sm`, marge haute `spacing.xs` |

Le texte est **toujours dans le DOM** (un `details` fermé garde son contenu) : le lecteur s'y réfère par `aria-describedby` dès qu'il est lancé. Ouvert dans une cellule étroite, le repli allonge la cellule (300 caractères : ≈ 16 lignes à 124 px) ; les autres cellules de la rangée restent alignées en haut. Aucune animation d'ouverture.

## Lancée : la vidéo s'agrandit à sa place

Au clic sur « Lire », l'élément prend **toute la largeur de la rangée** (`grid-column: 1 / -1`) et l'affiche est remplacée par `<video>` avec les **contrôles du navigateur** (pause, avance, plein écran), en boucle (une seule fois avec « réduire les animations »), sans son, dans la page (`playsinline`). Aucune mention « sans son » (UX-56).

```
Pop to Bird, démonstration de face  <- cellule 1, compacte, à sa place
┌──────────────────────────────────┐
│▒▒▒▒▒▒▒▒┌────────────┐▒▒▒▒▒▒▒▒▒▒▒│  <- élément 2 lancé, toute la largeur de la rangée
│▒▒▒▒▒▒▒▒│  vidéo     │▒▒▒▒▒▒▒▒▒▒▒│     proportions de la vidéo, hauteur ≤ videoMaxHeight (480)
│▒▒▒▒▒▒▒▒│  9:16      │▒▒▒▒▒▒▒▒▒▒▒│     passe-partout sur les côtés
│▒▒▒▒▒▒▒▒│ ▮▮ ──●──── │▒▒▒▒▒▒▒▒▒▒▒│  <- contrôles du navigateur
└──────────────────────────────────┘
Pop to Bird, tutoriel        [ × Fermer la vidéo ]   <- légende + crédit à gauche, bouton à droite (≥ 30em)
Vidéo : Hugo Bernard
Description de la vidéo ⌄
┌──────────┐
│ cellule 3│                              <- la suite de la rangée, à sa place
```

| Élément | Tokens |
|---|---|
| Élément lancé (`li.video.video--active`) | `grid-column: 1 / -1` ; l'ordre des vidéos ne change jamais (pas de `grid-auto-flow: dense`) : la ligne de la vidéo précédente peut garder une cellule vide, c'est voulu |
| Scène (`div.video__stage`) | `position: relative`, `inline-size: 100%`, fond `photoMat`, rayon `radius.md`, `overflow: hidden` |
| `video` | `display: block`, `inline-size: 100%`, `block-size: auto`, **`max-block-size: sizes.videoMaxHeight` (480)**, `object-fit: contain` ; `width` / `height` de l'API (place réservée : la page ne saute pas quand la vidéo arrive) ; `poster` = l'affiche ; `muted`, `playsinline`, `loop` (sauf mouvement réduit), `controls`, `preload="none"` avant le clic ; `aria-labelledby` = légende, `aria-describedby` = description (si elle existe) |
| Légende sous la scène | mêmes styles ; à partir de 30em de rangée, la figcaption et « Fermer la vidéo » sur une ligne (`display: flex`, `flex-wrap: wrap`, `justify-content: space-between`, `align-items: start`, écart `spacing.sm spacing.md`) |
| « Fermer la vidéo » (**proposé**) | `bouton.md` **secondaire**, `min-block-size: sizes.touchTarget`, padding `0 spacing.md`, largeur du contenu, icône **croix** `sizes.icon` ; met la vidéo en pause et rend l'affiche compacte ; nom accessible « Fermer la vidéo Pop to Bird, tutoriel » |

- **Une seule vidéo agrandie à la fois** (UX-54) : en lancer une autre met la première en pause et la **rend compacte** (affiche, pastille « Lire »). Une vidéo finie (lecture unique, mouvement réduit) reste agrandie, sur sa dernière image, avec les contrôles du navigateur pour la relancer.
- **Hauteur** : sur téléphone, une vidéo portrait de 256 px de large fait 455 px de haut (sous 480) ; sur grand écran, dans une colonne de 448 px, elle est plafonnée à 480 px et le passe-partout l'entoure. Une vidéo paysage fait 144 px de haut à 320 px, 252 px dans la colonne.
- Les contrôles du navigateur ne sont pas stylés (leur contraste est celui du système).

## Échec de lecture

La vidéo ne se charge pas (réseau coupé, fichier retiré entre-temps). La scène garde sa taille (dimensions de l'API) ; à la place de l'image :

```
┌──────────────────────────────────┐
│                                  │
│               (!)                │  <- icône erreur iconLarge, danger (5,3 / 7,2:1 sur photoMat)
│   La vidéo n'a pas pu être lue.  │  <- size.sm, text (13,2 / 12,0:1), centré
│   Vérifie ta connexion Internet, │
│   puis réessaie.                 │
│          [ Réessayer ]           │  <- secondaire 44 px, fond surface
│                                  │
└──────────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| Message (`div.video__error`, `role="status"` ou annonce, `ux-expert`) | `position: absolute`, `inset: 0` ; `display: grid`, `place-content: center`, `justify-items: center`, écart `spacing.sm` ; padding `spacing.md` ; `text-align: center` ; fond `photoMat` |
| Icône | **erreur**, `sizes.iconLarge`, **`danger`** ; jamais de fond rouge (règle « danger jamais en fond plein ») |
| Texte (**proposé**) | « La vidéo n'a pas pu être lue. Vérifie ta connexion Internet, puis réessaie. » ; `size.sm`, `text`, `max-inline-size: 30ch` |
| « Réessayer » (**proposé**) | secondaire, 44 px, fond **`surface`** (le passe-partout ne délimite pas un bouton : `border` y tombe à 2,75:1, d'où le fond opaque) |

Une vidéo paysage de 144 px de haut ne contient pas ce message : la scène prend alors `min-block-size: calc(sizes.videoMaxHeight / 2)` (240) pendant l'échec.

## Mouvement, couleurs forcées

- Aucune animation : ni fondu de l'affiche à la vidéo, ni agrandissement animé, ni défilement doux vers la vidéo lancée. Avec « réduire les animations », la vidéo lancée se lit **une seule fois** (`loop` absent) ; rien ne bouge sans action.
- `forced-colors: active` : bouton d'affiche et scène avec contour `CanvasText` 1 px (le passe-partout disparaît) ; pastilles « Lire » et de durée avec contour `CanvasText` ; repli en `LinkText` ; anneau de focus `Highlight`. Les affiches et la vidéo restent affichées.

## Contrastes

| Couple | Aube | Nuit |
|---|---|---|
| `text` (« Lire », durée) sur `surface` | 16,2:1 | 14,4:1 |
| `border` (contour de la pastille « Lire ») sur `surface` | 3,4:1 | 3,4:1 |
| `text` (légende) / `textMuted` (crédit) sur `surface` | 16,2 / 7,0:1 | 14,4 / 7,3:1 |
| `primary` (repli) sur `surface` | 7,1:1 | 8,1:1 |
| `text` (description) sur `surfaceHover` | 13,5:1 | 12,6:1 |
| `focus` (anneau autour de l'affiche) sur `surface` | 5,7:1 | 9,1:1 |
| `danger` (icône d'échec) sur `photoMat` — **paire nouvelle** | 5,3:1 | 7,2:1 |
| `text` (message d'échec) sur `photoMat` | 13,2:1 | 12,0:1 |

## Mobile (React Native)

Hors périmètre de la story 12 (12d).
