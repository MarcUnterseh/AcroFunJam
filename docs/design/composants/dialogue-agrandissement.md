# Dialogue d'agrandissement d'une photo

Story 10 (R18). Un visiteur agrandit une photo de la page d'une pose et passe d'une photo à l'autre. `<dialog>` modal natif (`showModal()`), sans bibliothèque. Tokens nouveaux : `colors.scrim` (voile), `colors.photoMat` (passe-partout). Écran : `../ecrans/10-photos-des-poses.md`, § 4.

## Structure

Téléphone (< 40em) : le dialogue occupe **tout l'écran**.

```
┌────────────────────────────────┐   <- dialog : surface, plein écran, padding md
│ Photo 2 sur 3 de Bird [✕ Fermer]│  <- h2 + bouton secondaire 44 px
│ ┌────────────────────────────┐ │
│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ │   <- scène : photoMat, radius.md, toute la hauteur restante
│ │▒▒▒▒▒┌──────────────┐▒▒▒▒▒▒▒│ │
│ │▒▒▒▒▒│ photo entière│▒▒▒▒▒▒▒│ │
│ │▒▒▒▒▒└──────────────┘▒▒▒▒▒▒▒│ │
│ └────────────────────────────┘ │
│ Photo : Hugo Bernard           │   <- crédit, size.sm, textMuted
│ [ ‹ Photo précédente         ] │   <- secondaires pleine largeur, empilés
│ [         Photo suivante ›   ] │
└────────────────────────────────┘
```

Grand écran (≥ 40em) : un panneau centré sur la page assombrie.

```
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   <- ::backdrop : scrim
░░ ┌──────────────────────────────────────────────────┐ ░░
░░ │ Photo 2 sur 3 de Bird                [✕ Fermer]  │ ░░
░░ │ ┌──────────────────────────────────────────────┐ │ ░░
░░ │ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒┌──────────────┐▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ │ ░░
░░ │ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ photo entière│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ │ ░░
░░ │ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒└──────────────┘▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│ │ ░░
░░ │ └──────────────────────────────────────────────┘ │ ░░
░░ │ Photo : Hugo Bernard  [‹ Photo précédente] [Photo suivante ›] │
░░ └──────────────────────────────────────────────────┘ ░░
```

| Élément | Tokens |
|---|---|
| `::backdrop` | fond **`scrim`** (aube `#211C3B` à 72 %, nuit `#05040E` à 80 %) ; décoratif, rien n'est écrit dessus |
| Dialogue, téléphone | `inline-size: 100%`, `max-inline-size: none`, `block-size: 100dvh`, `max-block-size: none`, `margin: 0`, rayon 0, aucune bordure ; fond `surface` ; padding `spacing.md` |
| Dialogue, ≥ 40em | `inline-size: min(100% - 2 × spacing.xl, sizes.contentMaxWidth)`, `block-size: calc(100dvh - 2 × spacing.xl)` ; centré (`margin: auto`) ; rayon `radius.lg` ; contour `borderWidth` `divider` ; padding `spacing.lg` |
| Disposition | `display: grid` (quand ouvert), `grid-template-rows: auto minmax(0, 1fr) auto`, écart `spacing.md` |
| En-tête | `display: flex`, `align-items: center`, `justify-content: space-between`, écart `spacing.sm` |
| Titre (`h2`, nom accessible du dialogue par `aria-labelledby`) | « Photo 2 sur 3 de Bird » ; Unbounded 500, `size.md` (téléphone) puis `size.lg` (≥ 40em), `text`, interligne `tight`, `overflow-wrap: anywhere` ; chiffres `tabular-nums` |
| « Fermer » | `bouton.md` secondaire, `min-block-size: sizes.touchTarget` (44), padding `0 spacing.md`, icône **croix** `sizes.icon` à gauche, libellé visible ; premier élément focalisable à l'ouverture |
| Scène | fond **`photoMat`**, rayon `radius.md`, `min-block-size: 0`, `display: grid`, `place-items: center`, `overflow: hidden` |
| Photo agrandie | `max-inline-size: 100%`, `max-block-size: 100%`, `object-fit: contain` (la photo entière, jamais recadrée) ; taille `enlarged` (2400) ; `alt` = texte alternatif |
| Crédit | `size.sm`, `textMuted` (7,0:1 / 7,3:1 sur `surface`), « Photo : Hugo Bernard » ; `overflow-wrap: anywhere` |
| Navigation | « Photo précédente » (icône **chevron gauche** avant le texte), « Photo suivante » (icône **chevron droit** après le texte) : secondaires, 44 px ; téléphone : empilées pleine largeur, écart `spacing.sm` ; ≥ 40em : pied en ligne, crédit à gauche (`flex: 1`), boutons à droite, largeur du contenu |

## États

| Situation | Rendu (recommandé) |
|---|---|
| Une seule photo | pas de navigation ; le pied ne garde que le crédit |
| Première ou dernière photo | le bouton sans destination reste **à sa place**, en état désactivé de `bouton.md` (fond `disabledSurface`, texte `textMuted`, contour `divider`, `aria-disabled="true"`) : la mise en page ne saute pas d'une photo à l'autre. Pas de bouclage (3 → 1). Retenu le 2026-11-20 |
| Chargement de la photo agrandie | la scène garde son passe-partout ; la taille `page` déjà chargée peut servir d'aperçu (`srcset`) ; aucun indicateur animé |
| Survol / focus / pressé des boutons | `bouton.md` ; anneau `focus` 3 px décalé de 2 px (9,1:1 la nuit, 5,7:1 à l'aube sur `surface`) |

Échap, le retour du téléphone et « Fermer » referment le dialogue ; le focus revient au bouton d'agrandissement de la photo affichée en dernier (comportement : `ux-expert`).

## Contrastes

| Couple | Aube | Nuit |
|---|---|---|
| `text` (titre, libellés) sur `surface` | 16,2:1 | 14,4:1 |
| `textMuted` (crédit) sur `surface` | 7,0:1 | 7,3:1 |
| `border` (contour des boutons) sur `surface` | 3,4:1 | 3,4:1 |
| `textMuted` sur `disabledSurface` (bouton sans destination) | 5,8:1 | 6,4:1 |
| `scrim`, `photoMat` | décoratifs | décoratifs |

## Couleurs forcées, mouvement

- `forced-colors: active` : dialogue avec contour `CanvasText` ; `::backdrop` remplacé par le système ; boutons avec contour `ButtonText` ; la photo reste affichée.
- Aucune animation d'ouverture ni de glissement entre photos (pas de carrousel animé) ; rien à neutraliser sous `prefers-reduced-motion`.
- `body` : défilement de la page bloqué tant que le dialogue est ouvert (`overflow: hidden` sur `html` via `:has(dialog[open])`), pour que la page ne glisse pas sous le dialogue plein écran.

## Mobile (React Native)

Hors périmètre de la story 10.
