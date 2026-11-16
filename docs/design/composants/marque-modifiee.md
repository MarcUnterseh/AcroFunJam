# Marque « Modifiée »

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : marque en pilule (`radius.pill`), `selectedSurface` + bordure `selected` (famille du primaire). Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.
>
> **Vocabulaire (Q161, story 8)** : ce composant s'appelait « Étiquette « Modifiée » » (`etiquette-modifiee.md`). Le mot « étiquette » est désormais réservé au sens métier (étiquettes des transitions, `pilule-etiquette.md`). Le code garde provisoirement ses noms (`revision-labels.ts`, `form-controls.tsx`, `index.css` citent encore `etiquette-modifiee.md`) : à renommer à l'implémentation de la story 8.

Story 6. Dans le formulaire « Proposer une modification », signale **par un mot** chaque champ dont la valeur saisie diffère de la valeur actuelle de la pose. Elle permet de repérer d'un coup d'œil ce qui sera proposé, sans compter sur la couleur. Écran : `../ecrans/6-proposer-une-modification.md`.

## Structure

```
Difficulté flyer  [Modifiée]                      <- legend + marque, sur la même ligne
Actuellement : Intermédiaire                      <- aide (rappel de la valeur actuelle)
[○ Découverte][○ Débutant][◉ Intermédiaire]…

Nom de la pose  [Modifiée]                        <- label + marque
[Throne                                      ]
Actuellement : Thron
```

Placée **dans** la `legend` (ou le `label`), après le texte, pour qu'elle soit lue avec le nom du groupe ou du champ (décision de l'`ux-expert` : `<span id=… aria-hidden="true">Modifiée</span>` hors du nom accessible, référencé **en tête** de l'`aria-describedby` du champ ou du groupe ; pas d'annonce live). Le libellé et la marque sont mis en ligne avec `display: inline-flex; flex-wrap: wrap; align-items: center; column-gap: spacing.sm` : si la place manque (legend longue à 320 px, zoom), la marque passe à la ligne, alignée à gauche.

| Élément | Tokens |
|---|---|
| Conteneur (`span`) | `display: inline-block` ; fond **`selectedSurface`** ; bordure `borderWidth` **`selected`** ; rayon `radius.pill` ; padding `0` vertical, `spacing.xs` horizontal |
| Texte | « Modifiée », `size.sm`, `weight.semibold`, `text` (13,2:1 sur `selectedSurface`), interligne `tight` (hauteur totale ≈ 20 px : elle tient dans la ligne de 24 px du libellé sans l'agrandir) |
| Icône | aucune (le mot suffit) |

## Pourquoi ces couleurs

- `selected` / `selectedSurface` sont déjà le code de « ton choix » (tuile cochée) : la marque dit « tu as changé cette valeur », dans la famille du primaire, sans nouveau token.
- Ni `success` (ce n'est pas une réussite), ni `danger` (ce n'est pas une erreur, et le champ peut l'être en plus), ni `info` (bleu réservé au focus et aux bandeaux d'information).
- Ni la pilule d'étiquette (`pilule-etiquette.md`, fond `tagSurface` « pierre ») : la marque « Modifiée » parle de la **saisie**, une étiquette parle de la **transition** ; les deux ne se côtoient jamais (la marque n'existe que dans le formulaire de modification d'une pose, qui n'a pas d'étiquettes dans la story 8).
- Bordure `selected` : 7,8:1 sur `selectedSurface` ; elle n'est pas nécessaire au sens (le mot l'est), elle détache la marque du libellé.

## États

- Absente quand la valeur saisie est égale à la valeur actuelle (après normalisation, comme l'API : les espaces superflus du nom ne comptent pas, la casse compte) ; **aucun espace réservé**. Son apparition ne décale pas le formulaire tant qu'elle tient sur la ligne du libellé (hauteur ≤ 24 px) ; quand elle passe à la ligne, le décalage d'une ligne est accepté (même cas qu'un message d'erreur).
- Non interactive : ni survol, ni focus.
- Cumulable avec l'erreur du champ (bordure 2 px `danger` + message) : les deux restent lisibles, l'une sur la ligne du libellé, l'autre sous le champ.
- Sans animation.

## Sans la couleur

Le mot « Modifiée » porte toute l'information. `forced-colors: active` : fond `Canvas`, bordure et texte `CanvasText` (la bordure reste visible).

## Mobile (React Native)

Hors périmètre de la story 6. Le jour venu : `View` aux mêmes tokens, dans la rangée du libellé, et le mot ajouté à l'`accessibilityLabel` du groupe.
