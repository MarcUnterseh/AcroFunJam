# Récapitulatif d'une modification (« avant → après »)

Story 6 « Proposer une modification d'une pose publiée ». Présente les **seuls champs modifiés** d'une pose, chacun avec sa valeur de départ et sa valeur d'arrivée. Utilisé à quatre endroits :

| Où | Variante | Gauche → droite |
|---|---|---|
| Formulaire de modification, validateur ou administrateur, avant de publier (`../ecrans/6-proposer-une-modification.md`) | **publication directe** | valeur actuelle → nouvelle valeur |
| File de validation, carte de modification (`carte-modification.md`) | **file** | valeur actuelle → valeur proposée |
| « Mes propositions », modification en attente, acceptée sans ajustement ou refusée (`carte-ma-modification.md`) | **contributeur** | valeur d'avant → valeur proposée |
| « Mes propositions », modification acceptée avec ajustements | **contributeur, retenue** | valeur d'avant → valeur retenue |

**Aucun nouveau rendu** : la liste est **exactement celle de `recapitulatif-ajustements.md`** (fond `background`, contour `divider`, terme `dt` au-dessus, valeur de gauche barrée et atténuée, flèche SVG, valeur de droite semi-grasse, séparateurs entre champs, retour à la ligne à 320 px). Seuls changent le titre, la clé de lecture, les deux textes masqués et la mention finale. Dans le code, la liste partagée (`AdjustmentList`) devient une liste de comparaison générique paramétrée par ces deux textes masqués (nom proposé : `ValueChangeList`), utilisée aussi par le récapitulatif des ajustements.

Pourquoi le même rendu : dans tous les cas, la valeur de gauche est **remplacée** par celle de droite. Le barré dit « ce qui s'en va », la graisse « ce qui reste ». Un seul code visuel pour « avant → après » dans tout le site, qu'il s'agisse d'un ajustement ou d'une modification.

## Structure

```
Ce qui change dans la pose                            <- h2 ou h3 selon la page, size.md, bold
Valeur actuelle → valeur proposée                     <- clé de lecture, size.sm, textMuted, aria-hidden
┌──────────────────────────────────────────────┐
│ Difficulté flyer                             │  <- dt, size.sm, semibold, text
│ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶  →  Découverte               │  <- gauche barrée textMuted → droite semibold text
│ ──────────────────────────────────────────── │
│ Peut terminer un flow                        │
│ O̶u̶i̶  →  Non                                  │
└──────────────────────────────────────────────┘
Les autres valeurs ne changent pas.                   <- mention finale, size.sm, textMuted (facultative)
```

Ordre des champs : celui du formulaire (nom, difficulté base, difficulté flyer, peut commencer un flow, peut terminer un flow). Termes : « Nom de la pose », « Difficulté base », « Difficulté flyer », « Peut commencer un flow », « Peut terminer un flow » (mêmes termes que le récapitulatif des ajustements). Valeurs Oui / Non en mots, sans coche ni tiret ; niveaux en mots, sans échelle à points.

Balisage du `dd` (exemple, variante file) :

```
<span class="adjustment__proposed"><span class="visually-hidden">Actuellement : </span>Intermédiaire</span>
<span class="adjustment__change"><svg aria-hidden="true">→</svg>
  <span class="adjustment__retained"><span class="visually-hidden">, proposé : </span>Découverte</span></span>
```

Lu : « Difficulté flyer : Actuellement : Intermédiaire, proposé : Découverte ». Pas de `del` / `ins`, pas de « → » typographique (mêmes raisons que `recapitulatif-ajustements.md`).

## Variantes (textes validés par l'`ux-expert`, 2026-11-12)

| Variante | Titre | Clé de lecture | Textes masqués | Mention finale |
|---|---|---|---|---|
| Publication directe (formulaire) | « Vérifie ta modification » (`h2` de la page) | « Valeur actuelle → nouvelle valeur » | « Actuellement : » / « , nouveau : » | « Les autres valeurs restent inchangées. » |
| File | « Ce qui change dans la pose » (`h3`) | « Valeur actuelle → valeur proposée » | « Actuellement : » / « , proposé : » | aucune (la `dl` « La pose après modification » suit) |
| Contributeur | « Ce qui change dans la pose » (`h3`) | « Valeur d'avant → valeur proposée » | « Avant : » / « , proposé : » | aucune |
| Contributeur, retenue | « Ce qui change dans la pose » (`h3`) | « Valeur d'avant → valeur retenue » | « Avant : » / « , retenu : » | aucune |

Le bloc « Ajustements apportés » qui suit la variante « contributeur, retenue » est la **variante contributeur de `recapitulatif-ajustements.md`**, inchangée (proposé → retenu). Les deux blocs ont la même liste ; ils se distinguent par leur **titre** et leur **clé de lecture**, jamais par la couleur.

| Élément | Tokens |
|---|---|
| Titre | `size.md`, `weight.bold`, `text`, interligne `tight` ; marge basse `spacing.xs`. Focus programmatique (`tabindex="-1"`, anneau `focus`, rayon `radius.sm`) **seulement** en variante publication directe, quand le récapitulatif remplace le formulaire ; jamais dans les cartes |
| Clé, liste, termes, valeurs, flèche, séparateurs | `recapitulatif-ajustements.md`, sans changement |
| Mention finale | `size.sm`, `textMuted` ; marge haute `spacing.sm` |

## Contrastes

Sur la `surface` d'une carte (file, « Mes propositions », carte du formulaire en grand écran) ou sur `background` (formulaire en mobile) : titre `text` 14,6:1 / 15,4:1 ; clé et mention `textMuted` 5,8:1 / 6,1:1. Dans la liste (toujours sur `background`) : valeur de gauche `textMuted` 6,1:1, valeur de droite `text` 15,4:1, flèche `textMuted` 6,1:1. En mobile, la liste sur `background` posée sur une page `background` reste délimitée par son contour `divider` (décoratif) et son padding : c'est suffisant, la liste n'est pas un contrôle.

## Sans la couleur

Ordre (gauche → droite), flèche, barré, graisse, et le texte masqué pour les lecteurs d'écran. Ni rouge pour l'ancienne valeur, ni vert pour la nouvelle. `forced-colors: active` : barré et graisse restent, flèche en `currentColor`.

## Longueurs

Comme `recapitulatif-ajustements.md` : flèche et valeur de droite groupées (`inline-flex`, écart `spacing.sm`) ; à 320 px (ou zoom 400 %), « Intermédiaire → Découverte » et tout renommage passent sur deux lignes, la flèche en tête de la seconde ; nom de 60 caractères sans espace : `overflow-wrap: anywhere`.

## Mobile (React Native)

Hors périmètre (story web seulement). Le jour venu : même `View` que le récapitulatif des ajustements, `accessibilityLabel` du `dd` construit avec les textes masqués de la variante.
