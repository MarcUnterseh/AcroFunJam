# Élément d'étiquette (page « Étiquettes »)

Story 8. Une entrée du glossaire `/etiquettes` : le nom et la description d'une étiquette, et, pour les validateurs et les administrateurs, le nombre de transitions qui la portent et les actions « Modifier » / « Retirer », **en place**. Écran : `../ecrans/8-etiquettes.md`. Aucun nouveau token.

Liste : `ul role="list"`, un `li` par étiquette, écart `spacing.sm` (comme `element-transition.md`) : petites cartes `surface`, contour `divider`, rayon `radius.md`, padding `spacing.md`, `display: grid`, écart `spacing.sm`.

## Lecture (visiteur, utilisateur)

```
┌──────────────────────────────────────────┐
│ pop                                      │  h2 : Unbounded 500, size.lg
│ La base propulse le flyer, qui quitte un │  description : size.md, text
│ instant tout contact avec elle avant     │
│ d'être rattrapé.                         │
└──────────────────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| Nom (`h2`) | `fontFamilyDisplayWeb`, `weight.medium`, `size.lg`, `text`, interligne `tight` ; `overflow-wrap: anywhere` ; casse telle que saisie |
| Description (`p`) | `size.md`, `regular`, `text` ; `overflow-wrap: anywhere` |

Le nom n'est **pas** dessiné en pilule ici : c'est un titre de glossaire ; la pilule reste la forme « portée par une pose ou une transition ».

### Champ d'application (story 9a, pour tous)

Juste sous le nom, avant la description : « S'applique aux poses » / « S'applique aux transitions » / « S'applique aux poses et aux transitions ».

| Élément | Tokens |
|---|---|
| Ligne (`p.tag__scope`) | `size.sm`, `weight.semibold`, `textMuted` (7,0:1 sur `surface`, 7,3:1 la nuit) ; marge nulle (l'écart `spacing.sm` de l'élément suffit) ; une phrase, pas de pilule ni d'icône (la pilule est réservée aux étiquettes portées) |

Compteur des validateurs (même rendu que « Portée par N transitions ») : « Portée par 1 pose et 2 transitions », « Portée par 2 transitions », « Portée par 1 pose », « Portée par aucune pose ni aucune transition », « Portée par aucune pose »… selon le champ d'application (libellés : scénarios A7).

### Groupe « S'applique à » (story 9a)

Dans le panneau d'ajout (après la description, avant le bouton) et dans la modification en place (après la description, avant les actions) : `groupe-tuiles-radio.md`, variante **neutre** (cochée : `selected` / `selectedSurface`, bordure 2 px, semi-gras), legend « S'applique à », tuiles « Aux poses », « Aux transitions », « Aux poses et aux transitions ».

| Point | Règle |
|---|---|
| Valeur initiale | ajout : **aucune tuile cochée** ; modification : la valeur actuelle |
| Colonnes (`tile-group__tiles--scope`) | une colonne sous 39,5em de conteneur, **trois** au-delà (pas de quatrième colonne vide) ; « Aux poses et aux transitions » passe sur deux lignes dans sa tuile si besoin (hauteur min. `sizes.control`) |
| Erreur à l'envoi | « Choisis à quoi s'applique l'étiquette. » entre la legend et les tuiles (icône erreur + texte `danger` semi-gras), tuiles en bordure 2 px `danger` (6,6:1 sur `surface`) ; focus sur la première tuile |

## Gestion (validateur, administrateur)

```
┌──────────────────────────────────────────┐
│ lunaire                                  │
│ Pratique thérapeutique : le flyer, …     │
│ Portée par 2 transitions                 │  size.sm, textMuted
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │  pied pointillé divider
│ [ Modifier ] [ Retirer ]                 │  secondaires, 44 px
└──────────────────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| « Portée par N transitions » | `size.sm`, `regular`, `textMuted` ; « Portée par aucune transition » / « Portée par 1 transition » / « Portée par 2 transitions » (libellés : `ux-expert`) |
| Pied de gestion | bordure haute pointillée `borderWidth` `divider`, padding haut `spacing.sm` ; `display: flex`, `flex-wrap: wrap`, écart `spacing.sm` |
| « Modifier », « Retirer » | `bouton.md` secondaires, 44 px, largeur du contenu ; noms accessibles complétés en texte masqué (« Modifier pop », « Retirer pop ») ; **pas de rouge** pour « Retirer » (`bouton.md` : pas de variante danger) |

### Modifier en place

L'élément devient un petit formulaire ; le titre reste le nom **actuel** (repère pendant la saisie).

```
│ lunnaire                                 │  h2 inchangé jusqu'à l'enregistrement
│ Nom                                      │
│ [lunaire                              ]  │  champ.md, compteur
│ 7 / 30                                   │
│ Description                              │
│ [Pratique thérapeutique : …           ]  │  zone de texte 3 lignes, compteur
│ 112 / 200                                │
│ [Enregistrer] [Annuler]                  │  primaire + secondaire
```

| Élément | Tokens |
|---|---|
| Zone | même zone que `zone-etiqueter.md` : fond `background`, rayon `radius.sm`, padding `spacing.md`, écart `spacing.md` ; remplace description, compteur et pied |
| Champs | `champ.md` (fond `surface`, contour `border`) ; « Nom », « Description » (libellés proposés) |
| Compteurs | **toujours visibles** (limites courtes : 30 et 200), sous le champ, alignés à droite, `size.sm`, `textMuted` ; au-delà de la limite : `danger` + `weight.semibold` + icône erreur (pas la couleur seule) |
| Actions | « Enregistrer » primaire, « Annuler » secondaire (libellés : `ux-expert`) |
| Erreur « nom déjà pris » | sous le champ Nom (`champ.md`, bordure 2 px `danger`, icône + texte) : « Une étiquette de ce nom existe déjà dans la liste. » (proposé, d'après le scénario) |

### Retirer : confirmation en place

```
│ vrille                                   │
│ Le flyer tourne sur lui-même …           │
│ Portée par aucune transition             │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ ┌──────────────────────────────────────┐ │  zone : background
│ │ Retirer « vrille » de la liste ?     │ │  size.md, semibold
│ │ Elle ne sera plus proposée.          │ │  size.sm, textMuted (proposé)
│ │ [Retirer l'étiquette] [Annuler]      │ │  primaire + secondaire
│ └──────────────────────────────────────┘ │
```

Le pied « Modifier / Retirer » est remplacé par la zone. Le primaire « Retirer l'étiquette » suit la règle « un primaire par zone ouverte » (comme « Confirmer le refus »).

### Retrait impossible

Après confirmation, si l'étiquette est portée : la zone de confirmation est remplacée par une **alerte** dans l'élément.

```
│ ┃(!) « lunaire » ne peut pas être       │  alerte-formulaire.md, variante erreur
│ ┃    retirée : ces transitions la       │
│ ┃    portent.                           │
│ ┃    Transitions du catalogue           │  size.sm, semibold
│ ┃    • de Bird vers Folded Leaf  Bird › │  lien vers la page de la pose de départ
│ ┃    • Lunar Roll, de Folded Leaf vers  │
│ ┃      Throne                Folded Leaf›│
│ ┃    Propositions en attente            │
│ ┃    • de Bird vers Folded Leaf         │  texte, sans lien (proposé)
│ ┃    Retire-la d'abord de chacune.      │  (proposé)
│ [ Fermer ]                              │  secondaire (proposé), ou « Annuler » conservé
```

| Élément | Tokens |
|---|---|
| Alerte | `alerte-formulaire.md`, **erreur** (`dangerSurface`, barre `danger`, icône erreur) : c'est un refus de l'action |
| Sous-titres de listes | `size.sm`, `weight.semibold`, `text` ; marge haute `spacing.sm` |
| Listes | `ul`, puces natives ; écart `spacing.xs` ; texte `size.sm` `text` |
| Lien vers la pose | `text` souligné, `weight.semibold` (règle de l'alerte : pas de `primary` sur une surface colorée), zone cliquable ≥ 44 px de haut ; texte « Voir Bird » (proposé), nom accessible « Voir la pose Bird » |

### Porteurs d'une étiquette : poses, transitions, propositions (story 9a)

Le refus de retrait et le **refus de changement du champ d'application** utilisent la même alerte erreur, avec trois listes au plus, dans cet ordre et seulement si elles ont des éléments :

| Sous-titre | Élément | Lien |
|---|---|---|
| « Poses du catalogue » | nom de la pose | **le nom est le lien** vers sa page (`text` souligné, semi-gras, ≥ 44 px de haut) |
| « Transitions du catalogue » | « de Bird vers Folded Leaf » / « Lunar Roll, de … » | « Voir Bird » (story 8) |
| « Propositions en attente » | « Proposition de la pose Candlestick », « Modification de Throne », « de Bird vers Folded Leaf » | aucun |

Messages (proposés) : retrait « « lunaire » ne peut pas être retirée : ces éléments la portent. » ; changement « « lunaire » ne peut pas cesser de s'appliquer aux poses : ces éléments la portent. ». Le refus de changement s'affiche **en tête de la zone de modification**, qui reste ouverte avec la saisie (l'utilisateur peut choisir une autre valeur ou annuler).

## États de la liste

| État | Rendu |
|---|---|
| Chargement | `p role="status"` « Chargement des étiquettes… » (proposé), `textMuted` |
| Erreur | `alerte-formulaire.md`, erreur, + « Réessayer » |
| Vide (tout retiré) | `p` « Aucune étiquette pour l'instant. » (proposé), comme la section vide de `element-transition.md` (contour pointillé `divider`) |

## Contraste élevé

Cartes avec contour `CanvasText` ; liens en `LinkText`.

## Mobile (React Native)

Hors périmètre de la story 8.
