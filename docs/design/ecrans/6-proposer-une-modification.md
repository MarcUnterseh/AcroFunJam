# Écrans de la story 6 « Proposer une modification d'une pose publiée »

Composants : `../composants/` (nouveaux : `recapitulatif-modification.md`, `etiquette-modifiee.md`, `carte-modification.md`, `carte-ma-modification.md` ; mis à jour : `carte-pose.md` (lien « Proposer une modification »), `recapitulatif-ajustements.md` (liste partagée), `statut-proposition.md` (conséquences d'une modification), `panneau-succes.md` (variante modification)). Principes et tokens : `../principes.md`. Scénarios : `specs/features/contribution/proposer-une-modification.feature` (`@web`). Décisions et libellés : `docs/domain/decouverte.md`, story 6 (validée le 2026-11-12) ; recommandations de l'`ux-expert` du même jour. Libellés validés par l'`ux-expert` le 2026-11-12 et livrés sur le site le 2026-11-13 (`front/packages/core/src/presentation/contribution/revision-labels.ts`, `validation-labels.ts`, `my-proposals-labels.ts`).

Gabarit commun (en-tête, bandeau, `main`, annonce de statut) : `2b-se-connecter-sur-le-site.md`. **Aucun nouveau token.**

## Catalogue (`/`) : lien « Proposer une modification »

Détail : `../composants/carte-pose.md`, « Lien « Proposer une modification » (story 6) ». En résumé : lien **textuel** souligné, `primary`, en bas de chaque carte, après la `dl` et un séparateur `divider` ; personne connectée seulement (absent du DOM sinon) ; nom accessible « Proposer une modification de Throne » par texte masqué ; zone cliquable 44 px de haut ; alignés en bas des cartes d'une même rangée.

```
Mobile, connectée :                      Grand écran (≥ 1024 px), 3 colonnes :
┌────────────────────────────┐           ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ Bird                       │           │ Bird                 │ │ Folded Leaf          │ │ Hand-to-Hand (L-base)│
│ Base       Découverte ●○○○ │           │ Base  Découverte ●○○○│ │ Base    Débutant ●●○○│ │ Base Intermédiaire ●●●○│
│ Flyer      Découverte ●○○○ │           │ Flyer Découverte ●○○○│ │ Flyer Découverte ●○○○│ │ Flyer      Avancé ●●●●│
│ ────────────────────────── │           │ ──────────────────── │ │ ──────────────────── │ │ ──────────────────── │
│ Peut commencer un flow ✓Oui│           │ Peut commencer… ✓ Oui│ │ Peut commencer… – Non│ │ Peut commencer… ✓ Oui│
│ Peut terminer un flow  ✓Oui│           │ Peut terminer…  ✓ Oui│ │ Peut terminer…  ✓ Oui│ │ Peut terminer…  – Non│
│ ────────────────────────── │           │ ──────────────────── │ │ ──────────────────── │ │ ──────────────────── │
│ Proposer une modification  │           │ Proposer une modific…│ │ Proposer une modific…│ │ Proposer une modific…│
│ ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾  │           └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
└────────────────────────────┘
```

(Libellé tronqué sur la maquette seulement : il est toujours écrit en entier et passe à la ligne si besoin.)

## Formulaire « Proposer une modification » (`/poses/:id/proposer-une-modification`)

Même gabarit que « Proposer une pose » (`3-proposer-une-pose.md`) : colonne `sizes.formWideMaxWidth` (640), dans une carte en grand écran (fond `surface`, contour `divider`, rayon `radius.lg`, padding `spacing.xl`, marge haute `spacing.xl`), pleine largeur en mobile. Mêmes champs, mêmes tuiles, mêmes espacements verticaux (`spacing.lg` entre groupes), mêmes erreurs de saisie, même compteur du nom.

### Ordre du contenu

1. `h1` « Proposer une modification » ;
2. ligne de la pose : « Pose : **Throne** » ; titre du document « Proposer une modification de Throne » ;
3. encadré « publication directe » (validateur, administrateur seulement) ;
4. introduction : « Change seulement ce qui doit l'être. La valeur actuelle est rappelée pour chaque champ. » ;
5. alerte globale éventuelle ;
6. champs préremplis avec les valeurs actuelles : nom, difficulté base, difficulté flyer, bloc des indicateurs de flow ;
7. « Message pour le validateur (facultatif) », aide « Explique-lui pourquoi tu proposes cette modification. 500 caractères au maximum. » ; **masqué pour un validateur ou un administrateur** (publication directe : il n'y a pas de validateur à qui écrire) ;
8. actions : bouton primaire + lien « Annuler ».

### Mobile (< 640 px)

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│ alice@exa… [Se déconnecter]    │
├────────────────────────────────┤
│ Proposer une modification      │  h1
│                                │  spacing.xs
│ Pose : Throne                  │  size.md, textMuted ; nom semibold, text
│                                │  spacing.sm
│ Change seulement ce qui doit   │  introduction, size.md, textMuted
│ l'être. La valeur actuelle est │
│ rappelée pour chaque champ.    │
│                                │  spacing.lg
│ Nom de la pose                 │  champ.md (aucun changement)
│ ┌────────────────────────────┐ │
│ │ Throne                     │ │
│ └────────────────────────────┘ │
│ Actuellement : Throne          │  aide 1, size.sm, textMuted
│ 60 caractères au maximum.      │  aide 2
│                                │  spacing.lg
│ Difficulté base                │  legend
│ Actuellement : Débutant        │  aide du groupe, avant les tuiles
│ [○ Découverte ][◉ Débutant   ] │
│ [○ Intermédiaire][○ Avancé   ] │
│                                │  spacing.lg
│ Difficulté flyer [Modifiée]    │  legend + etiquette-modifiee.md
│ Actuellement : Intermédiaire   │
│ [◉ Découverte ][○ Débutant   ] │  tuile cochée = nouvelle valeur
│ [○ Intermédiaire][○ Avancé   ] │
│                                │  spacing.lg
│ Commencer : … Terminer : …     │  aide commune (story 3)
│                                │  spacing.md
│ Peut-on commencer un flow sur  │
│ cette pose ?                   │
│ Actuellement : Oui             │
│ [◉ Oui      ] [○ Non      ]    │
│                                │  spacing.md
│ Peut-on terminer un flow sur   │
│ cette pose ?                   │
│ Actuellement : Oui             │
│ [◉ Oui      ] [○ Non      ]    │
│                                │  spacing.lg
│ Message pour le validateur     │  champ.md, zone de texte
│ (facultatif)                   │
│ ┌────────────────────────────┐ │
│ │                            │ │  4 lignes
│ └────────────────────────────┘ │
│ Explique-lui pourquoi tu       │  aide
│ proposes cette modification.   │
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │  Proposer la modification  │ │  bouton primaire, pleine largeur
│ └────────────────────────────┘ │  en cours : « Envoi de la modification… »
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │          Annuler           │ │  lien-bouton secondaire → catalogue
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### Grand écran (≥ 640 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AcroFunJam                               alice@example.org [Se déconnecter]  │
├──────────────────────────────────────────────────────────────────────────────┤
│          ┌────────────────────────────────────────────────────────┐          │
│          │ Proposer une modification                              │          │
│          │ Pose : Throne                                          │          │
│          │ Change seulement ce qui doit l'être. La valeur…        │          │
│          │                                                        │          │
│          │ Nom de la pose                                         │          │
│          │ [Throne                                              ] │          │
│          │ Actuellement : Throne                                  │          │
│          │                                                        │          │
│          │ Difficulté base                                        │          │
│          │ Actuellement : Débutant                                │          │
│          │ [○ Découverte][◉ Débutant][○ Intermédiaire][○ Avancé]  │          │
│          │ Difficulté flyer [Modifiée]                            │          │
│          │ Actuellement : Intermédiaire                           │          │
│          │ [◉ Découverte][○ Débutant][○ Intermédiaire][○ Avancé]  │          │
│          │ …                                                      │          │
│          │ Message pour le validateur (facultatif)                │          │
│          │ [                                                    ] │          │
│          │                                                        │          │
│          │ [Proposer la modification]  [Annuler]                  │          │
│          └────────────────────────────────────────────────────────┘          │
```

| Élément | Tokens |
|---|---|
| `h1` | comme story 3 ; marge basse **`spacing.xs`** (la ligne de la pose lui est rattachée) |
| Ligne de la pose (`p`) | `size.md`, `regular`, `textMuted` (6,1:1 sur `background`, 5,8:1 sur `surface`) ; nom en `weight.semibold`, `text` ; `overflow-wrap: anywhere` ; marge basse `spacing.sm` |
| Introduction | `size.md`, `textMuted` ; marge basse `spacing.lg` |
| Rappel « Actuellement : … » | aide de `champ.md` / `groupe-tuiles-radio.md` (`size.sm`, `textMuted`, `aria-describedby`) ; **sous le champ** pour le nom (avant la mention de longueur et le compteur), **entre la `legend` et les tuiles** pour les groupes (avant l'éventuelle erreur), marge basse `spacing.sm` ; valeur en `regular` (comme « Proposé : … » de la zone d'ajustement) ; reste affiché quand la valeur change |
| Étiquette « Modifiée » | `etiquette-modifiee.md`, dans le `label` / la `legend` |
| Message (zone de texte) | `champ.md`, variante zone de texte, compteur à partir de 450 / 500 ; libellé avec « (facultatif) » |
| Actions | mobile : empilées, pleine largeur, écart `spacing.md` ; ≥ `breakpoints.md` : en ligne, largeur du contenu, alignées à gauche, écart `spacing.md`, `flex-wrap: wrap` ; marge haute `spacing.lg` |
| Bouton principal | **primaire** : « Proposer la modification » (utilisateur, en cours « Envoi de la modification… ») ; « Vérifier la modification » (validateur, administrateur : mène au récapitulatif) |
| Annuler | **lien-bouton secondaire** (`lien-bouton.md`) : c'est une navigation (retour au catalogue), pas une action du formulaire ; même hauteur que le bouton (48) |

- Différence avec « Proposer une pose » : le bouton n'y est plus pleine largeur en grand écran, parce qu'il a un voisin (« Annuler »).
- L'introduction « Tous les champs sont obligatoires. » n'est pas reprise : tout est prérempli, et le message est facultatif.
- Les tuiles préremplies sont dans l'état **coché** normal (`selected` / `selectedSurface`) : pas de rendu propre à « valeur actuelle ». La valeur actuelle est dite par le texte « Actuellement : … », pas par une tuile marquée.

### Encadré « publication directe » (validateur, administrateur)

Mêmes tokens que l'encadré de la story 3 (`3-proposer-une-pose.md`, « Introduction pour un validateur ») : fond `infoSurface`, barre `info`, icône information, texte `text` (13,9:1), sans bouton « Fermer », marge basse `spacing.sm`, placé entre la ligne de la pose et l'introduction.

```
┃ (i) Ton rôle te permet de publier directement : la pose
┃     sera modifiée dans le catalogue dès que tu publieras ta modification.
```

### Récapitulatif avant de publier (validateur, administrateur)

« Vérifier la modification » remplace l'introduction, les champs et les actions par le récapitulatif, **dans la même carte** ; `h1`, ligne de la pose et encadré restent.

```
│ Proposer une modification      │  h1
│ Pose : Throne                  │
│ ┃ (i) Ton rôle te permet…      │  encadré (inchangé)
│                                │  spacing.lg
│ Vérifie ta modification        │  h2, focus programmatique
│ Valeur actuelle → nouvelle     │  clé de lecture
│ valeur                         │
│ ┌────────────────────────────┐ │  recapitulatif-modification.md, variante publication directe
│ │ Difficulté flyer           │ │
│ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶                │ │
│ │ → Découverte               │ │  deux lignes sous ~360 px
│ └────────────────────────────┘ │
│ Les autres valeurs restent     │  mention finale
│ inchangées.                    │
│                                │  spacing.lg
│ Message de modification        │  s'il a été saisi : libellé size.sm semibold + texte size.md
│ Throne se découvre dès…        │
│                                │  spacing.lg
│ [  Publier la modification   ] │  primaire ; en cours « Publication… »
│ [  Revenir au formulaire     ] │  bouton secondaire : retour au formulaire, saisie conservée
│ [         Annuler            ] │  lien-bouton secondaire → catalogue
```

Rangée : comme les actions du formulaire (empilées en mobile, écart `spacing.md` ; en ligne ensuite, `flex-wrap`). Libellés retenus : « Publier la modification » (en cours « Publication… »), « Revenir au formulaire », « Annuler ». Le message de modification n'apparaît pas dans ce récapitulatif : le champ est masqué pour un validateur.

### Alertes globales (sous l'introduction, avant le premier champ)

`alerte-formulaire.md`, marge basse `spacing.lg`. L'alerte est annoncée (`role="alert"`) ; le focus reste sur le bouton, sauf s'il disparaît (récapitulatif d'un validateur) : le focus va alors sur l'alerte (`tabindex="-1"`, anneau `focus` 3 px autour du conteneur, décalé de 2 px, règle prévue par `alerte-formulaire.md`). Erreur de saisie depuis le récapitulatif : le focus va au premier champ en erreur. Refus à l'envoi « modification déjà en attente » ou « pose introuvable » : le formulaire est remplacé par le bloc information ci-dessous, qui prend le focus. Ces mêmes blocs, à l'ouverture du formulaire, sont annoncés poliment (zone de statut du site). Après une publication directe qui renomme la pose, la ligne « Pose : … » montre le nouveau nom au-dessus du panneau de succès.

| Cas | Variante | Texte | Action | Ce qui reste |
|---|---|---|---|---|
| Rien n'est modifié | **erreur** (l'envoi ne peut pas partir sans correction, comme un champ obligatoire vide) | « Tu n'as rien modifié. Change au moins une valeur pour proposer une modification. » | aucune | le formulaire, inchangé |
| La pose a changé pendant la saisie | **information** (ce n'est pas une faute de la personne, sa saisie est gardée) | « Cette pose a changé pendant que tu la modifiais. Ses nouvelles valeurs sont affichées : vérifie ta modification, puis envoie-la de nouveau. » | aucune | le formulaire : rappels « Actuellement : … » mis à jour, saisie gardée, étiquettes « Modifiée » recalculées |
| AcroFunJam injoignable | erreur | message de la story 3 | « Réessayer » (secondaire) | saisie |
| Session expirée | information | message de la story 3 | lien « Se connecter » (`text` souligné, `semibold`) | saisie |

- Nom déjà pris : **erreur du champ nom** (`champ.md`), pas une alerte : « Une pose de ce nom existe déjà dans le catalogue. »
- Après un changement de la pose, les rappels dont la valeur a changé ne reçoivent **pas** de marque supplémentaire (ni couleur, ni étiquette) : l'alerte dit ce qui s'est passé et chaque rappel affiche la nouvelle valeur. Une marque « Changée » ajouterait un second code à côté de « Modifiée » et brouillerait les deux.

### Modification déjà en attente, pose introuvable (à la place des champs)

L'ouverture du formulaire peut révéler qu'il n'y a rien à saisir. Les champs, l'introduction et les actions ne sont **pas** affichés ; un bloc les remplace, sous la ligne de la pose (ou sous le `h1` quand la pose est introuvable).

```
│ Proposer une modification      │  h1
│ Pose : Throne                  │
│                                │  spacing.lg
│ ┃ (i) Tu as déjà proposé une   │  alerte-formulaire.md, variante information
│ ┃     modification de cette    │
│ ┃     pose. Elle est en attente│
│ ┃     de validation.           │
│ ┃     Voir mes propositions    │  lien text souligné semibold, 44 px
│                                │  spacing.lg
│ [     Voir le catalogue      ] │  lien-bouton secondaire
```

| Cas | Texte | Lien dans le bloc |
|---|---|---|
| Ta modification est en attente | « Tu as déjà proposé une modification de cette pose. Elle est en attente de validation. » | « Voir mes propositions » |
| Une autre personne en a une en attente | « Une modification de cette pose est déjà en attente de validation. Tu pourras en proposer une autre une fois qu'elle aura été traitée. » | aucun |
| Pose introuvable | « Cette pose n'est plus dans le catalogue. » (pas de ligne « Pose : … ») | aucun |

- Variante **information** dans les trois cas : rien n'est la faute de la personne, et ce n'est pas une erreur à corriger.
- Pas de `role="alert"` sur ce bloc (il fait partie de la page affichée ; annonce et focus : `ux-expert`), mais le même rendu que l'alerte, pour ne pas créer un troisième style d'encadré.
- Sous le bloc, « Voir le catalogue » en lien-bouton secondaire (pleine largeur en mobile, largeur du contenu ensuite) : la page garde une sortie, sans élément primaire.

### Pendant l'envoi

Bouton « en cours » (`bouton.md`) : « Envoi de la modification… » / « Publication… » ; « Annuler » reste visible et utilisable ; champs dans leur état.

### Succès

Le formulaire (ou le récapitulatif), l'introduction et l'encadré sont remplacés par le panneau de succès (`panneau-succes.md`, « Variante modification ») ; `h1` et ligne de la pose restent.

```
Utilisateur :                            Validateur, administrateur :
│ ┃ (✓)                          │       │ ┃ (✓)                          │
│ ┃ Merci, ta modification est   │       │ ┃ La pose « Throne » est       │
│ ┃ envoyée.                     │       │ ┃ modifiée dans le catalogue.  │
│ ┃ Un validateur va l'examiner. │       │                                │
│ ┃ La pose changera dans le     │       │ [     Voir le catalogue      ] │
│ ┃ catalogue une fois la        │
│ ┃ modification acceptée.       │
│                                │
│ [   Voir mes propositions    ] │  lien-bouton secondaire
│ [      Voir le catalogue     ] │  lien-bouton secondaire
```

Pas de « Proposer une autre modification » (décision `ux-expert`) : la page n'a donc **aucun** élément primaire après le succès, ce qui est voulu (rien à pousser). Titre du validateur avec le **nouveau** nom en cas de renommage.

### Visiteur qui ouvre directement la page

Comme la story 3 : redirection vers « Se connecter », retour sur le formulaire de la même pose ensuite ; pendant la vérification de session, `main` n'affiche que le `h1`.

## File de validation (`/propositions-a-valider`)

Page de l'écran 4 inchangée (colonne ≈ 690 px, une colonne, nombre « N propositions en attente » qui compte les deux types). Les cartes de modification (`../composants/carte-modification.md`) s'intercalent avec les cartes de proposition, dans l'ordre de soumission. Introduction de la page : « Vérifie chaque proposition de pose ou de modification : accepte-la, ajuste-la avant de l'accepter ou refuse-la. »

```
Mobile :
│ ┌────────────────────────────┐ │
│ │ Star                       │ │  carte-proposition.md
│ │ Proposée par alice@… le    │ │
│ │ 10 novembre 2026           │ │
│ │ …                          │ │
│ └────────────────────────────┘ │
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │ Modification de Throne     │ │  carte-modification.md : préfixe regular, nom bold
│ │ Proposée par               │ │
│ │ alice@example.org le       │ │
│ │ 12 novembre 2026           │ │
│ │                            │ │  spacing.md
│ │ Ce qui change dans la pose │ │  h3
│ │ Valeur actuelle → valeur   │ │
│ │ proposée                   │ │
│ │ ┌────────────────────────┐ │ │
│ │ │ Difficulté flyer       │ │ │
│ │ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶            │ │ │
│ │ │ → Découverte           │ │ │
│ │ └────────────────────────┘ │ │
│ │                            │ │  spacing.md
│ │ Message de modification    │ │
│ │ Throne se découvre dès la  │ │
│ │ première séance côté flyer.│ │
│ │ ────────────────────────── │ │
│ │ La pose après modification │ │  h3
│ │ Base       Débutant ●●○○   │ │  dl (carte-pose.md)
│ │ Flyer    Découverte ●○○○   │ │
│ │ ────────────────────────── │ │
│ │ Peut commencer un flow     │ │
│ │                     ✓ Oui  │ │
│ │ Peut terminer un flow      │ │
│ │                     ✓ Oui  │ │
│ │ ────────────────────────── │ │  zone de décision
│ │ [Accepter la modification] │ │  secondaires, pleine largeur, écart spacing.md
│ │ [Ajuster avant d'accepter] │ │
│ │ [         Refuser        ] │ │
│ └────────────────────────────┘ │
```

Grand écran : même carte, padding `spacing.lg`, contenu 640 px, trois boutons sur une ligne.

## Mes propositions (`/mes-propositions`)

Page de l'écran 5 inchangée (colonne, nombre, états). Les cartes de modification (`../composants/carte-ma-modification.md`) s'intercalent avec les cartes de proposition, la plus récente d'abord. Introduction : « Retrouve les poses et les modifications que tu as proposées, et ce qu'elles sont devenues. » ; texte de l'état vide : « Les poses et les modifications que tu proposes apparaissent ici, avec ce qu'elles deviennent. » (titre inchangé).

```
│ ┌────────────────────────────┐ │
│ │ Modification de Throne     │ │  h2
│ │ Proposée le 12 novembre    │ │
│ │ 2026                       │ │
│ │                            │ │  spacing.md
│ │ (◷) En attente de          │ │  statut, neutre
│ │     validation             │ │
│ │     La pose changera dans  │ │
│ │     le catalogue une fois  │ │
│ │     la modification        │ │
│ │     acceptée.              │ │
│ │                            │ │  spacing.md
│ │ Ce qui change dans la pose │ │  h3
│ │ Valeur d'avant → valeur    │ │
│ │ proposée                   │ │
│ │ ┌────────────────────────┐ │ │
│ │ │ Difficulté flyer       │ │ │
│ │ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶            │ │ │
│ │ │ → Découverte           │ │ │
│ │ └────────────────────────┘ │ │
│ └────────────────────────────┘ │
```

## Accessibilité visuelle

| Couple | Ratio |
|---|---|
| `primary` (lien « Proposer une modification ») sur `surface` | 4,9:1 |
| `primaryHover` (lien survolé) sur `surface` | 6,9:1 |
| `primaryActive` (lien pressé) sur `surface` | 8,9:1 |
| `text` sur `selectedSurface` (étiquette « Modifiée ») | 14,2:1 |
| `selected` (bordure de l'étiquette) sur `selectedSurface` / `surface` / `background` | 6,7:1 / 6,9:1 / 7,3:1 |
| `textMuted` sur `background` / `surface` (rappels « Actuellement : … », ligne de la pose, clés de lecture) | 6,1:1 / 5,8:1 |
| `text` sur `surface` (titres « Modification de … », préfixe en graisse normale compris, valeurs, messages) | 14,6:1 |
| Valeurs du récapitulatif sur `background` (gauche `textMuted`, droite `text`) | 6,1:1 / 15,4:1 |
| `text` sur `infoSurface` / `dangerSurface` / `successSurface` (encadré, alertes, blocs, panneau) | 13,9:1 / 14,4:1 / 14,4:1 |
| `focus` sur `surface` / `background` / `infoSurface` | 5,8:1 / 6,1:1 / 5,5:1 |

Rien ne repose sur la couleur seule : champ modifié = mot « Modifiée » ; valeur actuelle = texte « Actuellement : … » ; avant / après = ordre + flèche + barré + graisse + texte masqué ; type de proposition dans les listes = texte du titre ; lien = soulignement permanent.

## Check-list visuelle pour l'implémentation

- Aucune valeur en dur, **aucune nouvelle variable CSS**.
- Lien des cartes : `margin-block-start: auto` dans une carte en colonne flex (alignement en bas de rangée), `position: relative; z-index: 1` (prêt pour le futur lien étendu du nom), soulignement permanent, `min-block-size: sizes.touchTarget`.
- `ValueChangeList` : liste unique pour ajustements et modifications, textes masqués en paramètres ; aucune régression visuelle des écrans 4 et 5.
- Étiquette « Modifiée » : dans le `label` / la `legend`, hauteur ≤ 24 px, passe à la ligne sans déborder.
- Formulaire : actions en ligne à partir de 40em, empilées en dessous ; « Annuler » est un `a` (lien-bouton secondaire).
- Titres « Modification de … » : préfixe `regular`, nom `bold`, un seul `h2`.
- 320 px et zoom 400 % : récapitulatifs sur deux lignes par champ, tuiles en une colonne, étiquette sous la legend si besoin, lien des cartes sur deux lignes au pire ; zoom 200 % : aucun défilement horizontal (1.4.10).
- `forced-colors: active` : lien en `LinkText` souligné, étiquette avec bordure `CanvasText`, barré visible.
- Aucune animation.
