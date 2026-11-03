# Carte de pose

Présentation d'une pose publiée dans la grille du catalogue. Remplace le tableau de la story 1. La carte n'est **pas interactive** en story 3 (pas encore de page de détail).

## Structure

```
┌──────────────────────────────────────┐
│ [ emplacement futur : vignette 4:3 ] │  <- non implémenté (voir plus bas)
│ Hand-to-Hand (L-base)                │  <- h2
│                                      │
│ Base                Intermédiaire ●●●○│
│ Flyer                      Avancé ●●●●│
│ ──────────────────────────────────── │  <- séparateur décoratif
│ Peut commencer un flow        ✓ Oui  │
│ Peut terminer un flow         – Non  │
└──────────────────────────────────────┘
```

Balisage : `li` (dans l'`ul` de la grille) > `article` facultatif > `h2` + `dl`. Chaque paire terme / valeur est groupée dans un `div` (autorisé dans un `dl`), ce qui permet la mise en ligne.

| Élément | Tokens |
|---|---|
| Conteneur | fond `surface`, contour `borderWidth` `divider` (décoratif : la carte n'est pas un contrôle), rayon `radius.md`, padding `spacing.md` ; pas d'ombre ; hauteur égale à celle des autres cartes de la rangée (étirement de la grille) |
| Nom (`h2`) | `size.lg`, `weight.bold`, `text` (14,6:1 sur `surface`), interligne `tight` ; marge basse `spacing.md` ; passe à la ligne (`overflow-wrap: anywhere` pour un nom de 60 caractères sans espace) |
| Ligne terme / valeur | `display: flex`, `justify-content: space-between`, `align-items: baseline`, `flex-wrap: wrap`, écart `spacing.sm` ; écart vertical entre lignes `spacing.xs` |
| Terme (`dt`) | `size.md`, `regular`, `textMuted` (5,8:1 sur `surface`) |
| Valeur (`dd`) | `size.md`, `weight.semibold`, `text`, alignée à droite ; marge nulle |
| Échelle à points | après le nom du niveau, écart `spacing.xs` ; mêmes règles que `legende-echelle.md` (`aria-hidden`) |
| Séparateur | entre difficultés et indicateurs : ligne `borderWidth` `divider`, marges `spacing.sm` au-dessus et au-dessous (décoratif, réalisé par une bordure du second groupe, pas par un `hr`) |
| Oui | icône **coche** `sizes.icon` + « Oui », `text`, `semibold` |
| Non | icône **tiret** `sizes.icon` + « Non », `textMuted`, `regular` |

- Les termes sont ceux validés : « Base », « Flyer », « Peut commencer un flow », « Peut terminer un flow ».
- Les valeurs alignées à droite placent les échelles à points en colonne au bord droit, ce qui permet de comparer les niveaux d'un coup d'œil.
- Oui / Non : la différence repose sur le **mot** et l'**icône** (coche / tiret), la couleur atténuée du « Non » n'est qu'un renfort. Ni vert ni rouge : « ne peut pas terminer un flow » n'est pas un danger.
- Les icônes coche et tiret sont `aria-hidden` ; le lecteur d'écran lit « Peut terminer un flow : Non ».

## Responsive

- La carte occupe sa cellule de grille (`ecrans/3-proposer-une-pose.md`). Largeur mini réaliste : 288 px (écran de 320 px) ; à cette largeur, « Peut commencer un flow » + « ✓ Oui » tiennent sur une ligne.
- Si la place manque (zoom 200 %, texte agrandi), la valeur passe **sous** le terme, alignée à gauche (`flex-wrap`) : aucun défilement horizontal.

## États

Aucun état interactif en story 3 (ni survol, ni focus). Quand la carte mènera au détail d'une pose :
- le **nom** deviendra le lien (`h2 > a`), étendu à toute la carte par un pseudo-élément ; un seul arrêt de tabulation par carte ;
- survol : fond `surfaceHover`, nom souligné ; focus : anneau `focus` autour de la carte entière ;
- le contour passera de `divider` à `border` (la carte deviendra un contrôle, contraste 3:1 exigé).

## Vignette (emplacement futur, non implémenté)

- En tête de carte, pleine largeur, ratio 4:3, rayon `radius.md` aux angles supérieurs, sans padding (la carte garde son padding sous la vignette).
- Dans le DOM, la vignette viendra **après** le `h2` (le titre reste le premier élément lu) et sera remontée visuellement par `order` ; une image d'illustration aura un `alt` vide, puisque le nom suit.
- Aucun espace réservé tant qu'il n'y a pas de photo : pas d'image grise de remplacement.

## Mobile (React Native)

`View` avec les mêmes tokens ; liste en `FlatList` à une colonne (deux colonnes sur tablette à partir de `breakpoints.md`). `accessibilityRole="header"` sur le nom.
