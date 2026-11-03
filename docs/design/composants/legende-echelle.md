# Légende de l'échelle de difficulté

Rappel, sur le catalogue, de l'ordre des quatre niveaux, suivi de l'avertissement de responsabilité. Elle apprend aussi à lire l'**échelle décorative à points** des cartes (`carte-pose.md`).

## Structure

```
Niveaux de difficulté, du plus accessible au plus exigeant :
●○○○ Découverte   ●●○○ Débutant   ●●●○ Intermédiaire   ●●●● Avancé
Tu restes juge de tes limites : pratique à ton niveau et prévois un spotter quand tu en as besoin.
```

En grand écran, l'introduction et les quatre niveaux tiennent sur **une ligne** ; en mobile ils passent à la ligne entre deux niveaux, jamais au milieu d'un niveau (`white-space: nowrap` sur chaque item).

| Élément | Balise | Tokens |
|---|---|---|
| Bloc | `div` | marge basse `spacing.lg` avant la grille des cartes |
| Introduction | texte qui étiquette la liste (`aria-labelledby` sur l'`ol`, ou texte précédant) | `size.sm`, `regular`, `textMuted` (6,1:1) |
| Liste | `ol`, en ligne (`display: inline-flex`, `flex-wrap: wrap`) ; marges et puces retirées | écart horizontal `spacing.md`, vertical `spacing.xs` |
| Item | `li` | `size.sm`, `weight.semibold`, `text` (15,4:1) |
| Échelle à points | `span aria-hidden="true"` avant le nom du niveau | voir ci-dessous ; écart `spacing.xs` avec le nom |
| Avertissement | `p` | `size.sm`, `regular`, `textMuted` ; marge haute `spacing.xs` ; une ligne en grand écran |

L'`ol` porte déjà l'ordre (lu « liste de 4 éléments, 1 Découverte… ») : pas de séparateur « < » ni de chevrons, qui seraient lus ou sembleraient des opérateurs.

## Échelle à points (partagée avec la carte)

- 4 points de `sizes.scaleDot` (8 px) de diamètre, écart `spacing.xs`, alignés sur le milieu du texte.
- Points « pleins » (rang du niveau : 1 à 4) : fond `text` ; points « vides » : contour `borderWidth` `border` (3,3:1 sur `background`, 3,2:1 sur `surface`), fond transparent.
- La différence plein / vide est une différence de **forme** (disque / anneau), pas de couleur ; la difficulté est toujours écrite en toutes lettres à côté.
- **Aucune couleur par niveau** (ni vert, ni orange, ni rouge) : le rouge est réservé au danger, et une couleur « chaude » pour « avancé » suggérerait un risque que le site ne qualifie pas.
- Décorative : `aria-hidden="true"`, aucun texte alternatif.
- Mode contraste élevé : les points pleins utilisent `CanvasText`, les vides un contour `CanvasText` (mots-clés système, pas de valeur en dur).

## Texte de l'avertissement (proposé, à confirmer par l'`ux-expert`)

« Tu restes juge de tes limites : pratique à ton niveau et prévois un spotter quand tu en as besoin. »

Tutoiement, tournure épicène (décisions 3 et 4 de `principes.md`). Pas d'icône ni de fond coloré : c'est un rappel, pas une alerte ; un fond `infoSurface` ou une icône le mettraient en concurrence avec les vrais messages d'état.

## Mobile (React Native)

`View` en `flexDirection: 'row'`, `flexWrap: 'wrap'` ; points en `View` de `sizes.scaleDot` avec `borderRadius` égal à la moitié ; `importantForAccessibility="no-hide-descendants"` sur l'échelle.
