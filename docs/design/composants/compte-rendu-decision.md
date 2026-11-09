# Compte rendu de décision

Remplace sur place, dans la page « Propositions à valider », la carte d'une proposition que le validateur vient d'accepter ou de refuser (story 4). Il reste affiché jusqu'au prochain chargement de la page. Version **compacte** du panneau de succès (`panneau-succes.md`) : il ne doit pas prendre plus de place que les cartes qui restent à traiter.

## Structure

```
┌┃────────────────────────────────────────────┐
│┃ (✓) La pose « Throne » est publiée dans    │  icône 20 px + h2, size.md, bold
│┃     le catalogue.                          │
│┃     Voir le catalogue                      │  lien (facultatif)
└┃────────────────────────────────────────────┘

┌┃────────────────────────────────────────────┐
│┃ (i) La proposition « Front Bird » est      │
│┃     refusée.                               │
│┃     Le contributeur verra ton motif.       │  texte (facultatif, ux-expert)
└┃────────────────────────────────────────────┘
```

Balisage : dans le même `li` que la carte remplacée, un `div` > icône + `h2` (garde le niveau de titre des cartes voisines : la liste reste navigable par titres) + `p` facultatif + lien facultatif.

## Variantes

| Variante | Fond | Barre gauche (`sizes.accentBar`) | Icône (`sizes.icon`) | Titre (texte : `ux-expert`) |
|---|---|---|---|---|
| **Acceptée** | `successSurface` | `success` | succès (cercle + coche), `success` 5,7:1 | « La pose « Throne » est publiée dans le catalogue. » |
| **Acceptée avec ajustements** | `successSurface` | `success` | succès | « La pose « Throne » est publiée dans le catalogue avec tes ajustements. » |
| **Refusée** | `infoSurface` | `info` | information, `info` 5,5:1 | « La proposition « Front Bird » est refusée. » |

- Accepter publie la pose : c'est un succès. Refuser est une décision menée à bien, mais pas un « succès » à célébrer pour le contributeur : variante **information**, neutre. Le refus n'est jamais présenté en `danger`.
- La différence ne repose pas sur la couleur : icône (coche / « i ») et **titre explicite** (« publiée » / « refusée »).

| Élément | Tokens |
|---|---|
| Conteneur | rayon `radius.md` ; padding `spacing.md` (`spacing.lg` à gauche, comme `alerte-formulaire.md`) ; `display: flex`, écart icône–contenu `spacing.sm` ; pas de contour |
| Icône | `sizes.icon`, alignée sur la première ligne du titre, `aria-hidden` |
| Titre (`h2`) | `size.md`, `weight.bold`, `text` (14,4:1 sur `successSurface`, 13,9:1 sur `infoSurface`), interligne `tight` ; `overflow-wrap: anywhere` ; reçoit le focus (`tabindex="-1"`) : anneau `focus` décalé de `focusRingOffset`, rayon `radius.sm` |
| Texte | `size.md`, `regular`, `text` ; marge haute `spacing.xs` |
| Lien « Voir le catalogue » | `text` souligné, `weight.semibold` (pas de `primary` sur une surface colorée) ; zone cliquable ≥ 44 px de haut (sa hauteur fait déjà l'écart avec le titre : pas de marge haute) ; survol soulignement 2 px, focus anneau `focus` |

Titre en `size.md` (et non `size.lg` comme le nom d'une carte) : les cartes encore à traiter restent visuellement dominantes ; le compte rendu se lit d'un coup d'œil.

## États

- Apparaît sans animation, à la place de la carte ; la liste remonte d'autant (la hauteur diminue). Le focus étant posé sur son titre, la personne ne perd pas sa place.
- Aucune action de décision : on ne peut plus décider d'une proposition traitée.

## Mobile (React Native)

`View` aux mêmes tokens ; `AccessibilityInfo.announceForAccessibility` avec le titre, puis focus sur le titre (`AccessibilityInfo.setAccessibilityFocus`).
