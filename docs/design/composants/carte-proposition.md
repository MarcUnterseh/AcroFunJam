# Carte de proposition

Une proposition en attente de validation dans la page « Propositions à valider » (story 4). Elle **reprend la carte de pose** (`carte-pose.md`) pour que le validateur voie la pose telle qu'elle apparaîtra dans le catalogue, puis ajoute le contributeur, la date et une **zone de décision**. Écran : `../ecrans/4-valider-une-proposition.md`. Son conteneur (fond, contour, rayon, paddings) est repris tel quel par la carte « ma proposition » de la story 5 (`carte-ma-proposition.md`). Story 6 : la carte de modification (`carte-modification.md`) reprend tout ce document (conteneur, contributeur, décision, refus, ajustement, alertes) et n'en décrit que les différences.

## Structure (repos)

```
┌──────────────────────────────────────────────┐
│ Hand-to-Hand (L-base)                        │  h2 (carte-pose.md)
│ Proposée par alice@example.org               │  ligne du contributeur, size.sm
│ le 3 novembre 2026                           │
│                                              │  spacing.md
│ Base                       Avancé ●●●●       │  dl (carte-pose.md, inchangée)
│ Flyer                      Avancé ●●●●       │
│ ──────────────────────────────────────────── │
│ Peut commencer un flow           – Non       │
│ Peut terminer un flow            – Non       │
│ ──────────────────────────────────────────── │  séparateur de la zone de décision
│ [Accepter et publier] [Ajuster avant de publier] [Refuser] │
└──────────────────────────────────────────────┘
```

Balisage : `li` (dans l'`ul` de la page) > `article` (nommé par son `h2`, `aria-labelledby`) > `h2`, `p` contributeur, `dl`, zone de décision (`div`).

| Élément | Tokens |
|---|---|
| Conteneur | comme `carte-pose.md` : fond `surface`, contour `borderWidth` `divider` (décoratif), rayon `radius.md`, pas d'ombre ; padding `spacing.md` en mobile, **`spacing.lg`** à partir de `breakpoints.md` (la carte porte un formulaire, elle a besoin d'air) |
| Nom (`h2`) | `carte-pose.md` (`size.lg`, `bold`, `tight`, `overflow-wrap: anywhere`), marge basse **`spacing.xs`** (la ligne du contributeur lui est rattachée) |
| Ligne du contributeur (`p`) | `size.sm`, `regular`, `textMuted` (5,8:1 sur `surface`) ; l'adresse (ou « toi ») en `weight.semibold`, `text` ; date dans un `time` ; `overflow-wrap: anywhere` (adresse longue) ; marge basse `spacing.md` |
| Caractéristiques (`dl`) | `carte-pose.md` **sans changement** (termes, valeurs à droite, échelle à points, Oui / Non avec coche / tiret) |
| Zone de décision | marge haute `spacing.md`, padding haut `spacing.md`, bordure haute `borderWidth` `divider` (décorative, comme le séparateur interne de la carte) |

Texte de la ligne : « Proposée par alice@example.org le 3 novembre 2026 » ; « Proposée par toi le 3 novembre 2026 » pour sa propre proposition. La ligne est placée **sous le nom** (métadonnée rattachée au titre, comme une signature) ; la `dl` reste identique à celle du catalogue, sans terme « Contributeur » qui ne s'y trouvera jamais.

## Rangée d'actions

| Bouton | Variante (`bouton.md`) |
|---|---|
| Accepter et publier | **secondaire** |
| Ajuster avant de publier | **secondaire** |
| Refuser | **secondaire** |

- **Poids égal** : les trois boutons ont la même variante, la même hauteur (`sizes.control`, 48) et aucune icône. Ni primaire pour « Accepter » (ce serait pousser à publier), ni `danger` pour « Refuser » (un refus n'est pas une erreur ; le danger est réservé aux erreurs, `principes.md`).
- Ordre : accepter, ajuster, refuser (de « tel quel » à « non »).
- Mobile (< `breakpoints.md`) : empilés, pleine largeur, écart **`spacing.md`**.
- À partir de `breakpoints.md` : en ligne, largeur du contenu, écart `spacing.md` dans les deux sens, `flex-wrap: wrap` (passent à la ligne au zoom plutôt que déborder). Les trois tiennent sur une ligne dans 640 px (~180 + 220 + 90 px + écarts).

## Zone de refus (dépliée dans la carte)

« Refuser » remplace la rangée d'actions par un petit formulaire, dans la même zone de décision. Pas de modale.

```
│ ──────────────────────────────────────────── │
│ Motif du refus                               │  libellé (champ.md)
│ ┌──────────────────────────────────────────┐ │
│ │ Doublon de Bird, déjà au catalogue.      │ │  zone de texte, 4 lignes
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│ Le contributeur verra ce motif.              │  aide (texte : ux-expert)
│ 500 caractères au maximum.                   │
│                         462 / 500 caractères │  compteur, à partir de 450
│ (!) Saisis le motif du refus.                │  erreur, à l'envoi
│                                              │  spacing.md
│ [Confirmer le refus] [Annuler]               │
```

| Élément | Tokens |
|---|---|
| Champ « Motif du refus » | `champ.md`, variante **zone de texte** ; compteur à partir de **450** / 500 |
| Confirmer le refus | bouton **primaire** (seule action principale de ce petit formulaire ; le choix de refuser est déjà fait) ; en cours : « Refus en cours… » |
| Annuler | bouton secondaire |
| Rangée | comme la rangée d'actions (empilée en mobile, en ligne ensuite, écart `spacing.md`), marge haute **`spacing.lg`** (même écart que celui des groupes avant les boutons du formulaire d'ajustement) |

- « Accepter et publier » et « Ajuster avant de publier » **ne sont pas affichés** pendant la saisie du motif (`display: none`, pas grisés).
- La carte s'agrandit vers le bas ; ce qui précède ne bouge pas.

## Zone d'ajustement (dépliée dans la carte)

« Ajuster avant de publier » remplace la `dl` **et** la rangée d'actions par un formulaire prérempli ; le `h2` et la ligne du contributeur restent.

```
│ Thron                                        │  h2 (nom proposé, inchangé)
│ Proposée par alice@example.org le 3 nov…     │
│ ──────────────────────────────────────────── │
│ Ajuster avant de publier                     │  h3, size.md, bold
│ Les valeurs proposées sont préremplies.      │  intro, size.sm, textMuted
│                                              │  spacing.lg
│ Nom de la pose                               │  champ.md
│ [Throne                                    ] │
│ Proposé : Thron                              │  aide, size.sm, textMuted
│                                              │  spacing.lg
│ Difficulté base                              │  groupe-tuiles-radio.md
│ Proposée : Débutant                          │  aide du groupe
│ [○ Découverte][◉ Débutant][○ Intermédiaire][○ Avancé] │
│                                              │  spacing.lg
│ Difficulté flyer                             │
│ Proposée : Intermédiaire                     │
│ [◉ Découverte][○ Débutant][○ Intermédiaire][○ Avancé] │
│                                              │  spacing.lg
│ Commencer : … Terminer : …                   │  aide commune (story 3)
│ Peut-on commencer un flow sur cette pose ?   │
│ Proposé : Oui                                │
│ [◉ Oui      ][○ Non      ]                   │
│ Peut-on terminer un flow sur cette pose ?    │
│ Proposé : Oui                                │
│ [○ Oui      ][◉ Non      ]                   │
│                                              │  spacing.lg
│ [Vérifier les ajustements] [Annuler]         │  primaire + secondaire
```

| Élément | Tokens |
|---|---|
| Titre de zone (`h3`) | `size.md`, `weight.bold`, `text`, interligne `tight` ; marge basse `spacing.xs` |
| Introduction | `size.sm`, `textMuted` ; marge basse `spacing.lg` |
| Champs et groupes | **identiques au formulaire « Proposer une pose »** : `champ.md` (nom, compteur dès 50 / 60), `groupe-tuiles-radio.md` (niveaux et Oui / Non, bloc d'indicateurs avec aide commune) ; espacements de `../ecrans/3-proposer-une-pose.md` (`spacing.lg` entre groupes) |
| Rappel « Proposé : … » | aide de chaque champ ou groupe : `size.sm`, `textMuted` ; sous le champ pour le nom, **entre la `legend` et les tuiles** pour les groupes (avant l'éventuelle erreur), marge basse `spacing.sm` ; relié par `aria-describedby` |
| Vérifier les ajustements | bouton **primaire** (mène au récapitulatif) |
| Annuler | bouton secondaire ; rend la carte à l'état de repos, valeurs proposées |

- Le rappel « Proposé : … » reste affiché après modification : il permet de comparer sans dépendre de la couleur, et de revenir à la valeur d'origine.
- Les tuiles s'affichent **4 sur une ligne** en grand écran parce que la carte offre `sizes.formWideMaxWidth` de contenu (voir l'écran) ; 2 × 2 entre 360 et ~690 px de carte ; 1 colonne en dessous.
- Le message facultatif n'est **pas** dans ce formulaire : il apparaît au récapitulatif, seulement quand il y a des ajustements.

## Récapitulatif et envoi

« Vérifier les ajustements » remplace le formulaire par le récapitulatif (`recapitulatif-ajustements.md`), toujours dans la carte, suivi du message facultatif et des actions finales :

```
│ Vérifie tes ajustements                      │  h3
│ [récapitulatif proposé → retenu]             │
│                                              │  spacing.lg
│ Message pour le contributeur (facultatif)    │  champ.md, zone de texte
│ [                                          ] │
│ Il le verra avec tes ajustements. 500 car.…  │  aide (texte : ux-expert)
│                                              │  spacing.lg
│ [Publier avec ces ajustements]               │  primaire ; en cours : « Publication… »
│ [Modifier les ajustements]                   │  secondaire : retour au formulaire, saisie conservée
│ [Annuler]                                    │  secondaire : retour au repos
```

Rangée des trois boutons : empilée, pleine largeur, écart `spacing.md` en mobile ; en ligne à partir de `breakpoints.md`.

Si aucune valeur n'a changé, le récapitulatif n'est pas affiché : voir `recapitulatif-ajustements.md`, « Aucun ajustement ».

## Alertes dans la carte

Les refus globaux et incidents d'une décision s'affichent **dans la carte concernée**, avec `alerte-formulaire.md`, en tête de la zone de décision ouverte (ou au-dessus de la rangée d'actions) ; dans la **zone d'ajustement**, sous son titre et son introduction (le titre annonce la zone, l'alerte en parle). Écart **`spacing.md`** avec ce qui suit (au lieu de `spacing.lg` en page : la carte est plus serrée), donné par l'écart de la zone de décision (`gap`) : aucune marge en trop quand l'alerte est le dernier élément de la carte (carte fermée).

Quand la carte se ferme (déjà traitée, plus en attente, rôle retiré), le focus va sur son nom (`h2`, `tabindex="-1"`), puis l'alerte (`role="alert"`) est annoncée.

Sous `breakpoints.md`, les libellés des boutons de la carte passent à la ligne (`white-space: normal`) plutôt que de déborder (« Accepter et publier » dans l'alerte « rien modifié », « Ajuster avant de publier », « Modifier les ajustements »).

| Cas | Variante | Action | Ce qui reste affiché |
|---|---|---|---|
| AcroFunJam injoignable | erreur | « Réessayer » (secondaire) | la zone ouverte et sa saisie (motif, ajustements, message) |
| Session expirée | information | lien « Se connecter » | la zone ouverte et sa saisie |
| Nom déjà pris (catalogue, autre proposition en attente), acceptation telle quelle | erreur | aucune (le bouton « Ajuster avant de publier » reste disponible) | la rangée d'actions |
| Nom déjà pris, acceptation avec ajustements | **erreur du champ nom** (`champ.md`) | — | le formulaire d'ajustement, rouvert, focus sur le nom |
| Déjà traitée | information | aucune | la carte (nom, contributeur, `dl`) ; **les actions disparaissent** |
| Rôle retiré | information | lien « Revenir au catalogue » (`text` souligné, `semibold`) | la carte ; les actions disparaissent |

Sur une surface d'alerte posée dans une carte `surface`, les contrastes de `alerte-formulaire.md` sont inchangés (le texte est sur `dangerSurface` / `infoSurface`, pas sur `surface`).

## Pendant l'envoi

Bouton déclencheur à l'état « en cours » (`bouton.md`) : « Publication… », « Refus en cours… ». Les autres boutons de la carte restent visibles, couleurs inchangées, mais `aria-disabled` ; les champs gardent leur état. Les autres cartes restent utilisables.

## Après la décision

La carte est remplacée **sur place**, dans le même `li`, par le compte rendu (`compte-rendu-decision.md`).

## Mobile (React Native)

`View` aux mêmes tokens ; zones de décision dépliées dans la carte (pas de `Modal`) ; boutons en colonne ; `accessibilityRole="header"` sur le nom.
