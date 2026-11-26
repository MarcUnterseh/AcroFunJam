# Élément de transition (page d'une pose)

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : Chaque transition est une petite carte (`surface`, contour `divider`, rayon `md`). Transition sans nom : « Throne ⤳ Bird » avec la **trajectoire** en pointillés (46 × 20, `sunStrong`), décorative ; nom accessible inchangé « de Throne vers Bird ». Washing machine : la **boucle** à la place de la trajectoire (dans le titre sans nom, ou devant le lien de l'autre pose pour une transition nommée), « (même pose) » toujours écrit. Difficultés en pastilles de rôle ; description en `textMuted`. Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.

Une transition publiée dans une des deux sections de la page d'une pose (story 7) : « Transitions depuis Throne » ou « Transitions vers Throne ». Écran : `../ecrans/7-proposer-une-transition.md`. Maquette : `../maquettes/7-page-pose-et-transition.html`.

**Liste plate** : pas de carte par transition, pas de compteur. Les éléments sont séparés par des filets décoratifs, sur le fond de la page. Raison : une pose peut avoir une dizaine de transitions ; des cartes encadrées alourdiraient la page et concurrenceraient le panneau des caractéristiques, seule « carte » de l'écran.

## Structure

```
──────────────────────────────────────────────  <- filet divider (haut de la liste)
Ninja Star                                      <- h3 : nom
Vers Star (même pose)                           <- ligne de l'autre pose : « Vers » + lien + mention
Base                          Avancé ●●●●       <- dl (lignes de carte-pose.md)
Flyer                         Avancé ●●●●
Rotation complète, retour en Star.              <- description (facultative), retours à la ligne conservés
Vidéo : https://example.org/ninja-star
──────────────────────────────────────────────
Throne → Bird                                   <- h3 d'une transition sans nom (flèche = icône aria-hidden)
Vers Bird
Base                        Débutant ●●○○
Flyer                       Débutant ●●○○
──────────────────────────────────────────────
```

Balisage : `section` (nommée par son `h2`) > `ul role="list"` > `li` > `h3`, `p` de l'autre pose, `dl`, `p` description.

| Élément | Tokens |
|---|---|
| Liste (`ul`) | marges et puces retirées ; bordure haute `borderWidth` `divider` |
| Élément (`li`) | padding vertical `spacing.md`, horizontal 0 ; bordure basse `borderWidth` `divider` ; `display: grid`, écart `spacing.xs` |
| Titre (`h3`) | `size.md`, `weight.bold`, `text` (15,4:1 sur `background`), interligne `tight` ; `overflow-wrap: anywhere` (nom de 60 caractères) |
| Titre sans nom | « Throne », icône **flèche** (`sizes.icon`, `textMuted`, `aria-hidden`), « Bird » ; le tout dans un `span aria-hidden="true"`, précédé d'un texte masqué « de Throne vers Bird » (nom accessible) ; `display: inline-flex`, `flex-wrap: wrap`, écart `spacing.xs` |
| Ligne de l'autre pose (`p`) | `size.md`, `regular`, `textMuted` (6,1:1) pour « Vers » / « Depuis » ; `display: flex`, `flex-wrap: wrap`, `align-items: center`, écart `spacing.xs` |
| Lien de l'autre pose | `primary` (5,2:1), `weight.semibold`, souligné en permanence ; `display: inline-flex`, `align-items: center`, **`min-block-size` et `min-inline-size` `sizes.touchTarget` (44)** (« Star » ou « Bird » font moins de 44 px de large) |
| « (même pose) » | après le lien, hors du lien, `textMuted`, `regular` |
| Difficultés (`dl`) | lignes « Base » / « Flyer » de `carte-pose.md` sans changement (terme `textMuted`, valeur `semibold` à droite, échelle à points) ; à partir de `breakpoints.md` (conteneur ≥ 40em), les deux lignes côte à côte : grille de deux colonnes égales, écart `spacing.xl` |
| Description (`p`) | `size.md`, `regular`, `text` ; marge haute `spacing.xs` (en plus de l'écart) ; **`white-space: pre-line`** (retours à la ligne conservés, Q105) ; `overflow-wrap: anywhere` (adresse web longue) ; texte brut, aucune adresse transformée en lien |

- **Pourquoi « Vers Bird » même quand le titre dit « Throne → Bird »** : le lien vers l'autre pose est toujours au même endroit, quel que soit le nom ; la ligne porte aussi « (même pose) ». Le titre reste un texte, jamais un lien (pas de page propre à une transition). **Révisé par la story 12** : la règle « un seul lien par élément » ne tient plus (voir « Story 12 : vidéos ») ; ce qui reste vrai, c'est que « Vers Bird » est le **seul lien vers une autre page** pour un visiteur, et que l'élément n'est jamais une carte cliquable en entier.
- Pas de couleur par difficulté (règle de `legende-echelle.md`).
- Pas de séparateur entre difficultés et description : l'écart suffit, la description appartient à l'élément.

## Story 8 : étiquettes

Ordre dans l'élément : titre, autre pose, difficultés, **ligne « Étiquettes »** (`pilule-etiquette.md`, absente s'il n'y en a aucune), description, **repli « Ce que veulent dire ces étiquettes »** (`repli-descriptions-etiquettes.md`, absent s'il n'y en a aucune), **pied de gestion « Étiqueter »** (`zone-etiqueter.md`, validateurs et administrateurs seulement, présent même sans étiquette). Écart entre ces blocs : celui de l'élément (`spacing.sm`). Écran : `../ecrans/8-etiquettes.md`.

## Story 12 : vidéos

Ordre dans l'élément : titre, autre pose, difficultés, ligne « Étiquettes », description, **bloc « Vidéos »** (`rangee-videos.md` : titre « Vidéos », rappel de sécurité, rangée d'affiches compactes ; absent sans vidéo présentée), repli « Ce que veulent dire ces étiquettes », pied de gestion (« Étiqueter », puis « Ajouter une vidéo » et « 1 vidéo sur 3 », ou la phrase du maximum). Écran : `../ecrans/12-videos-des-transitions.md`.

**Fin de « un seul lien par élément »** : un élément peut désormais contenir, en plus du lien « Vers Bird », jusqu'à 3 boutons « Lire », 3 replis « Description de la vidéo », le repli des étiquettes, et pour un validateur « Étiqueter », « Ajouter une vidéo » (lien-bouton vers une autre page), « Modifier » et « Retirer » par vidéo. Conséquences :

- l'élément **n'est jamais cliquable en entier** (pas de `::after` étendu sur l'élément) ; chaque action a sa propre cible de 44 px ;
- les cibles restent **distinctes par la forme** : lien souligné (`primary`), repli (`primary` + chevron, non souligné), pastille « Lire » sur l'image, boutons secondaires en pilule sous un pointillé (gestion) ;
- chaque nom accessible est **suffixé** de ce qu'il vise (« Lire Pop to Bird, tutoriel… », « Ajouter une vidéo à Pop to Bird », « Retirer Pop to Bird, tutoriel ») : plusieurs « Lire » ou « Retirer » dans la page ne se confondent pas dans une liste des boutons ;
- l'ordre de tabulation suit l'ordre de lecture : lien de l'autre pose, affiches et leurs replis (dans l'ordre d'ajout), repli des étiquettes, gestion.

L'élément garde son rendu de petite carte (`surface`, `divider`, `radius.md`, padding `spacing.md`) ; à 320 px, son contenu fait 256 px, ce qui fixe la rangée à 2 colonnes. Ancre de retour après l'ajout : `scroll-margin-block-start: spacing.lg`.

## États

Aucun état propre à l'élément. Le lien de l'autre pose :

| État | Rendu |
|---|---|
| Repos | `primary`, souligné `borderWidth` |
| Survol (pointeur fin) | `primaryHover` (7,3:1), soulignement `borderWidthStrong` |
| Focus (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px, rayon `radius.sm` ; soulignement inchangé |
| Pressé | `primaryActive` (9,4:1) |
| Visité | identique au repos |

## Section vide

Quand la section n'a aucune transition, la liste est remplacée par un `p` : « Aucune transition ne part de Star pour l'instant. » / « Aucune transition n'arrive à Star pour l'instant. ». `size.md`, `regular`, `textMuted` (6,1:1) ; padding vertical `spacing.md` ; bordures haute et basse `divider`, pour garder la même silhouette qu'une liste d'un élément. Pas de bloc encadré (ce n'est pas un état de la page, seulement d'une section).

## Longueurs

- À 320 px, la colonne fait 288 px ; « Base » + « Intermédiaire ●●●○ » tient sur une ligne ; au zoom, la valeur passe sous le terme (`flex-wrap`).
- Description de 500 caractères : ~12 lignes à 320 px, rien n'est replié.

## Mode contraste élevé

Lien en `LinkText` souligné ; filets en `CanvasText` inutiles (décoratifs) ; points de l'échelle comme `legende-echelle.md`.

## Mobile (React Native)

Hors périmètre de la story 7.
