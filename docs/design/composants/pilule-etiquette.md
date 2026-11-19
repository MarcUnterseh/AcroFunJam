# Pilule d'étiquette

Story 8. Montre, **en lecture seule**, une étiquette portée par une transition (« pop », « lunaire »…). Écran : `../ecrans/8-etiquettes.md`. Maquette : `../maquettes/8-etiquettes.html`. Nouveaux tokens : `tagSurface`, `tagBorder` (`principes.md`).

Utilisée sur la page d'une pose (ligne « Étiquettes » de chaque transition, `element-transition.md`), dans les cartes de la file de validation et de « Mes propositions » (`carte-transition.md`). **Pas** dans le récapitulatif des ajustements (on y compare des mots : `recapitulatif-ajustements.md`).

**Story 9a** : la même pilule montre aussi les étiquettes **d'une pose** : cartes du catalogue (`carte-pose.md`), ciel de la page d'une pose, cartes de la file et de « Mes propositions ». Pose et transition se distinguent par la place et les mots, jamais par le style de la pilule. Écran : `../ecrans/9a-etiquettes-des-poses.md`.

## Anatomie

```
Étiquettes  (dynamique) (inversion) (whip)
^^^^^^^^^^   ^^^^^^^^^^^
libellé      pilule : fond pierre, contour décoratif, mot en 14 px, rien d'autre
```

- Une pilule = le **nom actuel** de l'étiquette, tel qu'il est saisi (casse conservée : « Lunaire II »), dans l'ordre reçu de l'API (ordre du catalogue).
- Ni icône, ni phase, ni mot de pastille, ni couleur de rôle : c'est ce qui la distingue de la **pastille de rôle** (`pastille-role.md`). Ni bordure `selected`, ni fond violet : c'est ce qui la distingue de la **marque « Modifiée »** (`marque-modifiee.md`) et d'une **case cochée** (`groupe-cases-pastilles.md`). Hauteur ≈ 28 px, sans contour de contrôle : elle ne ressemble à aucun bouton (44 / 48 px, contour `border` ou fond `surfaceHover`).

## Ligne « Étiquettes »

Balisage recommandé (à confirmer par l'`ux-expert`) : une `dl` propre, après celle des difficultés : `<dl class="tag-line"><dt>Étiquettes</dt><dd><ul role="list">…</ul></dd></dl>`. Lu : « Étiquettes, liste de 3 éléments, dynamique, inversion, whip ».

| Élément | Tokens |
|---|---|
| Ligne (`dl`) | marge nulle ; `display: flex`, `flex-wrap: wrap`, `align-items: center`, écart `spacing.xs` (vertical) `spacing.sm` (horizontal) |
| Libellé (`dt`) | « Étiquettes », `size.sm`, `weight.semibold`, `textMuted` (7,0:1 sur `surface`, 6,3:1 sur `background`) |
| Liste (`ul`) | `display: flex`, `flex-wrap: wrap`, écart `spacing.xs` `spacing.sm` ; marges, padding et puces retirés |
| Pilule (`li`) | `display: inline-flex`, `align-items: center` ; padding `spacing.xs` vertical, `spacing.sm` + `spacing.xs` horizontal (12 px, `calc`) ; fond **`tagSurface`** ; contour `borderWidth` **`tagBorder`** (décoratif) ; rayon `radius.pill` ; `max-inline-size: 100%` |
| Texte | `size.sm`, `weight.medium`, `text` (14,1:1 aube, 12,2:1 nuit), interligne `tight` ; `overflow-wrap: anywhere` (nom de 30 caractères à 320 px) |

### « aucune »

- **Page d'une pose** : une transition sans étiquette n'a **pas** de ligne (rien, aucun vide réservé).
- **File de validation** : la ligne reste, avec le mot « aucune » à la place de la liste : `<dd>aucune</dd>`, `size.sm`, `regular`, `text`. Lu et vu : « Étiquettes : aucune » (les deux-points sont ajoutés en texte masqué après le `dt` si l'`ux-expert` le souhaite ; visuellement l'écart suffit). Pas de pilule « aucune » : ce n'est pas une étiquette.
- **« Mes propositions »** : comme la page d'une pose (pas de ligne), sauf décision contraire de l'`ux-expert`.

### Ligne d'une pose (story 9a)

Dans le `dl.pose-card__details` de la pose (carte du catalogue, ciel, cartes de la file), la ligne est un **groupe** du `dl` et non un `dl` propre : `<div class="tag-line"><dt>Étiquettes</dt><dd><ul role="list">…</ul></dd></div>`, après les bornes de flow. Elle hérite de l'écart `spacing.md` du `dl`. Catalogue et page d'une pose : rien sans étiquette ; file de validation : « aucune ».

### Sur le ciel (page d'une pose, story 9a)

| Élément | Rendu |
|---|---|
| Terme « Étiquettes » | **`skyText`** (≥ 6,3:1 sur chaque arrêt de l'aube, ≥ 11,5:1 la nuit) au lieu de `textMuted` (qui tomberait à 2,7:1 au bas du ciel de l'aube) |
| Pilule | **inchangée et opaque** (`tagSurface`, `tagBorder`, `text` : 14,1:1 / 12,2:1) ; ni transparence ni flou |

La forme de la pilule se détache peu du ciel (1,1 à 2,2:1, comme les pastilles de rôle la nuit) : décoratif, sans effet sur la lecture.

## États

Aucun : ni survol, ni focus, ni sélection. Pas de lien (pas de filtre par étiquette dans la story 8).

## Longueurs

- « Lunaire II », « dynamique » : une ligne. Nom de 30 caractères : jusqu'à 2 lignes dans la pilule à 320 px, sans déborder.
- Beaucoup d'étiquettes : la liste passe à la ligne ; rien n'est tronqué ni replié.

## Sans la couleur, contraste élevé

Le mot porte tout le sens ; la pierre et le contour ne sont qu'un regroupement visuel. `forced-colors: active` : fond `Canvas`, contour `CanvasText` (la pilule reste lisible comme un bloc), texte `CanvasText`.

## Mobile (React Native)

Hors périmètre de la story 8. Le jour venu : `View` aux mêmes tokens, `flexWrap: 'wrap'`, `accessibilityLabel` de la ligne « Étiquettes : dynamique, inversion, whip ».
