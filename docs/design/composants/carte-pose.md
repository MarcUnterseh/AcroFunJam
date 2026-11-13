# Carte de pose

Présentation d'une pose publiée dans la grille du catalogue. Remplace le tableau de la story 1. La carte n'est **pas interactive** en story 3 (pas encore de page de détail) ; elle mène à la page de la pose à partir de la story 7 (« Carte cliquable du catalogue »).

Story 7 : la page d'une pose reprend la `dl` sans la modifier (panneau des caractéristiques) ; l'élément de transition (`element-transition.md`) et les cartes de transition (`carte-transition.md`) reprennent ses deux lignes « Base » / « Flyer ».

Story 4 : la carte de proposition (`carte-proposition.md`) reprend son conteneur, son `h2` et sa `dl` **sans les modifier**, pour que le validateur voie la pose telle qu'elle sera publiée. Toute évolution de la `dl` ici s'applique aussi là.

Story 5 : la carte « ma proposition » (`carte-ma-proposition.md`) reprend aussi la `dl` sans la modifier (pose retenue pour une proposition acceptée, pose proposée sinon). Même règle : une évolution de la `dl` vaut pour les trois cartes.

Story 6 : la carte de modification de la file (`carte-modification.md`) reprend la `dl` pour « La pose après modification » ; le lien « Proposer une modification » (ci-dessous) n'appartient qu'au catalogue.

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

Aucun état interactif en story 3 (ni survol, ni focus) ; story 6 : seul le lien « Proposer une modification » (section suivante) est interactif. Story 7 : la carte du **catalogue** mène à la page de la pose (section suivante). Les cartes qui reprennent la `dl` (proposition, ma proposition, modification) restent non interactives.

## Carte cliquable du catalogue (story 7)

Le **nom** devient le lien vers `/poses/:id` (`h2 > a`), étendu à toute la carte par un pseudo-élément (`::after`, `position: absolute; inset: 0`, sur une carte en `position: relative`). Pas d'`onClick` sur le `li`. Deux arrêts de tabulation au plus : le nom, puis « Proposer une modification » (personne connectée), qui reste au-dessus du pseudo-élément (`position: relative; z-index: 1`, déjà en place).

```
┌──────────────────────────────────────┐   <- contour border (3,3:1) : la carte est un contrôle
│ Throne                               │   <- h2 > a : text, bold, souligné en permanence
│ ‾‾‾‾‾‾                               │
│ Base                  Débutant ●●○○  │
│ …                                    │
│ ──────────────────────────────────── │
│ Proposer une modification            │   <- au-dessus de la zone étendue
└──────────────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| Conteneur | contour **`border`** au lieu de `divider` (3,3:1 sur `background` : la carte devient un contrôle, 1.4.11) ; le reste inchangé (`surface`, `radius.md`, padding `spacing.md`) |
| Lien du nom | couleur **`text`** (14,6:1 sur `surface`), `weight.bold`, souligné en permanence (`borderWidth`) ; `overflow-wrap: anywhere` ; zone cliquable = toute la carte |
| Zone étendue (`::after`) | rayon `radius.md` (épouse la carte) ; aucune couleur |

Pourquoi `text` et pas `primary` pour le nom : douze titres terre cuite concurrenceraient « Proposer une pose » et le lien « Proposer une modification » de chaque carte ; le soulignement permanent et le contour `border` disent « cliquable » sans la couleur (règle « jamais la couleur seule »).

| État | Rendu |
|---|---|
| Repos | contour `border` ; nom souligné 1 px |
| Survol de la carte (pointeur fin, hors lien « Proposer une modification ») | fond `surfaceHover` ; contour `text` ; nom souligné **2 px** (`borderWidthStrong`). Contrastes sur `surfaceHover` : `text` 13,9:1, `textMuted` 5,5:1, lien `primary` 4,65:1, point vide `border` 3,0:1 (décoratif) |
| Focus du nom (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px **autour de la carte entière** (`.pose-card:has(a:focus-visible)`, l'anneau propre du lien est retiré) ; rayon `radius.md` ; distinct du survol (pas de changement de fond) |
| Pressé | identique au survol : un fond `divider` ferait tomber le lien `primary` à 4,0:1 |
| Survol du lien « Proposer une modification » | seul ce lien réagit (règles de la section suivante) ; la carte garde son fond de repos (`:has(.pose-card__revision-link:hover)`) |

- Sans `:has()` : l'anneau reste sur le lien du nom (repli acceptable).
- `forced-colors: active` : contour `CanvasText`, nom en `LinkText` souligné, anneau `Highlight`.
- Sélection du texte : la zone étendue empêche de sélectionner le texte de la carte à la souris ; accepté (le nom et les valeurs se lisent sur la page de la pose).

## Lien « Proposer une modification » (story 6)

Seul élément interactif de la carte en story 6, **dans le catalogue uniquement** (jamais dans les cartes qui reprennent la `dl` : proposition, ma proposition, modification). Personne connectée seulement : **absent du DOM** pour un visiteur ou tant que la session est en attente, sans vide réservé.

```
│ Peut terminer un flow         – Non  │
│ ──────────────────────────────────── │  <- séparateur divider
│ Proposer une modification            │  <- lien texte souligné, primary, 44 px de zone
└──────────────────────────────────────┘
```

Balisage : après la `dl`, dans un `p` : `<a href="/poses/:id/proposer-une-modification">Proposer une modification <span class="visually-hidden">de Throne</span></a>` (l'espace hors du texte masqué, pour que le nom accessible soit bien « Proposer une modification de Throne »). Nom accessible : « Proposer une modification de Throne » (unique dans la page) ; texte visible court.

| Élément | Tokens |
|---|---|
| Carte | devient une colonne flex (`display: flex; flex-direction: column`) pour que le lien se cale **en bas** : les liens d'une même rangée de la grille sont alignés, quelle que soit la hauteur du nom |
| Zone du lien | `margin-block-start: auto` (la pousse en bas) ; l'écart minimal avec la `dl` est donné par une marge basse `spacing.sm` de la `dl`, posée seulement quand le lien est présent ; bordure haute `borderWidth` `divider` (même séparateur décoratif que celui de la `dl`) ; padding haut `spacing.xs` |
| Lien (`a`) | `display: inline-flex`, `align-items: center`, **`min-block-size: sizes.touchTarget` (44)** ; `size.md`, `weight.regular`, couleur **`primary`** (4,9:1 sur `surface`), **souligné en permanence** (épaisseur `borderWidth`) ; aligné à gauche ; passe à la ligne si la place manque (`overflow-wrap: anywhere` inutile : mots courts) |
| Icône | aucune (texte seul : la grille reste légère sur mobile) |
| Superposition | `position: relative; z-index: 1` : le lien restera au-dessus du pseudo-élément du futur lien étendu du nom (voir « États ») |

Hauteur ajoutée à la carte : séparateur + 4 + 44 ≈ 49 px. Le lien fait toute la hauteur de la zone cliquable, mais seule la largeur du texte est cliquable ; à 288 px de carte, le libellé (~200 px) tient sur une ligne.

| État | Rendu |
|---|---|
| Repos | `primary`, souligné 1 px |
| Survol (pointeur fin) | `primaryHover` (6,9:1 sur `surface`), soulignement **2 px** (`borderWidthStrong`) |
| Focus (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px, rayon `radius.sm` ; distinct du survol (le soulignement ne change pas) |
| Pressé (`:active`) | `primaryActive` (8,9:1 sur `surface`) |
| Visité | identique au repos |

Pourquoi un lien textuel plutôt qu'un lien-bouton (`lien-bouton.md`) : douze cartes à boutons de 48 px alourdiraient la grille et concurrenceraient « Proposer une pose », seule action primaire de la page. Le soulignement permanent suffit à signaler un lien sans la couleur. `forced-colors: active` : `LinkText`, soulignement conservé.

## Vignette (emplacement futur, non implémenté)

- En tête de carte, pleine largeur, ratio 4:3, rayon `radius.md` aux angles supérieurs, sans padding (la carte garde son padding sous la vignette).
- Dans le DOM, la vignette viendra **après** le `h2` (le titre reste le premier élément lu) et sera remontée visuellement par `order` ; une image d'illustration aura un `alt` vide, puisque le nom suit.
- Aucun espace réservé tant qu'il n'y a pas de photo : pas d'image grise de remplacement.

## Mobile (React Native)

`View` avec les mêmes tokens ; liste en `FlatList` à une colonne (deux colonnes sur tablette à partir de `breakpoints.md`). `accessibilityRole="header"` sur le nom.
