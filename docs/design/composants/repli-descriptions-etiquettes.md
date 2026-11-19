# Repli des descriptions d'étiquettes

Story 8. Un `details` natif qui donne le **sens** des étiquettes sans encombrer la lecture : nom → description. Pas d'infobulle (inaccessible au toucher et au zoom). Écran : `../ecrans/8-etiquettes.md`. Aucun nouveau token ; une icône déjà prévue (`chevronDown`).

Deux usages, un seul rendu :

| Usage | Résumé (`summary`) | Contenu |
|---|---|---|
| Groupe de cases (formulaire, zone « Étiqueter », zone d'ajustement) | « Ce que veulent dire les étiquettes » | **toutes** les étiquettes de la liste |
| Transition de la page d'une pose (une par transition étiquetée) | « Ce que veulent dire ces étiquettes » | les étiquettes **de cette transition** |
| **Page d'une pose, en tête du corps** (story 9a) | « Ce que veulent dire les étiquettes de la pose » | les étiquettes **de la pose** (pas celles de ses transitions) |

Une transition sans étiquette n'a pas de repli ; une pose non plus. Sur la page d'une pose, le repli est sur le fond de page (`background`) : son contenu `surfaceHover` y reste distinct, le résumé `primary` y fait 6,4:1 / 8,9:1. Les formulaires de pose et la zone « Étiquettes de la pose » gardent le résumé « Ce que veulent dire les étiquettes » (toutes les étiquettes **applicables aux poses**). Écran : `../ecrans/9a-etiquettes-des-poses.md`.

## Structure

```
▾ Ce que veulent dire ces étiquettes        <- summary : 44 px, primary, semi-gras, chevron
┌──────────────────────────────────────────┐
│ dynamique                                │  <- dt : size.sm, semibold, text
│ Le passage se fait avec de l'élan : …    │  <- dd : size.sm, regular, text
│                                          │     spacing.sm
│ pop                                      │
│ La base propulse le flyer, qui quitte …  │
└──────────────────────────────────────────┘  <- fond surfaceHover, radius.sm, padding md
```

Balisage : `details` > `summary` + `dl` (un `div` par étiquette : `dt` + `dd`). Le `dl` porte un `id` pour l'`aria-describedby` du groupe de cases (le contenu d'un `details` fermé reste utilisable comme description).

| Élément | Tokens |
|---|---|
| `summary` | `display: inline-flex`, `align-items: center`, écart `spacing.xs` ; **`min-block-size: sizes.touchTarget`** ; `size.sm`, `weight.semibold`, `primary` (7,1:1 sur `surface`, 6,4:1 sur `background`) ; `list-style: none` (marqueur natif retiré, y compris `::-webkit-details-marker`) ; curseur `pointer` ; largeur du contenu |
| Chevron | `chevronDown`, `sizes.icon`, `currentColor`, `aria-hidden` ; à droite du texte ; **retourné (180°) quand le repli est ouvert**, sans animation |
| Contenu (`dl`) | marge haute `spacing.xs` ; fond **`surfaceHover`** (zone intérieure, lisible sur `surface` comme sur `background`) ; rayon `radius.sm` ; padding `spacing.md` ; `display: grid`, écart `spacing.sm` |
| Nom (`dt`) | `size.sm`, `weight.semibold`, `text` (13,5:1 / 12,6:1 sur `surfaceHover`) |
| Description (`dd`) | marge nulle ; `size.sm`, `regular`, `text` ; `overflow-wrap: anywhere` |

Pourquoi `text` et non `textMuted` pour la description : c'est le contenu qu'on est venu lire, pas une aide.

## États du `summary`

| État | Rendu |
|---|---|
| Repos | `primary`, non souligné, chevron vers le bas |
| Survol (pointeur fin) | `primaryHover`, souligné |
| Focus (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px, rayon `radius.sm` |
| Pressé | `primaryActive` |
| Ouvert | chevron vers le haut ; texte inchangé (le natif annonce « développé ») |

## Contraste élevé, mouvement

`forced-colors: active` : `summary` en `LinkText`, contenu avec contour `CanvasText`. Aucune animation d'ouverture.

## Mobile (React Native)

Hors périmètre de la story 8.
