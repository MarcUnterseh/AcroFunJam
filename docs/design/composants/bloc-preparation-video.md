# Bloc « En préparation » / « Impossible à préparer » (vidéo pas encore prête)

Story 12 (V11 ; UX-52, UX-59). **Validateurs et administrateurs seulement** : un visiteur ne voit jamais une vidéo qui n'est pas prête. Le bloc prend la place de l'affiche dans la rangée (`rangee-videos.md`), dans le **même cadre 3:4** : quand la vidéo devient prête, l'affiche et la pastille « Lire » le remplacent **sans recharger la page** et sans que rien ne bouge autour. Aucun nouveau token.

## Structure

```
En préparation               Impossible à préparer
┌ ─ ─ ─ ─ ─ ─ ┐              ┏━━━━━━━━━━━━━┓
                             ┃             ┃
│     (◷)     │              ┃     (!)     ┃   <- icône iconLarge
   En                        ┃ Impossible  ┃   <- size.sm, semibold, text, centré
│ préparation │              ┃ à préparer  ┃
                             ┃             ┃
└ ─ ─ ─ ─ ─ ─ ┘              ┗━━━━━━━━━━━━━┛
Pop to Bird, vue de côté     Pop to Bird, vue de côté
Vidéo : Léa Martin           Vidéo : Léa Martin
┄┄┄┄┄┄┄┄┄┄┄┄                 ┄┄┄┄┄┄┄┄┄┄┄┄
[ Modifier ]                 [ Modifier ]
[ Retirer  ]                 [ Retirer  ]
```

Balisage : `li.video` > `figure.video__figure` > `div.video__frame.video__frame--pending` (ou `--failed`) + `figcaption` (légende, crédit) ; repli de description s'il y en a une ; pied de la vidéo. Le cadre n'est **pas un bouton** (rien à lire).

| Élément | Tokens |
|---|---|
| Cadre | `aspect-ratio: 3 / 4`, `inline-size: 100%` ; fond **`photoMat`** ; rayon `radius.md` ; `display: grid`, `place-content: center`, `justify-items: center`, écart `spacing.xs` ; padding `spacing.sm` ; `text-align: center` ; texte `size.sm`, `semibold`, **`text`** (13,2 / 12,0:1 sur `photoMat`) |
| En préparation | contour `borderWidth` **tireté** `border` (décoratif : 2,75 / 2,83:1 sur `photoMat`, le mot porte le sens : « provisoire ») ; icône **horloge** `sizes.iconLarge` en **`textMuted`** (5,7 / 6,1:1) ; texte « En préparation » |
| Impossible à préparer | contour `borderWidthStrong` **plein** **`danger`** (la règle « erreur = icône + texte + contour 2 px ») ; icône **erreur** `sizes.iconLarge` en **`danger`** (5,3 / 7,2:1 sur `photoMat`, paire nouvelle) ; texte « Impossible à préparer » ; fond `photoMat`, jamais rouge plein |
| Légende, crédit, repli, pied | comme une vidéo prête (`lecteur-video.md`, `rangee-videos.md`) |

Le texte du repère est un vrai texte (pas `aria-hidden`) : il est lu avec la légende. Le message d'aide de l'échec (« La vidéo « … » n'a pas pu être préparée. Retire-la, puis envoie-la de nouveau ou choisis-en une autre. ») est sous la grille (`rangee-videos.md`).

## Mise à jour sans recharger

- En préparation → prête : le cadre devient le bouton d'affiche ; mêmes dimensions de cellule (3:4) : aucun saut. Le focus n'est pas déplacé ; l'annonce est l'affaire de l'`ux-expert` (`annonce-statut.md`).
- En préparation → impossible : le contour tireté devient plein `danger`, l'icône change, le message apparaît sous la grille.
- **Aucune animation** : pas de rotation de l'horloge, pas de pulsation, pas de barre indéterminée (la préparation dure des dizaines de secondes ; un mouvement permanent dans la page serait plus gênant qu'utile, et l'état se lit au mot).

## Couleurs forcées

Cadre avec contour `CanvasText` (tireté conservé pour « En préparation », 2 px pour l'échec) ; icônes `CanvasText`.

## Mobile (React Native)

Hors périmètre (12d).
