# Récapitulatif des ajustements (« proposé → retenu »)

Avant d'envoyer une acceptation **avec ajustements**, le validateur relit ce qu'il a changé (décision Q17, story 4). Affiché dans la carte de proposition (`carte-proposition.md`), à la place du formulaire d'ajustement. Le même rendu sert au contributeur dans « Mes propositions » (story 5, `carte-ma-proposition.md`) : voir « Variante contributeur ».

Deux variantes, une seule **liste** (`dl` des ajustements, nom proposé dans le code : `AdjustmentList`) partagée sans aucune différence de rendu ; seuls le titre, la mention finale, le focus et ce qui suit changent.

Story 6 : la même liste sert à comparer la pose avant et après une **modification** (`recapitulatif-modification.md`) ; elle est devenue une liste de comparaison générique (`ValueChangeList`, `front/apps/web/src/contribution/ValueChangeList.tsx` ; `AdjustmentList` et `PoseChangeList` l'utilisent) dont les deux textes masqués sont des paramètres (« Proposé : » / « , retenu : » ici). Rendu inchangé. Pour une modification, les ajustements se lisent toujours ici (proposé → retenu), et les champs que la modification ne changeait pas y figurent avec la valeur actuelle comme valeur proposée.

Story 9a : ligne « Étiquettes » pour une pose aussi, mêmes règles que pour une transition (story 8) : mots séparés par des virgules dans l'ordre du catalogue, « aucune » écrit, « ~~aucune~~ → inversion », « ~~inversion, lunaire~~ → lunaire » ; pas de pilules (on compare des mots). Un autre ordre du même ensemble n'est pas un ajustement : pas de ligne.

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

## Variante contributeur (story 5)

Dans la carte « ma proposition » (`carte-ma-proposition.md`), sous le statut « Acceptée avec ajustements le … ». Lecture seule.

```
Ajustements apportés                                  <- h3, size.md, bold
Valeur proposée → valeur retenue                      <- clé de lecture, inchangée
┌──────────────────────────────────────────────┐
│ Nom de la pose                               │  <- liste partagée, inchangée
│ t̶h̶r̶o̶n̶e̶  →  Throne                            │
│ ──────────────────────────────────────────── │
│ Difficulté flyer                             │
│ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶  →  Découverte               │
└──────────────────────────────────────────────┘
Les autres valeurs sont celles que tu as proposées.   <- size.sm, textMuted
```

| | Validateur (story 4) | Contributeur (story 5) |
|---|---|---|
| Titre (`h3`) | « Vérifie tes ajustements » | « Ajustements apportés » |
| Focus du titre | reçoit le focus à l'affichage (`tabindex="-1"`, anneau `focus`) | **aucun** : pas de `tabindex`, pas d'anneau ; la page n'affiche rien en réponse à une action |
| Mention finale | « Les autres valeurs restent celles proposées. » | « Les autres valeurs sont celles que tu as proposées. » |
| Après la mention | message facultatif (zone de texte) et boutons d'envoi | rien dans le récapitulatif ; le « Message d'ajustement » éventuel suit, dans la zone de décision de la carte |
| Liste, clé de lecture, textes masqués « Proposé : » / « , retenu : », flèche | identiques | identiques |

Espacements de la variante (elle n'est pas dans une zone `spacing.lg` comme celle du validateur) : titre, marge basse `spacing.xs` ; clé de lecture, marge basse `spacing.sm` ; mention finale, marge haute `spacing.sm`. Mêmes valeurs perçues que côté validateur. L'écart avec le statut au-dessus et le message en dessous est celui de la zone de décision de la carte (`spacing.md`).

Le récapitulatif est sur la `surface` de la carte, sa liste sur `background` : contrastes inchangés (clé et mention `textMuted` 5,8:1 sur `surface` ; valeurs 6,1:1 et 15,4:1 sur `background`).

## Story 8 : ajustement des étiquettes

Un ajustement de plus, terme « Étiquettes », placé **après les difficultés et avant la description** (ordre du formulaire). Les deux valeurs sont des **phrases** : noms séparés par des virgules, dans l'ordre du catalogue, « aucune » quand l'ensemble est vide. Aucune pilule ici (on compare des mots, comme partout dans cette liste).

```
│ Étiquettes                                   │
│ a̶u̶c̶u̶n̶e̶  →  dynamique, pop                     │
│ ──────────────────────────────────────────── │
│ Étiquettes                                   │
│ d̶y̶n̶a̶m̶i̶q̶u̶e̶,̶ ̶i̶n̶v̶e̶r̶s̶i̶o̶n̶,̶ ̶p̶o̶p̶  →  dynamique, pop  │
```

Lu : « Étiquettes : Proposé : aucune, retenu : dynamique, pop ». Rendu, barré, flèche, graisse et textes masqués inchangés ; `overflow-wrap: anywhere`. Aucun nouveau style.

## Aucun ajustement

Si le validateur demande à vérifier sans avoir rien changé (après normalisation, règle R9 bis), pas de récapitulatif : le formulaire reste affiché avec, en tête, une alerte **information** (`alerte-formulaire.md`) dont le texte et l'action sont à fixer par l'`ux-expert` (proposé : « Tu n'as rien modifié. Tu peux accepter la proposition telle quelle. » + bouton secondaire « Accepter et publier »).

## Mode contraste élevé

`forced-colors: active` : le barré et la graisse restent ; la flèche suit `CanvasText` (`currentColor`).

## Mobile (React Native)

`View` sur fond `background` ; valeur proposée en `textDecorationLine: 'line-through'` ; `accessibilityLabel` du `dd` : « Proposé : Intermédiaire, retenu : Découverte ».
