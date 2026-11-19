# Groupe de cases en pastilles (choix des étiquettes)

Story 8. Choix **multiple et facultatif** des étiquettes d'une transition, parmi la liste. Utilisé à trois endroits, au rendu identique :

1. formulaire « Proposer une transition », **entre les difficultés et la description** ;
2. zone « Étiqueter » d'une transition publiée (validateurs, `zone-etiqueter.md`) ;
3. zone d'ajustement d'une proposition de transition (file de validation, `carte-transition.md`), avec un rappel « Proposées : … ».

Écran : `../ecrans/8-etiquettes.md`. Maquette : `../maquettes/8-etiquettes.html`. Aucun nouveau token.

**Story 9a** (`../ecrans/9a-etiquettes-des-poses.md`), même rendu, pastilles limitées aux étiquettes **applicables aux poses** :

4. formulaire « Proposer une pose », **après les questions de flow**, avant le bouton : legend « Étiquettes (facultatives) », aide « Choisis celles qui décrivent la pose. » ; groupe absent si aucune étiquette ne s'applique aux poses ;
5. formulaire « Proposer une modification », après les questions de flow, avant le message : legend « Étiquettes » + marque « Modifiée » (`marque-modifiee.md`) quand l'ensemble coché diffère de l'actuel, rappel « Actuellement : lunaire » / « Actuellement : aucune » à la place de l'aide (même rendu que les rappels des autres groupes : `size.sm`, `textMuted`, marge basse `spacing.sm`) ; cochées = étiquettes actuelles à l'ouverture ;
6. zone « Étiquettes de la pose » (`zone-etiqueter.md`, « Variante pose ») et zone d'ajustement d'une proposition ou d'une modification de pose (rappel « Proposées : … »).

Pas de note « dynamique » sur une pose : aucune implication ne s'applique aux poses à l'amorçage (« dynamique » et ses impliquantes ne s'appliquent qu'aux transitions).

## Structure

```
Étiquettes (facultatives)                                   <- legend
Choisis celles qui décrivent le passage.                    <- aide (proposée)
Proposées : dynamique, pop                                  <- rappel (zone d'ajustement seulement)
(☐ dynamique) (☐ icarien) (☐ inversion) (☐ lunaire)          <- pastilles 44 px, passent à la ligne
(☐ pop) (☐ vrille) (☐ whip)
┃(i) « dynamique » est ajoutée : « pop », « whip » et …     <- note, seulement quand pop / whip / icarien est cochée
▸ Ce que veulent dire les étiquettes                         <- repli-descriptions-etiquettes.md
```

Pastille cochée :

```
╭━━━━━━━━━━━━━━━╮
┃ ☑ pop         ┃   coche native + bordure 2 px selected + fond selectedSurface + libellé semi-gras
╰━━━━━━━━━━━━━━━╯
```

Balisage : `fieldset` > `legend` + aide + rappel + conteneur (`div`) des pastilles + note + repli. Chaque pastille est un `label` qui **englobe** son `input type="checkbox"` (visible) et le nom de l'étiquette : toute la pastille est cliquable. Les cases sont de **vraies cases à cocher** (Espace pour cocher, Tab de l'une à l'autre). L'aide, le rappel, la note et la liste des descriptions sont reliés au `fieldset` par `aria-describedby` (comportement : `ux-expert`).

| Élément | Tokens |
|---|---|
| `fieldset` | bordure, marge, padding remis à zéro ; `min-inline-size: 0` |
| `legend` | comme `groupe-tuiles-radio.md` : `size.md`, `weight.semibold`, `text` ; marge basse `spacing.xs` |
| Aide | `size.sm`, `regular`, `textMuted` ; marge basse `spacing.sm` |
| Rappel « Proposées : … » | comme l'aide de `groupe-tuiles-radio.md` (story 4) : `size.sm`, `textMuted` ; « Proposées : aucune » quand il n'y en avait pas |
| Conteneur | `display: flex`, `flex-wrap: wrap`, écart `spacing.sm` dans les deux sens |
| Pastille (`label`) | `display: inline-flex`, `align-items: center`, écart `spacing.sm` ; **hauteur minimale `sizes.touchTarget` (44)** ; padding horizontal `spacing.sm` + `spacing.xs` (12 px) à gauche, `spacing.md` à droite ; fond **`surface`** ; bordure `borderWidth` **`border`** (3,4:1 sur `surface`, 3,06:1 sur `background`) ; rayon `radius.pill` ; curseur `pointer` ; `max-inline-size: 100%` |
| Case | native, `sizes.icon` × `sizes.icon` (20), `accent-color: selected` ; marge nulle ; **jamais masquée** (elle porte la coche) |
| Libellé | nom actuel de l'étiquette, `size.md`, `regular`, `text` ; `overflow-wrap: anywhere` |

Ordre des pastilles : celui de la liste (ordre du catalogue sur le nom).

## États (par pastille)

| État | Rendu |
|---|---|
| Repos | fond `surface`, bordure 1 px `border`, case vide, libellé `regular` |
| Survol (pointeur fin) | fond `surfaceHover`, bordure 1 px `text` |
| Focus clavier (`label:has(input:focus-visible)`) | anneau `focus` `focusRingWidth` décalé de `focusRingOffset`, **autour de la pastille entière**, rayon `radius.pill` ; anneau natif de la case retiré parce que celui de la pastille le remplace |
| **Cochée** (`label:has(input:checked)`) | **coche** (case native cochée, `selected`) + bordure **`borderWidthStrong` (2 px) `selected`** (padding réduit de 1 px : le texte ne bouge pas) + fond **`selectedSurface`** + libellé **`weight.semibold`** |
| Cochée + survol | inchangée |
| Cochée + focus | cochée + anneau `focus` |
| Désactivée | non utilisée (pendant l'envoi, seul le bouton passe en `aria-disabled`) |

L'état coché se lit **sans la couleur** : coche, bordure doublée, graisse. Contrastes : `selected` sur `selectedSurface` 7,8:1 / 8,6:1 ; `text` sur `selectedSurface` 13,2:1 / 11,8:1 ; `selected` sur `surface` ≥ 3:1 dans les deux thèmes (`contrast.test.ts`).

Pourquoi pas les couleurs de la pilule d'étiquette : ici on **choisit**, là on **lit**. La famille `selected` est celle de tous les choix du site (Oui / Non, tuiles) ; la pierre reste réservée à la lecture.

## « dynamique » ajoutée

Quand « pop », « whip » ou « icarien » est cochée, « dynamique » l'est aussi (règle Q136) et une **note** apparaît sous les pastilles :

> (i) « dynamique » est ajoutée : « pop », « whip » et « icarien » sont toujours dynamiques. *(libellé proposé, à fixer par l'`ux-expert`)*

| Élément | Tokens |
|---|---|
| Note (`p`) | `display: flex`, écart `spacing.sm`, `align-items: flex-start` ; fond `infoSurface` ; rayon `radius.md` ; padding `spacing.sm` vertical, `spacing.md` horizontal ; marge haute `spacing.sm` |
| Icône | information, `sizes.icon`, `info` (4,7:1 / 7,9:1 sur `infoSurface`), `aria-hidden` |
| Texte | `size.sm`, `regular`, `text` (13,4:1 / 12,5:1) ; noms d'étiquettes entre guillemets français |

- La pastille « dynamique » garde l'état **coché standard** : pas de cadenas ni d'état grisé (une case grisée se lirait « indisponible »). Si la personne la décoche, elle revient cochée et la note reste (comportement : `ux-expert`).
- La note disparaît quand aucune des trois n'est plus cochée ; pas d'animation.

## Longueurs

À 320 px (colonne de 288 px, 256 px dans une zone « Étiqueter ») : deux à trois pastilles par ligne ; « dynamique » ≈ 136 px. Une étiquette de 30 caractères occupe une ligne seule et passe à la ligne **dans** la pastille plutôt que de déborder. Zoom 400 % : une pastille par ligne.

## Contraste élevé

`forced-colors: active` : bordure `CanvasText` ; pastille cochée en bordure 2 px `Highlight` ; la case native suit le thème système ; la note garde un contour `CanvasText`.

## Mobile (React Native)

Hors périmètre de la story 8. Le jour venu : `Pressable` `accessibilityRole="checkbox"` et `accessibilityState={{ checked }}`, coche dessinée, mêmes tokens.
