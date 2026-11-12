# Panneau de succès

Remplace un formulaire envoyé avec succès : il dit ce que devient l'envoi, puis propose la suite. Usage en story 3 : après « Proposer la pose ». Version compacte pour une décision dans une liste : `compte-rendu-decision.md` (story 4).

## Structure

```
┌┃──────────────────────────────────────┐
│┃ (✓)                                  │  <- icône succès, 32 px
│┃ Merci, ta proposition est envoyée.   │  <- h2
│┃ Un validateur va l'examiner. Elle    │  <- texte (facultatif)
│┃ apparaîtra dans le catalogue une     │
│┃ fois acceptée.                       │
└┃──────────────────────────────────────┘
                                            spacing.lg
[        Proposer une autre pose        ]   <- bouton primaire
                                            spacing.sm
[         Voir mes propositions         ]   <- lien-bouton secondaire (story 5)
                                            spacing.sm
[           Voir le catalogue           ]   <- lien-bouton secondaire
```

Variante validateur ou administrateur : `h2` « La pose « Throne » est publiée. », texte facultatif « Elle est visible dans le catalogue. », lien « Voir le catalogue ».

### Actions selon le résultat (story 5, décision Q23)

| Résultat | Actions, dans cet ordre |
|---|---|
| Proposition en attente (utilisateur) | « Proposer une autre pose » (bouton primaire), « Voir mes propositions » (lien-bouton secondaire), « Voir le catalogue » (lien-bouton secondaire) |
| Statut illisible (« Ta proposition est envoyée. ») | idem |
| Publication directe (validateur, administrateur) | « Proposer une autre pose », « Voir le catalogue » : **pas** de « Voir mes propositions » |

- Un seul primaire ; les deux liens ont exactement le même rendu (secondaire, sans icône) : aucun des deux n'est poussé plus que l'autre.
- « Voir mes propositions » vient avant « Voir le catalogue » : c'est là qu'on suit ce qu'on vient d'envoyer.

| Élément | Tokens |
|---|---|
| Panneau | fond `successSurface`, barre gauche `sizes.accentBar` `success`, rayon `radius.md`, padding `spacing.lg` ; en mobile (< `breakpoints.md`) `spacing.md` à droite, `spacing.lg` partout à partir de `breakpoints.md` (40em) |
| Icône | cercle + coche, `sizes.iconLarge` (32), `success` (5,7:1 sur `successSurface`), `aria-hidden` ; marge basse `spacing.sm` |
| Titre (`h2`) | `size.lg`, `weight.bold`, `text` (14,4:1), interligne `tight` ; reçoit le focus programmatique (`tabindex="-1"`) |
| Texte | `size.md`, `regular`, `text` ; marge haute `spacing.sm` |
| Actions | **hors du panneau**, sous lui, marge haute `spacing.lg` ; empilées et pleine largeur en mobile (écart `spacing.sm`) ; côte à côte, largeur du contenu, alignées à gauche à partir de `breakpoints.md` (écart `spacing.md` **dans les deux sens**, **`flex-wrap: wrap`**) |

Trois actions côte à côte font ~650 px (~227 + 210 + 177 px + deux écarts de 16) : elles ne tiennent pas toujours dans la carte du formulaire (640 px de contenu au mieux, moins entre 640 et ~770 px de fenêtre). Avec `flex-wrap`, « Voir le catalogue » passe à la ligne, aligné à gauche, sans débordement ni défilement horizontal ; c'est attendu. Sans `flex-wrap`, les libellés en `nowrap` déborderaient de la carte.

- Titre et texte en `text`, pas en `success` : lisibilité maximale ; le succès est porté par l'icône, la barre et le titre.
- Les actions sont posées sur le fond de la page (ou de la carte), pas sur `successSurface` : on ne mélange pas le primaire avec une surface de retour.
- Le nom de la pose dans le titre du validateur est entre guillemets français, sans mise en forme supplémentaire ; s'il est long, il passe à la ligne (`overflow-wrap: anywhere`).
- Même icône et même couleur pour « envoyée » (utilisateur) et « publiée » (validateur) : dans les deux cas l'envoi a réussi ; la différence est dans le texte.

## États

- Apparaît à la place du formulaire, sans animation ; le `h1` de la page reste.
- Focus sur le `h2` (décision `ux-expert`) : anneau `focus` autour du titre, décalé de `focusRingOffset`, rayon `radius.sm`.
- Les actions suivent `bouton.md` et `lien-bouton.md`.

## Mobile (React Native)

`View` aux mêmes tokens ; `AccessibilityInfo.announceForAccessibility` avec le texte du titre ; actions en colonne.
