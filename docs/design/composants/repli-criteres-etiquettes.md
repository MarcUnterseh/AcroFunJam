# Repli des critères d'étiquettes (« Étiquettes (facultatives) »)

Story 9. Section **facultative et repliable** du formulaire du générateur de flow, fermée par défaut (UX-3), qui contient les deux groupes « Avec l'une de ces étiquettes » et « Sans ces étiquettes ». Son résumé montre **le compte** des étiquettes choisies (UX-4). Écran : `../ecrans/9-generer-un-flow.md`. Aucun nouveau token.

Ce n'est **pas** `repli-descriptions-etiquettes.md` : celui-là est un lien discret qui ouvre une explication ; celui-ci est une **partie du formulaire**, qui contient des contrôles. Il prend donc la silhouette d'un contrôle (48 px, contour `border`).

## Structure

```
Fermé, aucune étiquette :            Fermé, deux choisies :                Ouvert :
┌────────────────────────────┐      ┌────────────────────────────┐      ┌────────────────────────────┐
│ Étiquettes (facultatives) ⌄│      │ Étiquettes (facultatives)  │      │ Étiquettes (facultatives) ⌃│
└────────────────────────────┘      │ (2 choisies)             ⌄ │      │ (1 choisie)                │
                                    └────────────────────────────┘      │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
                                                                        │ groupe « Avec… »           │
                                                                        │ groupe « Sans… »           │
                                                                        │ ▸ Ce que veulent dire …    │
                                                                        └────────────────────────────┘
```

Balisage : `details.criteria-fold` > `summary.criteria-fold__summary` (texte + `span.criteria-fold__count` + chevron) + `div.criteria-fold__content` (deux `fieldset` de `groupe-cases-pastilles.md`, puis `repli-descriptions-etiquettes.md`).

| Élément | Tokens, rendu |
|---|---|
| Repli (`details`) | fond `surface` ; contour `borderWidth` `border` (3,4:1 sur `surface`, 3,06:1 sur `background`) ; `radius.md` |
| Résumé (`summary`) | `display: flex`, `flex-wrap: wrap`, `align-items: center`, écart `spacing.xs` `spacing.sm` ; `min-block-size: sizes.control` (48) ; padding `spacing.sm` vertical, `spacing.md` horizontal ; `size.md`, `weight.semibold`, `text` ; marqueur natif retiré ; curseur `pointer` |
| Chevron | `chevronDown`, `sizes.icon`, `text`, poussé à droite (`margin-inline-start: auto`), retourné à l'ouverture, sans animation |
| Compte (`span`) | absent à zéro ; sinon *proposé* « 1 choisie » / « 2 choisies » (demandées et exclues additionnées) ; rendu de la marque « Modifiée » (`marque-modifiee.md`) : `size.sm`, `weight.semibold`, `text` sur `selectedSurface` (13,2:1 / 11,8:1), contour `borderWidth` `selected`, `radius.pill`, padding 0 `spacing.sm` : la famille du **choix** |
| Contenu | padding `spacing.md` (`spacing.lg` ≥ 40em), bordure haute pointillée `divider` ; `display: grid`, écart `spacing.lg` entre les deux groupes, `spacing.md` avant le repli des descriptions |

Le compte est **dans** le résumé (lu avec lui) : à la fermeture, on sait ce qui reste actif sans rouvrir.

## États du résumé

| État | Rendu |
|---|---|
| Repos | ci-dessus |
| Survol (pointeur fin) | fond `surfaceHover`, contour du repli `text` |
| Focus (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px autour du **repli entier** quand il est fermé, autour du résumé quand il est ouvert ; rayon `radius.md` |
| Pressé | fond `divider` |
| Ouvert | chevron vers le haut ; texte inchangé (le natif annonce « développé ») |

## Contraste élevé, mouvement

`forced-colors: active` : contour `CanvasText`, compte avec contour `CanvasText`. Aucune animation d'ouverture.

## Mobile (React Native)

Hors périmètre (story dédiée) : `Pressable` `accessibilityState={{ expanded }}`, mêmes tokens.
