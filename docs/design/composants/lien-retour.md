# Lien de retour

Lien textuel en tête de page qui ramène à la page parente (story 7 : « Catalogue », en tête de la page d'une pose). Il précède le `h1`.

```
‹ Catalogue          <- icône chevron gauche (aria-hidden) + texte, 44 px de haut
Throne               <- h1
```

| Élément | Tokens |
|---|---|
| Lien (`a`) | `display: inline-flex`, `align-items: center`, écart `spacing.xs` ; `min-block-size: sizes.touchTarget` (44) ; `size.md`, `weight.regular`, `primary` (5,2:1 sur `background`), souligné en permanence (`borderWidth`) ; marge basse `spacing.xs` (le `h1` lui est rattaché) |
| Icône | **chevron gauche** (nouvelle icône, trait 2 px, grille de 20, `currentColor`, `aria-hidden`), `sizes.icon` |

États : ceux du lien de `carte-pose.md` (survol `primaryHover` + soulignement 2 px, focus anneau `focus` + rayon `radius.sm`, pressé `primaryActive`).

- Un lien, pas un bouton « Retour » : il mène toujours au catalogue (pas à l'historique), le libellé dit où.
- Pas de fil d'Ariane : un seul niveau de profondeur.
- Le libellé « Catalogue » est court ; le chevron renforce la direction sans en porter le sens seul.
