# Pastille de compteur

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : Inchangée (pilule `badge` / `badgeContrast`), valeurs de la nouvelle palette ; en sombre, pastille claire sur fond sombre. Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.

Petit nombre accolé à un lien pour dire combien d'éléments attendent la personne. Usage en story 4 : nombre de propositions en attente dans le lien « Propositions à valider » de l'en-tête (`en-tete.md`).

## Structure

```
[ Propositions à valider (3) ]      la pastille est le « (3) » : disque sombre, chiffre blanc
[ Propositions à valider (99+) ]    au-delà de 99 : « 99+ », la pastille s'allonge en gélule
```

Balisage : `span` à l'intérieur du lien, **`aria-hidden="true"`** ; le nombre est dit par le nom accessible du lien (texte masqué visuellement « (3 en attente) », « (plus de 99 en attente) »). La pastille n'est jamais un élément interactif à elle seule.

| Élément | Tokens |
|---|---|
| Conteneur | `display: inline-flex`, centré dans les deux axes ; hauteur et largeur minimales `sizes.badge` (24) ; padding horizontal `spacing.xs` ; rayon `radius.pill` ; fond `colors.badge` |
| Chiffres | `size.sm` (14), `weight.semibold`, `colors.badgeContrast` (**11,5:1** sur `badge`), interligne 1 (hauteur fixée par le conteneur), `font-variant-numeric: tabular-nums` |
| Écart avec le libellé | `spacing.sm` (écart du lien, `gap`) |

- 1 chiffre : disque de 24 px ; 2 chiffres : gélule de ~28 px ; « 99+ » : ~36 px.
- Forme sur le fond de l'en-tête : `badge` sur `surface` 10,9:1, sur `surfaceHover` (lien survolé) 10,4:1, sur `divider` (lien pressé) 8,8:1 : la pastille reste lisible dans tous les états du lien.

## Pourquoi une pastille neutre

- **Pas de primaire** : le terre cuite signale l'action principale d'une page ; une pastille terre cuite dans l'en-tête ferait concurrence au « Proposer une pose » du catalogue.
- **Pas de danger ni de rouge** : des propositions en attente ne sont ni une erreur ni une urgence ; un rouge mettrait le validateur sous pression, ce que l'`ux-expert` veut éviter (« pas de pression à accepter »).
- Le contraste fort (disque sombre) suffit à attirer l'œil ; l'information est portée par le **chiffre**, jamais par la couleur.

## États

| État | Rendu |
|---|---|
| Nombre inconnu (chargement, échec du chargement) | **absente** ; aucun espace réservé, aucun « … » |
| 0 | **absente** (le lien reste) |
| 1 à 99 | le nombre |
| ≥ 100 | « 99+ » |
| Le nombre change (après une décision) | nouveau nombre, sans animation ni clignotement |

La pastille suit le lien qui la contient (survol, focus, `aria-current`) sans changer elle-même ; l'anneau de focus entoure le lien entier. Le soulignement de `aria-current` se propage à la pastille (`text-decoration` d'un parent s'applique aux descendants) : sur le fond `primary`, il est presque invisible et ne gêne pas la lecture du chiffre ; on l'accepte plutôt que d'ajouter une règle pour l'en empêcher.

**Mode contraste élevé** (`forced-colors: active`) : le fond disparaît ; ajouter une bordure `borderWidth` transparente (rendue en `CanvasText`) pour garder la forme de pastille autour du chiffre.

## Mobile (React Native)

`View` de `minHeight` / `minWidth` `sizes.badge`, `borderRadius: radius.pill`, `paddingHorizontal: spacing.xs`, fond `badge` ; `Text` en `badgeContrast` ; `importantForAccessibility="no"` (le nombre est dans l'`accessibilityLabel` de l'élément qui la porte).
