# Photos d'une pose (sections « Photos de <pose> » et « Autres photos de <pose> »)

Story 10 (R17 à R19), revue du porteur du produit du 2026-11-20. Sur la page d'une pose, **hors du ciel** : la **photo principale seule** en tête du corps, et les **autres photos tout en bas de la page**, après les transitions. Écran : `../ecrans/10-photos-des-poses.md` ; maquette : `../maquettes/10-photos-des-poses.html`. Tokens nouveaux : `colors.photoMat` (passe-partout), `sizes.photoMaxHeight` ; agrandissement : `dialogue-agrandissement.md`.

## Principe : une photo est toujours entière

Une photo n'est **jamais recadrée** : elle est **contenue** (`object-fit: contain`) dans son cadre, et ce qui reste du cadre est le **passe-partout** `photoMat`, un gris froid neutre (aube `#E9E6EF`, nuit `#2A2833`). Une pose verticale (Throne, 2:3) garde la tête du flyer et les pieds de la base ; une pose horizontale (Bird, 4:3) ses deux extrémités. Le passe-partout est décoratif : il ne délimite aucun contrôle.

| Cadre | Forme | Taille servie (ADR 0039) |
|---|---|---|
| Photo principale (haut de page) | proportions de la photo, hauteur au plus `sizes.photoMaxHeight` (560) ; au-delà, passe-partout sur les côtés | `page` (1200) |
| Autres photos (bas de page, grille) | **carré** (`aspect-ratio: 1`), photo contenue | `page` (1200), `sizes` adapté à la cellule |
| Vignette du catalogue | carré `sizes.thumbnail` (80), voir `carte-pose.md` | `thumbnail` (192) |
| Agrandie | la place du dialogue | `enlarged` (2400) |

`width` et `height` de l'API sont posés sur chaque `img` : la place est réservée avant le chargement, sans saut de mise en page. Photos du bas de page en `loading="lazy"`, jamais la principale.

## Ce qui apparaît, et où

| Situation | Haut du corps (`section.pose-photos`) | Bas de page (`section.pose-other-photos`) |
|---|---|---|
| Visiteur, pose sans photo | rien | rien |
| Visiteur, 1 photo | titre, note de sécurité, principale | rien |
| Visiteur, 2 à 5 photos | titre, note de sécurité, principale, lien « Voir l'autre photo » / « Voir les 2 autres photos » | « Autres photos de Bird », grille |
| Validateur, pose sans photo | titre, « Reverse Bird n'a pas encore de photo. », « Ajouter une photo » | rien |
| Validateur, 1 photo | titre, note, principale, repère, pied de la photo, **pied de section** (« Ajouter une photo », « 1 photo sur 5 ») | rien |
| Validateur, 2 à 5 photos | titre, note, principale, repère, pied de la photo, lien vers le bas | « Autres photos de Bird », grille avec actions, **pied de section** (« Ajouter une photo » + « 3 photos sur 5 », ou la phrase du maximum) |

Règle : **le pied de section suit la dernière photo présentée**. Avec une seule photo, il ferme la section du haut, juste sous le pied de la photo principale. C'est la place la plus proche de l'action « ajouter une autre photo », et il n'y a rien à atteindre en bas de page. Dès la deuxième photo, il descend dans la section du bas, après la grille. Le décompte porte sur **toutes** les photos de la pose, principale comprise.

## Haut du corps : la photo principale

```
Photos de Bird                         <- h2 (pose-page__section-title)
┌────────────────────────────────┐
│(!) Tu restes juge de tes       │     <- note de sécurité (déplacée ici, jamais répétée)
│    limites. Les chutes…        │
└────────────────────────────────┘
┌────────────────────────────────┐     <- bouton d'agrandissement = toute la photo
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│        passe-partout photoMat, radius.md
│     [ photo principale  ]      │
│     [ entière, 4:3      ]  (🔍)│     <- pastille loupe 44 px, coin bas droit
└────────────────────────────────┘
Photo : Léa Martin                     <- figcaption, size.sm, textMuted
Voir les 2 autres photos ⌄             <- lien interne vers le bas de page
```

Balisage : `section.pose-photos[aria-labelledby]` > `h2` + `div.pose-photos__lead` (note de sécurité + `div.pose-photo-item`) ; l'élément contient `figure.pose-photo.pose-photo--main` > `button.pose-photo__enlarge` (`img[alt=texte alternatif]` + pastille loupe `aria-hidden`) + `figcaption` « Photo : Léa Martin » ; puis, selon le cas, le repère, le pied de la photo et le lien vers les autres photos.

| Élément | Tokens |
|---|---|
| Section | `display: grid`, écart `spacing.md` ; `min-width: 0` ; à partir de 64em `grid-column: 1 / -1` |
| Titre (`h2`) | style de `.pose-page__section-title` (Unbounded 500, `size.lg`, `text`) ; « Photos de Bird » (libellé validé, UX-15) |
| Élément de photo | `display: grid`, écart `spacing.sm`, `align-content: start` |
| Figure | `margin: 0` ; `display: grid`, écart `spacing.xs` (photo → crédit) |
| Bouton d'agrandissement | `display: block`, `inline-size: 100%`, `padding: 0`, aucune bordure ; fond `photoMat` ; rayon `radius.md` ; `overflow: hidden` ; `position: relative` ; curseur `zoom-in` |
| Image | `display: block`, `inline-size: 100%`, `block-size: auto`, `object-fit: contain`, `max-block-size: sizes.photoMaxHeight` |
| Pastille loupe | `position: absolute`, à `spacing.sm` du bas et de la droite ; cercle `sizes.touchTarget` (44) ; fond `surface`, contour `borderWidth` `border` (3,4:1 sur `surface`), icône **loupe** `sizes.icon` en `text` ; `aria-hidden` (le bouton porte le nom) |
| Crédit (`figcaption`) | `size.sm`, `textMuted` (6,3:1 sur `background`, 7,9:1 la nuit) ; « Photo : » compris ; `overflow-wrap: anywhere` (crédit de 100 caractères) |

Nom accessible du bouton (proposé, `ux-expert`) : « Agrandir la photo 1 de Bird » ; le texte alternatif reste celui de l'`img`.

### Lien « Voir les 2 autres photos »

Présent quand la pose a au moins 2 photos : « Voir l'autre photo » (2 photos), « Voir les 2 autres photos », « … 3 … », « … 4 … ». Lien **interne** (`href="#autres-photos"`) vers le titre de la section du bas ; c'est le dernier élément de l'élément de la photo principale (après le pied de gestion pour un validateur, pour que les actions de la photo restent groupées sous elle).

| Élément | Tokens |
|---|---|
| Lien (`a.pose-photos__more`) | `display: inline-flex`, `align-items: center`, écart `spacing.xs`, `justify-self: start` ; `min-block-size: sizes.touchTarget` (44) ; `size.md`, `weight.semibold`, **`primary`** (6,4:1 sur `background`, 8,9:1 la nuit), souligné en permanence (`borderWidth`) |
| Icône | **chevron bas** `sizes.icon`, après le texte, `aria-hidden` (il dit « plus bas dans la page » ; le mot « Voir » porte le sens) |

États : ceux du lien de `carte-pose.md` (survol `primaryHover` + soulignement 2 px, focus anneau `focus` + rayon `radius.sm`, pressé `primaryActive`). Pas de défilement animé (`scroll-behavior` laissé à `auto`) : le saut est immédiat, y compris hors mouvement réduit. Le focus suit la cible (le titre de la section du bas, `tabindex="-1"` : comportement `ux-expert`).

### Note de sécurité : dans la section de la photo principale

Retenu le 2026-11-20 : quand la pose a au moins une photo, la **note de sécurité** (`.safety-note`, `sunSurface`, icône `spot` en `sunStrong`) est rendue **dans la section du haut**, entre le titre et la photo principale, et **n'est plus répétée** sous la légende de l'échelle ; sans photo, elle reste à sa place. À partir de 64em, elle passe **à côté** de la photo principale (`.pose-photos__lead` : `grid-template-columns: minmax(0, 2fr) minmax(0, 1fr)`, écart `spacing.xl`, `align-items: start` ; note en colonne 2, rangée 1 ; `margin: 0`). Une photo principale portrait est plafonnée à 560 px de haut : le passe-partout l'entoure à gauche et à droite. Le lien « Voir les 2 autres photos » reste dans la colonne de la photo.

## Bas de page : « Autres photos de Bird »

Dernière section du corps, **après les transitions** (`section.pose-other-photos`, `id="autres-photos"`, à partir de 64em `grid-column: 1 / -1`). Absente quand la pose a une photo ou moins.

```
Autres photos de Bird                  <- h2 (pose-page__section-title)
┌──────────────┐ ┌──────────────┐
│▒▒▒[ 3:4  ]▒▒▒│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒│     <- grille : 2 colonnes, cellules carrées
│▒▒▒[photo ]▒▒▒│ │ [ 4:3 photo ]│
│▒▒▒[      ](🔍)│ │▒▒▒▒▒▒▒▒▒▒▒(🔍)│
└──────────────┘ └──────────────┘
Photo : Hugo     Photo : Lulu Acro
Bernard
```

| Élément | Tokens |
|---|---|
| Section | `display: grid`, écart `spacing.md` ; `min-width: 0` |
| Titre | `.pose-page__section-title` ; « Autres photos de Bird » |
| Grille (`ul.pose-photos__grid`) | `display: grid`, `grid-template-columns: repeat(2, minmax(0, 1fr))`, écart `spacing.md` ; liste sans puces (`role="list"`) ; **4 colonnes** à partir de 64em |
| Cellule | bouton d'agrandissement en `aspect-ratio: 1`, image en `position: absolute; inset: 0`, 100 % × 100 %, `object-fit: contain` ; crédit dessous |

Les boutons d'agrandissement gardent la numérotation de toutes les photos (« Agrandir la photo 2 de Bird ») ; le dialogue parcourt toutes les photos, principale comprise (« Photo 2 sur 3 de Bird »).

### États du bouton d'agrandissement (haut et bas)

| État | Rendu |
|---|---|
| Repos | pastille `surface` + contour `border` |
| Survol (pointeur fin) | pastille `surfaceHover`, contour `text` ; la photo ne change pas (ni zoom, ni voile) |
| Focus (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px autour **de toute la photo** (rayon `radius.md`) ; distinct du survol |
| Pressé | pastille `divider` |

La pastille est opaque : elle reste lisible quelle que soit la photo dessous ; l'anneau de focus est hors de la photo, sur le fond de page (5,2:1 / 9,9:1).

## Validateur et administrateur : gestion

### Pose sans photo (haut du corps)

```
Photos de Reverse Bird                  <- h2
Reverse Bird n'a pas encore de photo.   <- size.md, textMuted
[ + Ajouter une photo ]                 <- lien-bouton secondaire, 44 px, largeur du contenu
```

Aucun pied pointillé (rien au-dessus). Nom accessible « Ajouter une photo de Reverse Bird » (texte masqué). La note de sécurité reste sous la légende.

### Photo principale (haut du corps)

```
┌────────────────────────────────┐
│     [ photo principale ]   (🔍)│
└────────────────────────────────┘
Photo : Léa Martin
(☀ Photo principale (vignette du catalogue))   <- repère, pilule sunSurface
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   <- pied de la photo (pointillé divider)
[ Modifier ] [ Retirer ]
Voir les 2 autres photos ⌄                   <- 2 photos ou plus

pose à 1 photo, à la place du lien :
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   <- pied de section
[ + Ajouter une photo ]  1 photo sur 5
```

### Autres photos (bas de page)

```
Autres photos de Bird
┌────────────────────────────────┐   <- grille du validateur : 1 colonne < 40em
│▒▒▒▒▒▒▒▒[ Bird vue de face ]▒▒▒▒│
└────────────────────────────────┘
Photo : Hugo Bernard
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
[ Choisir comme photo principale ]
[ Modifier ] [ Retirer ]
…
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   <- pied de section
[ + Ajouter une photo ]  2 photos sur 5
```

| Élément | Tokens |
|---|---|
| Repère « Photo principale (vignette du catalogue) » | sous la principale seulement ; pilule : fond **`sunSurface`** (le soleil = la lumière principale de la pose), texte `text` (13,9:1 / 11,1:1) `size.sm` `semibold`, padding `spacing.xs spacing.sm spacing.xs spacing.xs`, rayon `pill` ; icône **soleil** `sizes.icon` en `sunStrong` (`aria-hidden`), écart `spacing.xs` ; aucun contour (`CanvasText` en couleurs forcées). Visible des seuls validateurs et administrateurs |
| Pied de la photo | bordure haute `borderWidth` **pointillée** `divider`, padding haut `spacing.sm` ; `display: flex`, `flex-wrap: wrap`, écart `spacing.sm` |
| Boutons | `bouton.md`, **secondaires**, `min-block-size: sizes.touchTarget` (44), padding `0 spacing.md`, largeur du contenu ; « Choisir comme photo principale » (photos du bas seulement), « Modifier », « Retirer » ; noms accessibles suffixés du texte alternatif (texte masqué) |
| Grille du validateur (`.pose-photos__grid--manage`) | **1 colonne** sous 40em, **2** de 40 à 64em, **3** à partir de 64em (retenu le 2026-11-20 : « Choisir comme photo principale » ≈ 250 px ne tient pas dans une cellule de 140 px) ; cellules carrées ; écart `spacing.lg` |

Choisir une autre photo principale la fait **monter** en haut de page ; l'ancienne principale descend en tête de la grille du bas. Aucun primaire au repos dans ces sections : la page garde son seul primaire (« Proposer une transition depuis … »).

### Pied de section

```
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
[ + Ajouter une photo ]  2 photos sur 5

à 5 photos :
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
Bird a déjà 5 photos, le maximum. Retire une photo pour en ajouter une autre.
```

| Élément | Tokens |
|---|---|
| Pied (`div.pose-photos__manage`) | bordure haute `borderWidth` **pointillée** `divider` (comme « Étiqueter la pose ») ; padding haut `spacing.md` ; `display: flex`, `flex-wrap: wrap`, `align-items: center`, écart `spacing.sm spacing.md`. Place : fin de la section du bas ; fin de la section du haut quand la pose n'a qu'une photo |
| « Ajouter une photo » | `lien-bouton.md` **secondaire**, 44 px, icône **plus**, largeur du contenu (même à 320 px) |
| Repère « 2 photos sur 5 » | `size.sm`, `textMuted`, chiffres `tabular-nums` ; « 1 photo sur 5 » au singulier |
| Phrase du maximum | `size.md`, `textMuted` ; pas d'icône, pas de couleur d'alerte (ce n'est pas une erreur) |

### Modification sur place (texte alternatif et crédit)

Le pied de la photo est **remplacé** par une zone, à la même place (pas de doublon « Modifier » + « Annuler »), en haut pour la principale, dans sa cellule en bas pour les autres.

```
┌──────────────────────────────┐   <- zone : surface, contour divider, radius.md, padding md
│ Modifier la photo            │   <- titre de zone (proposé), semibold
│ Texte alternatif             │
│ ┌──────────────────────────┐ │   <- textarea 4 lignes
│ └──────────────────────────┘ │
│ Décris la pose pour qui ne…  │   <- aide + « Exemple : … »
│                    74 / 200  │
│ Crédit                       │
│ [ Léa Martin               ] │
│ Le nom de la personne qui…   │
│                     10 / 100 │
│ [  Enregistrer la photo   ]  │   <- primaire (proposé)
│ [         Annuler         ]  │
└──────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| Zone (`form.pose-photo__zone`) | rendu de `.pose-tagging-zone` : fond `surface`, contour `borderWidth` `divider`, rayon `radius.md`, padding `spacing.md`, `display: grid`, écart `spacing.md` ; `container-type: inline-size` |
| Champs | `champ.md` (zone de texte, champ texte) ; aide, exemple et compteur comme sur la page d'ajout (`champ-photo.md`) |
| Actions | primaire + secondaire, empilées pleine largeur tant que la **zone** fait moins de 22em (≈ 352 px), en ligne au-delà ; en cours : « Enregistrement… » (proposé), `aria-disabled` |
| Disposition | la zone reste **dans la cellule** de la photo, sous elle : étendre une photo à toute la rangée laisserait un trou dans la grille ou changerait l'ordre des photos |

### Confirmation du retrait, sur place

```
┌──────────────────────────────┐   <- même zone (surface, divider, radius.md)
│ Retirer cette photo de Bird ?│   <- semibold, size.md, text
│ La photo suivante deviendra  │   <- conséquence, size.sm, textMuted
│ la photo principale et la    │
│ vignette du catalogue.       │
│ [ Retirer la photo ] [Annuler]│  <- deux secondaires, poids égal
└──────────────────────────────┘
```

- « Retirer la photo » est **secondaire, sans fond rouge** (règle « danger jamais en fond plein », `bouton.md`) ; « Annuler » secondaire ; empilés pleine largeur sous 22em de zone, en ligne au-delà.
- Conséquences (validées) : principale → « La photo suivante deviendra la photo principale et la vignette du catalogue. » ; dernière → « Bird n'aura plus de photo. » ; autre → aucune phrase.
- En cours : « Retrait… » (proposé), `aria-disabled`.

## Couleurs forcées, mouvement

- `forced-colors: active` : bouton d'agrandissement avec contour `CanvasText` 1 px (le passe-partout disparaît) ; pastille loupe contour `CanvasText` ; repère « Photo principale » contour `CanvasText` ; zones de modification et de retrait contour `CanvasText` ; lien « Voir les … » en `LinkText` souligné ; anneau de focus `Highlight`. Les photos restent affichées.
- Aucune animation (ni fondu au chargement, ni défilement doux vers le bas de page).

## Contrastes

| Couple | Aube | Nuit |
|---|---|---|
| `textMuted` (crédit, décompte, phrase du maximum) sur `background` | 6,3:1 | 7,9:1 |
| `primary` (lien « Voir les 2 autres photos ») sur `background` | 6,4:1 | 8,9:1 |
| `text` (repère) sur `sunSurface` | 13,9:1 | 11,1:1 |
| `text` (icône loupe) sur `surface` | 16,2:1 | 14,4:1 |
| `border` (contour de la pastille loupe) sur `surface` | 3,4:1 | 3,4:1 |
| `focus` sur `background` (anneau autour de la photo) | 5,2:1 | 9,9:1 |
| `photoMat` contre `background` / `surface` (décoratif) | 1,1 / 1,2 | 1,3 / 1,2 |

## Mobile (React Native)

Hors périmètre de la story 10 (story 13). Les mêmes tokens (`photoMat`, `thumbnail`) serviront.
