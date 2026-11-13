# Carte « ma proposition »

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : Même habillage que `carte-proposition.md` (rayon `lg`, pastilles de rôle). Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.

Une proposition du contributeur dans la page « Mes propositions » (story 5). Lecture seule : aucune action, aucun focus. Elle **reprend le conteneur de `carte-proposition.md`** (story 4) et **la `dl` de `carte-pose.md` sans la modifier**, ajoute le statut (`statut-proposition.md`) et, selon le cas, les détails de la décision. Écran : `../ecrans/5-mes-propositions.md`. Story 6 : une modification proposée est présentée par `carte-ma-modification.md`, qui reprend ce document.

## Structure

Ordre de lecture : quelle pose, quand, ce qu'elle est devenue, pourquoi, puis la pose elle-même.

```
┌──────────────────────────────────────────────┐
│ Throne                                       │  h2 : nom présenté
│ Proposée le 3 novembre 2026                  │  size.sm, textMuted
│                                              │  spacing.md
│ (✓) Acceptée avec ajustements le 5 novembre  │  statut-proposition.md
│     2026                                     │
│     Elle est publiée dans le catalogue avec  │
│     ces ajustements.                         │
│                                              │  spacing.md
│ Ajustements apportés                         │  recapitulatif-ajustements.md,
│ Valeur proposée → valeur retenue             │  variante contributeur
│ ┌──────────────────────────────────────────┐ │
│ │ Nom de la pose                           │ │
│ │ t̶h̶r̶o̶n̶e̶ → Throne                          │ │
│ │ ──────────────────────────────────────── │ │
│ │ Difficulté flyer                         │ │
│ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶ → Découverte               │ │
│ └──────────────────────────────────────────┘ │
│ Les autres valeurs sont celles que tu as     │
│ proposées.                                   │
│                                              │  spacing.md
│ Message d'ajustement                         │  size.sm, semibold, text
│ Throne se découvre dès la première séance    │  size.md, regular, text
│ côté flyer.                                  │
│ ──────────────────────────────────────────── │  séparateur de la pose (divider)
│ Base                        Débutant ●●○○    │  dl (carte-pose.md, inchangée)
│ Flyer                     Découverte ●○○○    │
│ ──────────────────────────────────────────── │
│ Peut commencer un flow           ✓ Oui       │
│ Peut terminer un flow            ✓ Oui       │
└──────────────────────────────────────────────┘
```

Balisage : `li` (dans l'`ul` de la page) > `article` (nommé par son `h2`, `aria-labelledby` ; décrit par sa ligne « Proposée le … », `aria-describedby`, pour distinguer deux propositions de même nom) > `h2`, `p` « Proposée le … », `div` décision (statut + détails), `dl` de la pose.

| Élément | Tokens |
|---|---|
| Conteneur | **identique à `carte-proposition.md`** : fond `surface`, contour `borderWidth` `divider` (décoratif, la carte n'est pas un contrôle), rayon `radius.md`, pas d'ombre ; padding `spacing.md` en mobile, `spacing.lg` à partir de `breakpoints.md` (même colonne et même rythme que l'écran 4) |
| Nom (`h2`) | `size.lg`, `weight.bold`, `text` (14,6:1), interligne `tight`, `overflow-wrap: anywhere` ; marge basse `spacing.xs` (la date lui est rattachée). Nom **retenu** pour une acceptée (avec ou sans ajustements), nom **proposé** sinon. Ne reçoit pas le focus |
| Date de soumission (`p`) | `size.sm`, `regular`, `textMuted` (5,8:1 sur `surface`) ; date dans un `time` ; marge basse `spacing.md`. Pas de semi-gras (contrairement à l'adresse de `carte-proposition.md` : il n'y a pas de personne à désigner) |
| Zone de décision (`div`) | `display: grid`, écart **`spacing.md`** entre statut, récapitulatif, message ou motif (un `gap` : aucune marge en trop quand le statut est seul) |
| Statut | `statut-proposition.md` |
| `dl` de la pose | `carte-pose.md` **sans changement** ; précédée d'un séparateur : marge haute `spacing.md`, padding haut `spacing.md`, bordure haute `borderWidth` `divider` (même traitement que la zone de décision de `carte-proposition.md`, ici au-dessus de la pose) |

- **Rien ne désigne le validateur** : ni adresse, ni « toi », ni « par … » dans aucune ligne.
- Pas de lien vers la pose publiée, pas d'action (décisions Q24, Q25) : la carte n'a **aucun** élément focalisable.

## Détails selon le statut

| Statut | Après le statut, dans la zone de décision |
|---|---|
| En attente, acceptée, publiée directement, statut inconnu | rien |
| Acceptée avec ajustements | récapitulatif (`recapitulatif-ajustements.md`, **variante contributeur**), puis « Message d'ajustement » s'il y en a un |
| Refusée | « Motif du refus » |

### Message d'ajustement et motif du refus

```
Motif du refus                                 <- libellé, size.sm, semibold, text
Doublon de Bird, déjà au catalogue.            <- texte, size.md, regular, text
```

| Élément | Tokens |
|---|---|
| Groupe | `div` > `p` libellé + `p` texte ; pas de `blockquote`, pas de guillemets ajoutés, pas d'italique |
| Libellé | `size.sm`, `weight.semibold`, `text` (14,6:1 sur `surface`) ; marge basse `spacing.xs` |
| Texte | `size.md`, `regular`, `text` ; `overflow-wrap: anywhere` (mot ou adresse web de 500 caractères) ; pas de `white-space: pre-line` : l'API normalise les retours à la ligne en espaces |

- Posé directement sur la `surface` de la carte, **sans encadré** : le libellé suffit à dire d'où vient le texte, et un encadré de plus concurrencerait le récapitulatif (sur `background`) et la `dl`.
- Même rendu pour le message et pour le motif : ce sont deux textes du validateur, présentés de la même façon ; seul le libellé change. Le motif n'est jamais en `danger` ni en `info` : il est en `text`, l'icône du statut porte déjà le ton.

## Longueurs

- Nom de 60 caractères sans espace : `overflow-wrap: anywhere`, comme `carte-pose.md`.
- Message ou motif de 500 caractères : ~12 lignes à 320 px ; la carte s'allonge, rien n'est tronqué ni replié (pas de « Lire la suite »).
- Récapitulatif à 320 px de fenêtre : la liste n'offre que ~222 px utiles (page 16 + carte 16 + liste 16 de chaque côté) ; une comparaison longue passe sur deux lignes (`recapitulatif-ajustements.md`, « Longueurs »).

## États

Aucun état interactif. Les incidents (chargement, session, site à mettre à jour) concernent la page, pas une carte : `../ecrans/5-mes-propositions.md`.

## Mobile (React Native)

`View` aux mêmes tokens ; `accessibilityRole="header"` sur le nom. Écran mobile hors périmètre de la story 5.
