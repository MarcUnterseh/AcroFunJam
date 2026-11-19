# Carte de modification (file de validation)

Une **proposition de modification** en attente, dans la page « Propositions à valider », mêlée aux propositions de pose (même file, même ordre, même nombre : ADR 0027). Elle **reprend la carte de proposition** (`carte-proposition.md`) : conteneur, ligne du contributeur, zone de décision, zones de refus et d'ajustement, alertes, état en cours, compte rendu. Ce document ne décrit que ce qui change. Écran : `../ecrans/6-proposer-une-modification.md`, « File de validation ».

**Story 9a** : « Ce qui change dans la pose » peut contenir la ligne « Étiquettes ~~aucune~~ → lunaire » (mots dans une phrase, `recapitulatif-modification.md`), et « La pose après modification » la ligne « Étiquettes » de la `dl` (pilules, ou « aucune »). L'ajustement permet d'ajouter des étiquettes à une modification qui ne les changeait pas. Écran : `../ecrans/9a-etiquettes-des-poses.md`.

## Structure (repos)

```
┌──────────────────────────────────────────────┐
│ Modification de Throne                       │  h2 : préfixe regular + nom bold
│ Proposée par alice@example.org               │  ligne du contributeur (inchangée)
│ le 12 novembre 2026                          │
│                                              │  spacing.md
│ Ce qui change dans la pose                   │  h3 (recapitulatif-modification.md, variante file)
│ Valeur actuelle → valeur proposée            │
│ ┌──────────────────────────────────────────┐ │
│ │ Difficulté flyer                         │ │
│ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶ → Découverte              │ │
│ └──────────────────────────────────────────┘ │
│                                              │  spacing.md
│ Message de modification                      │  libellé, size.sm, semibold
│ Throne se découvre dès la première séance    │  texte, size.md, text
│ côté flyer.                                  │
│ ──────────────────────────────────────────── │  séparateur (divider)
│ La pose après modification                   │  h3
│ Base                       Débutant ●●○○     │  dl (carte-pose.md, inchangée)
│ Flyer                    Découverte ●○○○     │
│ ──────────────────────────────────────────── │
│ Peut commencer un flow           – Non       │
│ Peut terminer un flow            ✓ Oui       │
│ ──────────────────────────────────────────── │  zone de décision
│ [Accepter la modification] [Ajuster avant d'accepter] [Refuser] │
└──────────────────────────────────────────────┘
```

Balisage : `li` > `article` (`aria-labelledby` sur le `h2`) > `h2`, `p` contributeur, `div` modification (récapitulatif + message), `section` ou `div` « La pose après modification » (`h3` + `dl`), zone de décision.

| Élément | Tokens |
|---|---|
| Conteneur, ligne du contributeur, zone de décision | `carte-proposition.md`, inchangés |
| `h2` | mêmes tokens que le nom de `carte-proposition.md` (`size.lg`, `tight`, `text`, `overflow-wrap: anywhere`, marge basse `spacing.xs`) ; le **préfixe « Modification de »** en `weight.regular`, le **nom** en `weight.bold`. Texte continu, sans guillemets ni deux-points : lu « Modification de Throne » |
| Bloc modification (`div`) | `display: grid`, écart `spacing.md` entre le récapitulatif et le message (un `gap` : rien en trop sans message) |
| Récapitulatif | `recapitulatif-modification.md`, **variante file**, titre `h3` ; seuls les champs modifiés |
| Message de modification | même rendu que le message d'ajustement de `carte-ma-proposition.md` : libellé `size.sm`, `semibold`, `text` + texte `size.md`, `regular`, `text`, `overflow-wrap: anywhere`, écart `spacing.xs` ; **sans encadré** ; absent s'il n'y a pas de message |
| Séparateur avant la pose | marge haute `spacing.md`, padding haut `spacing.md`, bordure haute `borderWidth` `divider` (celui de `carte-ma-proposition.md`) |
| `h3` « La pose après modification » | `size.md`, `weight.bold`, `text`, `tight` ; marge basse `spacing.sm` |
| `dl` | `carte-pose.md` **sans changement** : la pose telle qu'elle sera dans le catalogue si la modification est acceptée |

### Distinguer une modification d'une proposition de pose

Dans une file mêlée, la différence est portée par **le texte du titre** (« Modification de … » contre le nom seul) et par **la structure** (récapitulatif, puis `h3` « La pose après modification »). Le préfixe en graisse normale donne un repère visuel au survol de la liste sans couleur, badge ni icône. Les deux types gardent le même conteneur : une modification n'est ni plus ni moins urgente.

## Rangée d'actions

| Bouton | Variante |
|---|---|
| Accepter la modification | secondaire |
| Ajuster avant d'accepter | secondaire |
| Refuser | secondaire |

Poids égal, ordre, empilement en mobile et `flex-wrap` : `carte-proposition.md`. Les trois tiennent sur une ligne dans 640 px de contenu (~215 + 210 + 90 px + deux écarts de 16).

## Zone d'ajustement

Celle de `carte-proposition.md` (h3 « Ajuster avant d'accepter », formulaire prérempli avec la **pose après modification**, tuiles 4 sur une ligne dans 640 px), avec deux différences :

1. **Le récapitulatif et le message restent affichés** au-dessus du formulaire ; seule la section « La pose après modification » et la rangée d'actions sont remplacées (le validateur doit pouvoir relire ce qu'on lui propose pendant qu'il ajuste).
2. **Rappels sous chaque champ ou `legend`** (aide, `size.sm`, `textMuted`, `aria-describedby`), en une ou deux lignes :
   - champ modifié : « Actuellement : Intermédiaire » puis « Proposée : Découverte » (deux `p`, écart nul) : « Proposée » pour une difficulté, « Proposé » pour le nom et les indicateurs de flow ;
   - champ non modifié : « Actuellement : Débutant » seul.
   Textes validés par l'`ux-expert`. La marque « Modifiée » (`marque-modifiee.md`) n'est **pas** utilisée ici : le validateur compare à la proposition, pas seulement à la pose.

Étape suivante : récapitulatif des **ajustements** (`recapitulatif-ajustements.md`, proposé → retenu, variante validateur, mention « Les autres valeurs restent celles proposées. »), message pour le contributeur, puis « Accepter avec ces ajustements » (primaire), « Modifier les ajustements », « Annuler » (secondaires). Les champs que la modification ne changeait pas et que le validateur ajuste y figurent comme les autres (leur valeur « proposée » est la valeur actuelle).

## Alertes et comptes rendus

Alertes dans la carte : tableau de `carte-proposition.md`, plus :

| Cas | Variante | Action | Reste affiché |
|---|---|---|---|
| Modification retenue identique à la pose | **erreur** (la décision ne peut pas partir, il faut changer la saisie ou refuser) | aucune | le formulaire d'ajustement, rouvert |
| Nom pris entre-temps (acceptation telle quelle) | erreur | aucune (« Ajuster avant d'accepter » reste disponible) | la rangée d'actions |

Compte rendu (`compte-rendu-decision.md`, sans changement de rendu ; textes validés par l'`ux-expert`) :

| Décision | Variante | Titre |
|---|---|---|
| Acceptée | succès | « La pose « Throne » est modifiée dans le catalogue. » (scénario) |
| Acceptée avec ajustements | succès | « La pose « Throne » est modifiée dans le catalogue avec tes ajustements. » |
| Refusée | information | « La modification de « Throne » est refusée. » |

Pour un renommage accepté, le titre utilise le **nouveau** nom (celui qui est au catalogue).

## Longueurs

Nom de 60 caractères : le `h2` passe sur plusieurs lignes, préfixe compris (`overflow-wrap: anywhere`). Message de 500 caractères : ~12 lignes à 320 px, rien n'est tronqué. Cinq champs modifiés : la liste s'allonge, sans repli.

## Mobile (React Native)

Hors périmètre de la story 6.

## Textes retenus (ux-expert, 2026-11-12)

- Rien d'ajusté (alerte **information**) : « Tu n'as rien modifié. Tu peux accepter la modification telle quelle. » + bouton « Accepter la modification ».
- Modification retenue identique à la pose (alerte **erreur**) : « Avec ces ajustements, la pose ne changerait pas. Modifie tes ajustements, ou refuse la modification. » Le site le signale dès « Vérifier les ajustements » (pas de récapitulatif) et retire l'alerte dès qu'un champ change ; l'API le refuse aussi (422).
- Zone d'ajustement : titre « Ajuster avant d'accepter » ; récapitulatif « Vérifie tes ajustements » ; « Accepter avec ces ajustements », « Modifier les ajustements », « Annuler ».
- Pose changée depuis la proposition (filet de sécurité de l'API, 409) : « Cette pose a changé depuis que la modification a été proposée. Recharge la page pour voir ses valeurs actuelles. » + bouton « Recharger la page ».
