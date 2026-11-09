# Récapitulatif des ajustements (« proposé → retenu »)

Avant d'envoyer une acceptation **avec ajustements**, le validateur relit ce qu'il a changé (décision Q17, story 4). Affiché dans la carte de proposition (`carte-proposition.md`), à la place du formulaire d'ajustement. Le même rendu servira au contributeur dans « Suivre mes propositions » (story 5).

## Structure

```
Vérifie tes ajustements                               <- h3, size.md, bold
Valeur proposée → valeur retenue                      <- clé de lecture, size.sm, textMuted
┌──────────────────────────────────────────────┐
│ Nom de la pose                               │  <- terme (dt), size.sm, semibold
│ T̶h̶r̶o̶n̶  →  Throne                             │  <- proposée barrée, atténuée → retenue, semi-grasse
│ ──────────────────────────────────────────── │
│ Difficulté flyer                             │
│ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶  →  Découverte               │
│ ──────────────────────────────────────────── │
│ Peut terminer un flow                        │
│ O̶u̶i̶  →  Non                                  │
└──────────────────────────────────────────────┘
Les autres valeurs restent celles proposées.          <- size.sm, textMuted
```

Seules les valeurs **modifiées** sont listées, dans l'ordre du formulaire : nom, difficulté base, difficulté flyer, peut commencer, peut terminer. Les termes sont ceux de la carte de pose (« Base » devient « Difficulté base » ici, pour être lu hors du contexte de la `dl` de la carte : à confirmer par l'`ux-expert`).

Balisage : `h3`, `p` (clé de lecture), `dl` ; chaque ajustement est un `div` > `dt` + `dd`. Dans le `dd` :

```
<span class="adjustment__proposed"><span class="visually-hidden">Proposé : </span>Intermédiaire</span>
<svg aria-hidden="true">→</svg>
<span class="adjustment__retained"><span class="visually-hidden">, retenu : </span>Découverte</span>
```

Lu : « Difficulté flyer : Proposé : Intermédiaire, retenu : Découverte ». On n'utilise pas `del` / `ins` : la plupart des lecteurs d'écran ne les annoncent pas, et le texte masqué dit la même chose partout.

| Élément | Tokens |
|---|---|
| Titre (`h3`) | `size.md`, `weight.bold`, `text`, interligne `tight` ; marge basse `spacing.xs` ; reçoit le focus à l'affichage (`tabindex="-1"`, anneau `focus`, rayon `radius.sm`) si l'`ux-expert` le retient |
| Clé de lecture | `size.sm`, `textMuted` (5,8:1 sur `surface`), avec la même flèche que dans la liste ; marge basse `spacing.sm` ; `aria-hidden` (le texte masqué des valeurs dit déjà « proposé » / « retenu ») |
| Liste (`dl`) | fond **`background`** (pour la détacher de la carte `surface`), contour `borderWidth` `divider` (décoratif), rayon `radius.md`, padding `spacing.md` |
| Séparateur entre ajustements | bordure haute `borderWidth` `divider` du 2ᵉ ajustement et des suivants, padding haut `spacing.sm`, marge haute `spacing.sm` |
| Terme (`dt`) | `size.sm`, `weight.semibold`, `text` ; marge basse `spacing.xs` |
| Valeur (`dd`) | marge nulle ; `display: flex`, `flex-wrap: wrap`, `align-items: baseline`, écart `spacing.sm` |
| Valeur proposée | `size.md`, `regular`, **`textMuted`** (6,1:1 sur `background`), **barrée** (`text-decoration: line-through`, épaisseur `borderWidth`, couleur `textMuted`) ; `overflow-wrap: anywhere` |
| Flèche | icône **flèche vers la droite** (nouvelle, trait 2 px sur grille de 20), `sizes.icon`, `textMuted`, `aria-hidden`, `flex-shrink: 0` ; aucune flèche typographique « → » dans le texte (elle serait lue) |
| Valeur retenue | `size.md`, **`weight.semibold`**, **`text`** (15,4:1 sur `background`) ; `overflow-wrap: anywhere` |
| Mention finale | `size.sm`, `textMuted` ; marge haute `spacing.sm` |

### Sans la couleur

La différence entre « proposé » et « retenu » se lit par **quatre indices qui ne sont pas des couleurs** : l'ordre (proposé à gauche, retenu à droite), la flèche, le **barré** de la valeur proposée, la **graisse** de la valeur retenue. L'atténuation (`textMuted`) n'est qu'un renfort ; la valeur barrée reste lisible (6,1:1) parce que le validateur doit pouvoir la relire. Ni rouge pour l'ancienne valeur, ni vert pour la nouvelle : un ajustement n'est ni une erreur ni une victoire, et le vert / rouge est illisible pour une partie des daltoniens.

Pas d'échelle à points ni d'icônes coche / tiret dans le récapitulatif : il compare des **mots**.

### Longueurs

- Nom long (60 caractères) : la valeur proposée occupe sa ligne, la flèche et la valeur retenue passent à la ligne suivante (`flex-wrap`) ; la flèche ne se retrouve jamais seule en fin de ligne : flèche et valeur retenue sont groupées dans un même `span` en `inline-flex` (écart `spacing.sm`).
- Mobile 320 px : la liste n'offre que ~208 px utiles (page 24 + carte 16 + liste 16 de chaque côté) ; « Intermédiaire → Découverte » (~230 px) passe donc sur deux lignes, la valeur retenue sous la valeur proposée, précédée de sa flèche. Dès ~360 px, une ligne.

## Aucun ajustement

Si le validateur demande à vérifier sans avoir rien changé (après normalisation, règle R9 bis), pas de récapitulatif : le formulaire reste affiché avec, en tête, une alerte **information** (`alerte-formulaire.md`) dont le texte et l'action sont à fixer par l'`ux-expert` (proposé : « Tu n'as rien modifié. Tu peux accepter la proposition telle quelle. » + bouton secondaire « Accepter et publier »).

## Mode contraste élevé

`forced-colors: active` : le barré et la graisse restent ; la flèche suit `CanvasText` (`currentColor`).

## Mobile (React Native)

`View` sur fond `background` ; valeur proposée en `textDecorationLine: 'line-through'` ; `accessibilityLabel` du `dd` : « Proposé : Intermédiaire, retenu : Découverte ».
