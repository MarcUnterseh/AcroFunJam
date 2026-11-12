# Statut d'une proposition

Dit au contributeur ce qu'est devenue une de ses propositions (story 5 « Suivre mes propositions »). Placé dans la carte « ma proposition » (`carte-ma-proposition.md`), juste sous la ligne « Proposée le … », **avant** les détails de la décision et la `dl` de la pose. Écran : `../ecrans/5-mes-propositions.md`.

Ce n'est **ni une alerte ni un compte rendu** : il décrit un état durable, pas un événement qui vient d'arriver. D'où une présentation **sans surface colorée ni barre d'accent** (contrairement à `compte-rendu-decision.md` et `alerte-formulaire.md`) : une icône colorée, un mot en semi-gras, une phrase de conséquence.

## Structure

```
(✓) Acceptée avec ajustements le 5 novembre 2026      <- icône 20 px + statut, size.md, semibold, text
    Elle est publiée dans le catalogue avec ces         <- conséquence, size.md, regular, textMuted
    ajustements.
```

Balisage : `div` (`display: flex`) > icône (`aria-hidden`) + `div` contenu > `p` statut + `p` conséquence facultative. Le statut commence par un texte masqué : `<span class="visually-hidden">Statut : </span>Acceptée le 5 novembre 2026` (date dans un `time`). Lu : « Statut : Acceptée le 5 novembre 2026. Elle est publiée dans le catalogue. »

| Élément | Tokens |
|---|---|
| Conteneur | `display: flex`, `align-items: flex-start`, écart icône–contenu `spacing.sm` ; **pas** de fond, de contour, de barre ni de padding (il est posé sur la `surface` de la carte) |
| Icône | `sizes.icon` (20), `flex-shrink: 0`, couleur selon la variante, `aria-hidden` |
| Statut (`p`) | `size.md`, `weight.semibold`, `text` (14,6:1 sur `surface`), interligne **`tight`** (une ligne fait 20 px, la hauteur de l'icône : l'icône est alignée sur la première ligne sans décalage, comme le titre de `compte-rendu-decision.md`) ; `overflow-wrap: anywhere` ; marge nulle |
| Conséquence (`p`) | `size.md`, `regular`, `textMuted` (5,8:1 sur `surface`), interligne `normal` ; marge haute `spacing.xs` |

## Variantes

| Variante (ton) | Statuts | Icône | Couleur de l'icône (sur `surface`) | Statut | Conséquence |
|---|---|---|---|---|---|
| **Neutre** | en attente | **horloge** (nouvelle, ci-dessous) | `textMuted` 5,8:1 | « En attente de validation » | « Elle apparaîtra dans le catalogue une fois acceptée. » |
| **Succès** | acceptée | succès (cercle + coche) | `success` 5,8:1 | « Acceptée le 5 novembre 2026 » | « Elle est publiée dans le catalogue. » |
| **Succès** | acceptée avec ajustements | succès | `success` | « Acceptée avec ajustements le 5 novembre 2026 » | « Elle est publiée dans le catalogue avec ces ajustements. » |
| **Succès** | publiée directement | succès | `success` | « Publiée directement » | « Elle est publiée dans le catalogue. » |
| **Information** | refusée | information (cercle + « i ») | `info` 5,8:1 | « Refusée le 5 novembre 2026 » | « Elle n'est pas publiée dans le catalogue. » (le motif suit, `carte-ma-proposition.md`) |
| **Neutre** | statut inconnu | information | `textMuted` | « Statut indisponible. Recharge la page. » (sans texte masqué « Statut : ») | aucune |

- **Refusée n'est jamais en `danger`** (ni icône d'erreur, ni texte rouge) : un refus n'est pas une faute de la personne (`principes.md`, story 4). Ton information, comme le compte rendu d'un refus côté validateur.
- **En attente** est neutre (`textMuted`), ni orange ni bleu : rien à faire, rien d'anormal. L'horloge dit « le temps passe », sans urgence.
- **Statut inconnu** : icône information en `textMuted` (et non `info`) pour ne pas ressembler à un refus ; le texte suffit. Pas de `danger` : la proposition n'a pas de problème, c'est le site qui est en retard.
- Les trois statuts publiés partagent l'icône succès : ce qui compte pour le contributeur, c'est « elle est au catalogue » ; la différence est dans le mot.
- Le statut et la conséquence restent en `text` / `textMuted`, jamais dans la couleur de la variante : lisibilité maximale, et la couleur n'est qu'un renfort de l'icône.

### Sans la couleur

Chaque variante se distingue par la **forme de l'icône** (horloge, coche dans un cercle, « i ») **et** par le mot du statut. En `forced-colors: active`, les icônes suivent `CanvasText` (`currentColor`) : seules les formes et les mots restent, ce qui suffit.

## Icône « horloge » (nouvelle, story 5)

Même famille que les icônes **erreur** et **information** (cercle de 20 px, trait 2 px), pour qu'elles se répondent d'une carte à l'autre.

```
viewBox 0 0 20 20, fill none, stroke currentColor, stroke-width 2,
stroke-linecap round, stroke-linejoin round

<circle cx="10" cy="10" r="8.5" />                    cadran, identique à « erreur » et « information »
<polyline points="10,5.5 10,10 13.5,12" />            aiguilles : minutes vers 12 h, heures vers 4 h
```

- Les deux aiguilles forment un seul tracé (`polyline`), jointure arrondie au centre ; longueurs 4,5 et ~4 unités, comme la barre du « i » (5,5) : pas de point central, pas de graduations (illisibles à 20 px).
- Taille unique `sizes.icon` (20) ; pas de variante `iconLarge` dans cette story.
- `aria-hidden="true"`, `focusable="false"`, comme toutes les icônes (`principes.md`, « Icônes ») ; nom proposé dans le code : `clock`.
- Aucune animation (pas d'aiguille qui tourne).

Remarque : l'icône **succès** est dessinée en trait 1,5 (pensée pour 32 px, `panneau-succes.md`) ; à 20 px elle paraît un peu plus fine que l'horloge et le « i » voisins. Acceptable (déjà le cas dans `compte-rendu-decision.md`) ; à harmoniser si l'on dessine un jour une variante 20 px de l'icône succès.

## Longueurs et responsive

- Statut le plus long : « Acceptée avec ajustements le 15 novembre 2026 » (~370 px en semi-gras). À 320 px de fenêtre, la colonne de texte fait ~228 px (page 16 + carte 16 de chaque côté, icône 20, écart 8) : le statut passe sur deux lignes, alignées sur le texte et non sous l'icône (le contenu est un bloc à part, à droite de l'icône). Dès ~460 px, une ligne.
- Aucun changement de disposition selon les points de rupture.

## États

Aucun état interactif : le bloc n'est ni un lien ni un bouton, et ne reçoit pas le focus.

## Mobile (React Native)

`View` en ligne (`flexDirection: 'row'`), mêmes tokens ; `accessibilityLabel` du statut « Statut : Acceptée le 5 novembre 2026 » (sauf statut inconnu) ; icône `importantForAccessibility="no"`. Écran mobile hors périmètre de la story 5.
