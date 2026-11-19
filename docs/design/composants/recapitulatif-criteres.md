# Récapitulatif des critères (générateur de flow)

Story 9. Rappelle, avec le flow affiché (et dans le panneau « critères trop restrictifs »), les critères avec lesquels il a été tiré : ce que « Générer un autre flow » rejouera (G15). Écran : `../ecrans/9-generer-un-flow.md`. Aucun nouveau token.

## Structure

```
┌──────────────────────────────────┐   fond surfaceHover, radius.sm, padding md
│ Critères du flow                 │   h2 (*proposé*), size.sm, semibold
│ Nombre de transitions          3 │
│ ● Difficulté base, au plus       │   point terre
│                  ◑ Débutant      │
│ ● Difficulté flyer, au plus      │   point ciel
│                  ◑ Débutant      │
│ Avec l'une de ces étiquettes     │   seulement si au moins une
│                  lunaire, pop    │
│ Sans ces étiquettes              │
│                  vrille          │
└──────────────────────────────────┘
```

Balisage : `section` (nommée par son `h2`) > `dl` ; une ligne = `div` > `dt` + `dd`. Les intitulés sont **ceux du formulaire** (« Nombre de transitions », « Difficulté base, au plus »…) : on reconnaît ce qu'on a choisi.

| Élément | Tokens, rendu |
|---|---|
| Conteneur | fond `surfaceHover` (zone intérieure, lisible sur `background` et `surface`), `radius.sm`, padding `spacing.md` ; `display: grid`, écart `spacing.sm` |
| Titre | `h2` avec le flow, `h3` dans le panneau « aucun flow » (dont le `h2` est le message) ; `size.sm`, `weight.semibold`, `text` ; marge nulle |
| Ligne | `display: flex`, `flex-wrap: wrap`, `justify-content: space-between`, écart `spacing.xs` `spacing.md` ; `size.sm` |
| Terme (`dt`) | `regular`, `textMuted` (5,8:1 / 6,4:1 sur `surfaceHover`) ; pour les difficultés, un point de la couleur du rôle (`spacing.sm` de diamètre, `base` / `flyer`, décoratif) comme devant la legend des tuiles |
| Valeur (`dd`) | `weight.semibold`, `text` (13,5:1 / 12,6:1) ; difficulté : phase de lune `sizes.moon` (`textMuted`, décorative) + niveau ; étiquettes : **mots séparés par des virgules**, pas de pilule (ici on rappelle un choix, on ne lit pas une étiquette portée) |
| Lignes d'étiquettes | absentes quand aucune n'est demandée ou exclue |

Pas de lien ni de bouton dans le récapitulatif : « Modifier les critères » est juste en dessous.

## Contraste élevé

Contour `CanvasText` ; points de rôle masqués (décoratifs).
