# Lien-bouton

Lien de navigation (`<a href>`) présenté comme un bouton, parce qu'il porte une action de premier plan d'une page. Usages en story 3 : « Proposer une pose » sur le catalogue et dans son état vide, « Voir le catalogue » / « Retour au catalogue » après une proposition. Le rôle reste celui d'un **lien** (il change de page, il s'ouvre au clic du milieu, Entrée l'active, pas Espace) ; seule l'apparence est celle d'un bouton (`bouton.md`).

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
| **Secondaire** | transparent | `text` | `borderWidth` `border` (3,3:1 sur `background`) | « Voir le catalogue » / « Retour au catalogue » après une proposition ; story 5 : « Mes propositions » sur le catalogue, « Voir mes propositions » après une proposition |

Une page n'a qu'un seul élément primaire visible (bouton ou lien-bouton). C'est pourquoi « Mes propositions » est **secondaire** et **sans icône** : « Proposer une pose » reste la seule action principale du catalogue.

## Groupe d'actions de l'en-tête de page (catalogue, story 5)

À côté du `h1` « Catalogue des poses », pour une personne connectée : « Proposer une pose » (primaire, icône plus) **puis** « Mes propositions » (secondaire, sans icône), dans cet ordre dans le DOM comme à l'écran.

```
Mobile (< 640 px) :                       ≥ 640 px :
Catalogue des poses                       Catalogue des poses    [(+) Proposer une pose] [Mes propositions]
                         spacing.md
[   (+) Proposer une pose   ]
                         spacing.sm
[     Mes propositions      ]
```

| Élément | Règle |
|---|---|
| Groupe (`div`) | mobile : colonne, liens pleine largeur, écart `spacing.sm` (comme les actions de `panneau-succes.md`) ; à partir de `breakpoints.md` : rangée, largeur du contenu, écart `spacing.md` dans les deux sens, `flex-wrap: wrap` |
| Place dans l'en-tête de page | celle qu'occupait le lien seul (`../ecrans/3-proposer-une-pose.md`) : sous le `h1` en mobile (écart `spacing.md`), à droite du `h1` à partir de `breakpoints.md` ; si la rangée manque de place (titre ~265 px + groupe ~390 px + écart : entre 640 et ~710 px de fenêtre, ou au zoom), le groupe passe sous le titre, **aligné à gauche** |
| Catalogue vide | le groupe ne contient que « Mes propositions » (« Proposer une pose » est dans le bloc vide, en primaire, et n'est pas répété) |
| Erreur de chargement du catalogue | le groupe ne contient que « Mes propositions », qui reste affiché pendant « Réessayer » ; si les poses arrivent ensuite, « Proposer une pose » s'insère devant lui |
| Visiteur | aucun groupe : pas de vide réservé |

Les deux liens ont la même hauteur (`sizes.control`) : la rangée garde sa hauteur de 48 px à partir de `breakpoints.md`.

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
