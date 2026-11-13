# Carte « ma modification » (« Mes propositions »)

Une proposition de modification du contributeur, dans la liste unique de « Mes propositions » (story 6, ADR 0027), mêlée à ses propositions de pose, la plus récente d'abord. Lecture seule, aucun élément focalisable. Elle **reprend `carte-ma-proposition.md`** (conteneur, ligne « Proposée le … », zone de décision en `grid`, statut, message et motif) ; ce document ne décrit que ce qui change. Écran : `../ecrans/6-proposer-une-modification.md`, « Mes propositions ».

## Structure

```
┌──────────────────────────────────────────────┐
│ Modification de Throne                       │  h2 : préfixe regular + nom AU MOMENT de la proposition
│ Proposée le 12 novembre 2026                 │  size.sm, textMuted
│                                              │  spacing.md
│ (◷) En attente de validation                 │  statut-proposition.md
│     La pose changera dans le catalogue une   │  conséquence propre aux modifications
│     fois la modification acceptée.           │
│                                              │  spacing.md
│ Ce qui change dans la pose                   │  recapitulatif-modification.md, variante contributeur
│ Valeur d'avant → valeur proposée             │
│ ┌──────────────────────────────────────────┐ │
│ │ Difficulté flyer                         │ │
│ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶ → Découverte              │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Acceptée avec ajustements (exemple de la décision 14 : base ajustée alors qu'elle n'était pas modifiée) :

```
│ (✓) Acceptée avec ajustements le 13 novembre │
│     2026                                     │
│     La pose est modifiée dans le catalogue   │
│     avec ces ajustements.                    │
│                                              │  spacing.md
│ Ce qui change dans la pose                   │  variante contributeur, retenue
│ Valeur d'avant → valeur retenue              │
│ ┌──────────────────────────────────────────┐ │
│ │ Difficulté base                          │ │
│ │ D̶é̶b̶u̶t̶a̶n̶t̶ → Découverte                   │ │
│ │ ──────────────────────────────────────── │ │
│ │ Difficulté flyer                         │ │
│ │ A̶v̶a̶n̶c̶é̶ → Intermédiaire                  │ │
│ └──────────────────────────────────────────┘ │
│                                              │  spacing.md
│ Ajustements apportés                         │  recapitulatif-ajustements.md, variante contributeur
│ Valeur proposée → valeur retenue             │
│ ┌──────────────────────────────────────────┐ │
│ │ Difficulté base                          │ │
│ │ D̶é̶b̶u̶t̶a̶n̶t̶ → Découverte                   │ │
│ └──────────────────────────────────────────┘ │
│ Les autres valeurs sont celles que tu as     │
│ proposées.                                   │
│                                              │  spacing.md
│ Message d'ajustement                         │
│ …                                            │
```

| Élément | Tokens |
|---|---|
| Conteneur, date, zone de décision, statut, message d'ajustement, motif du refus | `carte-ma-proposition.md`, inchangés |
| `h2` | comme `carte-modification.md` : préfixe « Modification de » en `weight.regular`, nom en `weight.bold`, `size.lg`, `tight`, `overflow-wrap: anywhere` ; nom **au moment de la proposition** (« Modification de Thron » même après un renommage accepté) ; ne reçoit pas le focus |
| Récapitulatif(s) | dans la zone de décision, **après** le statut, écart `spacing.md` (`gap`) |
| `dl` de la pose | **absente** : la carte ne présente que ce qui change (la valeur d'avant est figée, la pose actuelle n'est pas connue de cette carte) ; donc pas de séparateur de bas de carte |

## Détails selon le statut

| Statut (`statut-proposition.md`) | Conséquence (texte validé par l'`ux-expert`) | Après le statut |
|---|---|---|
| En attente (neutre, horloge) | « La pose changera dans le catalogue une fois la modification acceptée. » | « Ce qui change dans la pose » (avant → proposé) |
| Acceptée (succès) | « La pose est modifiée dans le catalogue. » | « Ce qui change dans la pose » (avant → proposé) |
| Publiée directement (succès) | « La pose est modifiée dans le catalogue. » | « Ce qui change dans la pose » (avant → proposé) |
| Acceptée avec ajustements (succès) | « La pose est modifiée dans le catalogue avec ces ajustements. » | « Ce qui change dans la pose » (avant → **retenu**), puis « Ajustements apportés » (proposé → retenu), puis « Message d'ajustement » s'il existe |
| Refusée (information, jamais `danger`) | « La pose reste inchangée dans le catalogue. » | « Ce qui change dans la pose » (avant → proposé), puis « Motif du refus » |
| Statut inconnu (neutre) | aucune | rien |

Les deux blocs d'une acceptation avec ajustements ont la même liste ; leurs titres (`h3`) et leurs clés de lecture suffisent à les distinguer. Ordre retenu : d'abord ce qui compte pour le contributeur (l'effet sur la pose), puis le détail de ce que le validateur a changé à sa proposition.

## Longueurs

Comme `carte-ma-proposition.md` ; deux récapitulatifs de cinq champs à 320 px font une carte longue : rien n'est replié.

## Mobile (React Native)

Hors périmètre de la story 6.
