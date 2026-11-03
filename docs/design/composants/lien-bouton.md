# Lien-bouton

Lien de navigation (`<a href>`) présenté comme un bouton, parce qu'il porte l'action principale d'une page. Usages en story 3 : « Proposer une pose » sur le catalogue et dans son état vide, « Voir le catalogue » / « Retour au catalogue » après une proposition. Le rôle reste celui d'un **lien** (il change de page, il s'ouvre au clic du milieu, Entrée l'active, pas Espace) ; seule l'apparence est celle d'un bouton (`bouton.md`).

## Structure

```
┌───────────────────────────────┐
│  (+)  Proposer une pose       │   48 px
└───────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| Conteneur | `display: inline-flex`, centré ; hauteur minimale `sizes.control` (48) ; padding horizontal `spacing.md` ; rayon `radius.md` ; écart icône–texte `spacing.xs` |
| Icône facultative | `sizes.icon`, `currentColor`, `aria-hidden` ; « plus » pour « Proposer une pose », aucune pour « Voir le catalogue » |
| Libellé | `size.md`, `weight.semibold`, sur une ligne ; **pas de soulignement** (la forme de bouton suffit à signaler l'élément cliquable) |

## Variantes

| Variante | Fond | Texte | Bordure | Usage |
|---|---|---|---|---|
| **Primaire** | `primary` | `primaryContrast` (5,2:1) | aucune | « Proposer une pose » (catalogue, état vide) |
| **Secondaire** | transparent | `text` | `borderWidth` `border` (3,3:1 sur `background`) | « Voir le catalogue » / « Retour au catalogue » après une proposition |

Une page n'a qu'un seul élément primaire visible (bouton ou lien-bouton).

## Largeur

- Mobile (< `breakpoints.md`) : **100 %** de la colonne.
- À partir de `breakpoints.md` : largeur du contenu (`width: auto`), jamais moins de `sizes.touchTarget`.

## États

| État | Primaire | Secondaire |
|---|---|---|
| Repos | ci-dessus | ci-dessus |
| Survol (pointeur fin) | fond `primaryHover` (7,3:1) | fond `surfaceHover` |
| Focus (`:focus-visible`) | anneau `focus` `focusRingWidth`, décalé `focusRingOffset`, rayon du bouton | idem |
| Pressé (`:active`) | fond `primaryActive` (9,4:1) | fond `divider` |
| Visité | identique au repos (`:visited` sans effet) | idem |

Pas d'état désactivé : un lien indisponible n'est pas affiché (le lien « Proposer une pose » est absent pour un visiteur, il n'est pas grisé).

## Accessibilité

- Nom accessible = texte visible ; l'icône est décorative.
- Les styles de lien globaux (`a { color: primary }`, soulignement au survol) ne s'appliquent pas : la classe du lien-bouton les remplace explicitement (couleur de texte, `text-decoration: none`, y compris au survol).
- Mode contraste élevé (`forced-colors: active`) : ajouter une bordure `borderWidth` transparente à la variante primaire pour que le contour reste visible.

## Mobile (React Native)

`Pressable` avec `accessibilityRole="link"`, mêmes dimensions et couleurs que `bouton.md`.
