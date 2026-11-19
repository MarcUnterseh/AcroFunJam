# Panneau « aucun flow »

Story 9. Remplace le formulaire du générateur quand aucun flow n'a pu être tiré : **critères trop restrictifs** (G17, Q197) ou **catalogue insuffisant** (Q198). Ce n'est ni une erreur de saisie ni une panne : pas de `danger`. Écran : `../ecrans/9-generer-un-flow.md`. Aucun nouveau token.

L'incident réseau, lui, n'utilise pas ce panneau : il garde la saisie et s'affiche en `alerte-formulaire.md` erreur, avec « Réessayer ».

## Structure

```
┌──────────────────────────────┐   surface, contour divider, radius.lg, padding lg (xl ≥ 40em)
│ (i)                          │   icône information, sizes.iconLarge, info
│ Critères trop restrictifs :  │   h2, Unbounded 500, size.lg
│ impossible de générer un     │
│ flow.                        │
│ [récapitulatif des critères] │   recapitulatif-criteres.md (trop restrictifs seulement)
│ Pour élargir le choix,       │   p, size.md, text
│ essaie :                     │
│ • moins de transitions ;     │   ul à puces, size.md
│ • des plafonds de difficulté │
│   plus hauts ;               │
│ • moins d'étiquettes exclues.│
│ [   Modifier les critères  ] │   primaire
└──────────────────────────────┘
```

| Variante | Titre (`h2`) | Contenu | Action |
|---|---|---|---|
| Critères trop restrictifs | « Critères trop restrictifs : impossible de générer un flow. » | récapitulatif des critères ; « Pour élargir le choix, essaie : » ; pistes adaptées (« moins de transitions », « des plafonds de difficulté plus hauts », « moins d'étiquettes exclues » si une étiquette est exclue, « plus d'étiquettes demandées, ou aucune » si une étiquette est demandée) | **« Modifier les critères »**, bouton primaire (la seule suite utile) |
| Catalogue insuffisant | « Le catalogue ne permet pas encore de générer un flow. » | « Il manque encore des poses ou des transitions pour former un enchaînement. » | **« Voir le catalogue »**, lien-bouton secondaire (`lien-bouton.md`), comme sur la page « pose introuvable » |

| Élément | Tokens |
|---|---|
| Panneau | `surface`, contour `borderWidth` `divider`, `radius.lg`, padding `spacing.lg` (`spacing.xl` ≥ 40em) ; `display: grid`, écart `spacing.md` ; largeur `sizes.formWideMaxWidth` + padding, centré comme le formulaire |
| Icône | `info`, `sizes.iconLarge` (32), `info` (≥ 3:1 sur `surface` : 5,7 / 9,1), `aria-hidden` |
| Titre | Unbounded `weight.medium` `size.lg`, `text`, interligne `tight` |
| Pistes (`ul`) | puces natives, padding gauche `spacing.lg`, écart `spacing.xs` ; `size.md`, `text` |
| Bouton | 48 px ; pleine largeur sous 40em, largeur du contenu au-delà |

Le titre reçoit le focus à l'affichage (`tabIndex={-1}`), comme « Ton flow ».

## Contraste élevé

Contour `CanvasText`.
