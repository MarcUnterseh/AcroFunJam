# Cartes d'une proposition de transition (file de validation, « Mes propositions »)

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : Noms des poses du titre en Unbounded 600, mots de liaison en Figtree ; difficultés en pastilles de rôle. Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.

Story 7. Une proposition de transition dans la file de validation (`/propositions-a-valider`) et dans « Mes propositions » (`/mes-propositions`), mêlée aux propositions de pose et de modification. Ce document ne décrit que les **différences** avec `carte-proposition.md` (file) et `carte-ma-proposition.md` (« Mes propositions ») : conteneur, ligne du contributeur ou de la date, zone de décision, statut, refus, ajustement, alertes et compte rendu en sont repris tels quels. Écran : `../ecrans/7-proposer-une-transition.md`. **Aucun nouveau token.**

## Titre (`h2`), commun aux deux cartes

```
Transition Ninja Star de Star vers Star        <- avec nom
           ^^^^^^^^^^    ^^^^      ^^^^           bold ; « Transition », « de », « vers » regular
Transition de Throne vers Bird                 <- sans nom
```

| Élément | Tokens |
|---|---|
| `h2` | `size.lg`, `text`, interligne `tight`, `overflow-wrap: anywhere` ; marge basse `spacing.xs` |
| Mots de liaison (« Transition », « de », « vers ») | `weight.regular` (comme « Modification de », `carte-modification.md`) |
| Nom de la transition, noms des poses | `weight.bold` (`strong`) ; noms **actuels** des poses |

Le type de proposition se lit dans le **texte** du titre, sans badge ni couleur (règle de la story 6). Pas de flèche « → » dans ces titres : la phrase « de … vers … » est déjà explicite ; la flèche est réservée au libellé par défaut d'une transition sans nom sur la page d'une pose (`element-transition.md`).

## Contenu de la transition

À la place de la `dl` d'une pose (`carte-pose.md`), la carte présente la transition :

```
Base                          Avancé ●●●●       <- lignes Base / Flyer de carte-pose.md, inchangées
Flyer                         Avancé ●●●●
                                                   spacing.md
Description                                     <- libellé, size.sm, semibold, text
Vidéo : https://example.org/ninja-star          <- texte, size.md, regular, text, pre-line
```

| Élément | Tokens |
|---|---|
| Difficultés | lignes « Base » / « Flyer » de `carte-pose.md` (pas de séparateur ni de lignes « Peut commencer / terminer un flow ») |
| Description | même rendu que « Message d'ajustement » / « Motif du refus » de `carte-ma-proposition.md` (libellé `size.sm` `semibold`, texte `size.md` `regular` `text`, sans encadré), mais avec **`white-space: pre-line`** (la description garde ses retours à la ligne, Q105) ; marge haute `spacing.md` ; **absente** quand il n'y a pas de description (pas de « Aucune description ») |

## File de validation (carte-proposition.md)

```
┌──────────────────────────────────────────────┐
│ Transition Ninja Star de Star vers Star      │  h2
│ Proposée par alice@example.org le            │  ligne du contributeur (inchangée)
│ 14 novembre 2026                             │
│                                              │  spacing.md
│ Base                          Avancé ●●●●    │
│ Flyer                         Avancé ●●●●    │
│                                              │  spacing.md
│ Description                                  │
│ Vidéo : https://example.org/ninja-star       │
│ ──────────────────────────────────────────── │  zone de décision (inchangée)
│ [Accepter et publier] [Ajuster avant de publier] [Refuser] │
└──────────────────────────────────────────────┘
```

Zone d'ajustement : mêmes règles que `carte-proposition.md`, champs du formulaire de transition **sans les poses** (non ajustables) : « Nom de la transition (facultatif) » avec rappel « Proposé : Ninja Star » ou « Proposé : aucun nom », « Difficulté base », « Difficulté flyer » (rappels « Proposée : … »), « Description (facultative) » (zone de texte, rappel « Proposée : … » ou « Proposée : aucune description » sous le champ, compteur dès 450 / 500). Les poses restent lisibles dans le `h2`, qui ne change pas pendant l'ajustement.

## « Mes propositions » (carte-ma-proposition.md)

```
┌──────────────────────────────────────────────┐
│ Transition de Throne vers Bird               │  h2
│ Proposée le 14 novembre 2026                 │
│                                              │  spacing.md
│ (◷) En attente de validation                 │  statut-proposition.md
│     La transition apparaîtra dans le         │  conséquence (texte à confirmer par l'ux-expert)
│     catalogue une fois acceptée.             │
│ ──────────────────────────────────────────── │  séparateur de bas de carte (inchangé)
│ Base                        Débutant ●●○○    │  transition proposée, ou retenue si acceptée
│ Flyer                       Débutant ●●○○    │
└──────────────────────────────────────────────┘
```

- Acceptée avec ajustements : « Ajustements apportés » (`recapitulatif-ajustements.md`, variante contributeur) liste nom, difficultés et description ajustés ; une description ajustée longue passe sur plusieurs lignes, valeur proposée barrée puis flèche puis valeur retenue (même liste, aucun rendu nouveau). Absence de nom : « aucun nom » en toutes lettres des deux côtés de la flèche.
- Refusée : « Motif du refus » inchangé.

## Story 8 : étiquettes

- **Contenu** : ligne « Étiquettes » (`pilule-etiquette.md`) **après les difficultés**, avant la description, marge haute `spacing.sm`. Noms **actuels** (après renommage), ordre reçu.
- **File de validation** : la ligne est toujours là ; sans étiquette, « Étiquettes : aucune » (mot « aucune » en texte, pas en pilule).
- **« Mes propositions »** : la ligne n'apparaît que si la transition (proposée, ou retenue si acceptée) porte des étiquettes.
- **Zone d'ajustement** : `groupe-cases-pastilles.md` après les difficultés et avant la description, avec le rappel « Proposées : dynamique, pop » ou « Proposées : aucune » ; repli « Ce que veulent dire les étiquettes ».
- **Récapitulatif** : ligne « Étiquettes » de `recapitulatif-ajustements.md` (« aucune → dynamique, pop »).

## Longueurs

- Titre avec un nom de 60 caractères et deux noms de pose de 60 caractères : jusqu'à 6 lignes à 320 px, passe à la ligne n'importe où.
- Description de 500 caractères : ~12 lignes à 320 px, jamais repliée.

## Mobile (React Native)

Hors périmètre de la story 7.
