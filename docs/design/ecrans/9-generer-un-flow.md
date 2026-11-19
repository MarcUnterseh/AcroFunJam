# Écran de la story 9 « Générer un flow »

**Statut : proposition du 2026-11-19, à valider.** Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `../principes.md`). Scénarios `@web` (en `@wip`) : `specs/features/generation-de-flow/generer-un-flow.feature`, `criteres-de-generation.feature`. Décisions et libellés : `docs/domain/decouverte.md`, « Story 9 Générer un flow » (décisions 1 à 12, UX-1 à UX-8). Maquette statique (clair / sombre, 320 px et grand écran) : `../maquettes/9-generer-un-flow.html`.

**Aucun nouveau token.** Toutes les valeurs existent déjà ; les seules grandeurs composées (largeur de la liste déroulante, colonne du fil) sont des `calc` de tokens existants, documentés ci-dessous. **Une nouvelle icône** : `station` (une pose intermédiaire du fil), dessinée comme les autres dans `Icon.tsx`.

Nouveaux composants : `../composants/fil-du-flow.md` (pose de départ, étapes, poses d'arrivée, rail), `../composants/repli-criteres-etiquettes.md`, `../composants/recapitulatif-criteres.md`, `../composants/panneau-sans-flow.md`. Composant mis à jour : `../composants/groupe-cases-pastilles.md` (usage 7 et état **désactivée** « (demandée) » / « (exclue) »). Réutilisés sans changement : `lien-retour.md`, `champ.md` (variante liste déroulante), `groupe-tuiles-radio.md` (phases, tons base / flyer), `bouton.md` (état « en cours »), `lien-bouton.md`, `alerte-formulaire.md` (erreur, information), `pastille-role.md`, `pilule-etiquette.md`, `repli-descriptions-etiquettes.md`, note de sécurité (`legende-echelle.md`, « Variante page d'une pose »), `annonce-statut.md`.

Les libellés notés « *proposé* » ne figurent pas dans les décisions validées : ils servent la maquette et restent à confirmer par l'`ux-expert`.

## Mise en page : recommandation

**Le formulaire et le résultat ne sont pas côte à côte : ils alternent sur la même page.** Le résultat (flow, critères trop restrictifs, catalogue insuffisant) **remplace** le formulaire ; « Modifier les critères » fait revenir le formulaire prérempli.

Raisons :
- les décisions le supposent déjà : « Modifier les critères » *rouvre* le générateur (G15), le récapitulatif des critères accompagne le flow ; avec un formulaire toujours visible à côté, ces deux éléments seraient des doublons ;
- **une seule action principale par état** (`principes.md`) : « Générer un flow » dans le formulaire, « Générer un autre flow » avec le flow ; côte à côte, deux primaires se disputeraient l'écran ;
- le flow se lit sur un téléphone posé sur le tapis : il doit occuper toute la largeur, sans formulaire au-dessus ;
- l'historique de navigation (UX-2) a deux états nets : critères (formulaire) et flow ; « revenir » depuis la page d'une pose retrouve le flow, pas un écran mixte.

En grand écran (≥ 64em), c'est **le résultat** qui se met sur deux colonnes : à gauche, une colonne de pilotage (titre, résumé, récapitulatif des critères, actions), qui reste visible pendant qu'on parcourt jusqu'à 10 étapes ; à droite, le rappel du spotter puis le fil du flow. Le formulaire, lui, reste une colonne de 640 px dans une carte (comme « Proposer une pose »).

## 1. Accès depuis le catalogue

Bouton secondaire (`lien-bouton.md`, c'est une navigation) **« Générer un flow »**, **premier** des `.page-header__actions`, pour tout le monde. Sans icône : « Proposer une pose » (primaire, avec « + ») reste l'action principale du catalogue pour qui peut proposer. Pour un visiteur, la rangée devient « Générer un flow », « Étiquettes » : deux secondaires.

```
320 px (personne connectée)          ≥ 40em
Catalogue                            Catalogue        [Générer un flow] [(+) Proposer une pose] [Mes propositions] [Étiquettes]
[      Générer un flow       ]  secondaire, pleine largeur, 48 px
[(+)   Proposer une pose     ]  primaire
[      Mes propositions      ]
[        Étiquettes          ]
```

## 2. Page `/generer-un-flow` : formulaire

### Ordre du contenu

1. lien de retour « Catalogue » (`lien-retour.md`, *proposé* : la page n'a qu'une entrée, le catalogue) ;
2. `h1` « Générer un flow » (*proposé*, reprend le libellé du bouton) ;
3. introduction : « Choisis la longueur et la difficulté : AcroFunJam tire au hasard un flow parmi les poses et les transitions du catalogue. » ;
4. alerte globale éventuelle (incident réseau, étiquette retirée), juste au-dessus du premier champ ;
5. « Nombre de transitions » (liste déroulante 1 à 10, 3 par défaut) et son aide ;
6. bloc des difficultés : aide commune, puis « Difficulté base, au plus », « Difficulté flyer, au plus » (tuiles de phase, « Débutant » coché) ;
7. repli « Étiquettes (facultatives) », fermé ;
8. bouton primaire « Générer un flow ».

```
┌──────────────────────────────┐
│ ‹ Catalogue                  │  lien-retour, 44 px
│ Générer un flow              │  h1, Unbounded 600, size.xl
│ Choisis la longueur et la    │  size.md, textMuted
│ difficulté : AcroFunJam tire │
│ au hasard un flow parmi les  │
│ poses et les transitions du  │
│ catalogue.                   │
│                              │  spacing.lg
│ Nombre de transitions        │  label semi-gras
│ De 1 à 10. Un flow de 3      │  aide size.sm textMuted
│ transitions enchaîne 4 poses.│
│ [ 3                      ⌄ ] │  select 48 px
│                              │  spacing.lg
│ Aucune pose ni transition du │  aide commune (avant les deux groupes)
│ flow ne dépassera ce niveau. │
│ ● Difficulté base, au plus   │  legend + point terre
│ [ ◔ Découverte ][▐◑ Débutant▌]│  tuiles de phase 2 × 2, « Débutant » coché (baseSurface, 2 px base)
│ [ ◕ Intermédiaire][ ● Avancé ]│
│ ● Difficulté flyer, au plus  │  point ciel
│ [ ◔ Découverte ][▐◑ Débutant▌]│
│ [ ◕ Intermédiaire][ ● Avancé ]│
│                              │  spacing.lg
│ ┌──────────────────────────┐ │  repli fermé : 48 px, surface, contour border, radius.md
│ │ Étiquettes (facultatives)⌄│ │
│ └──────────────────────────┘ │
│                              │  spacing.lg
│ [      Générer un flow     ] │  primaire, 48 px, pleine largeur
└──────────────────────────────┘
```

| Élément | Tokens, rendu |
|---|---|
| Colonne (`.generator`) | 320 px : pas de carte (le fond de page suffit). ≥ 40em : carte `.proposal-page--carded` existante (surface, contour `divider`, `radius.lg`, padding `spacing.xl`, largeur `sizes.formWideMaxWidth` + 2 × `spacing.xl`), centrée |
| Formulaire | `display: grid`, écart `spacing.lg` |
| « Nombre de transitions » | `champ.md`, variante liste déroulante, valeurs « 1 » à « 10 » ; aide **entre le libellé et la liste** (comme les autres aides de champ) ; largeur : 100 % sous 19,5em, puis **`max-inline-size: calc(2 × sizes.tileMinWidth + spacing.sm)`** (312 px, la largeur de deux tuiles : la liste s'aligne sur la grille des difficultés au lieu de s'étirer sur 640 px pour un chiffre) |
| Bloc des difficultés | `.difficulty-questions` existant (story 7) : aide commune `size.sm` `textMuted`, puis les deux `fieldset`, écart `spacing.md` |
| Tuiles | `groupe-tuiles-radio.md`, phases (`tile--phase`), `tone="base"` puis `tone="flyer"` ; 2 × 2 sur téléphone, 4 sur une ligne dans la carte (≥ 39,5em de conteneur) |
| Repli « Étiquettes (facultatives) » | `repli-criteres-etiquettes.md` |
| Bouton | `bouton.md` primaire, 48 px ; pleine largeur sous 40em, largeur du contenu au-delà (`.form-actions`) |

### Repli « Étiquettes (facultatives) » ouvert

```
┌──────────────────────────────┐
│ Étiquettes (facultatives)    │  résumé + pastille de compte (*proposé* « 1 choisie »)
│ (1 choisie)                ⌃ │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ Avec l'une de ces étiquettes │  legend
│ Chaque étape portera l'une de│  aide
│ ces étiquettes, sur la       │
│ transition ou sur la pose    │
│ d'arrivée.                   │
│ (☐ contrepoids)(☐ dynamique) │
│ (☐ icarien) (☐ inversion)    │
│ (☑ lunaire) (☐ pop)          │  cochée : 2 px selected, selectedSurface, semi-gras
│ (☐ vrille) (☐ whip)          │
│                              │  spacing.lg
│ Sans ces étiquettes          │
│ Seuls les éléments étiquetés │
│ sont écartés : vérifie chaque│
│ étape.                       │
│ (☐ contrepoids)(☐ dynamique) │
│ (☐ icarien) (☐ inversion)    │
│ ( ☐ lunaire (demandée) )     │  désactivée : disabledSurface, contour tireté, textMuted
│ (☐ pop) (☐ vrille) (☐ whip)  │
│ ▸ Ce que veulent dire les    │  repli-descriptions-etiquettes.md (toutes les étiquettes)
│   étiquettes                 │
└──────────────────────────────┘
```

- La **même** liste dans les deux groupes, toutes les étiquettes de la liste, « contrepoids » comprise (K9), dans l'ordre du catalogue.
- Une étiquette cochée dans un groupe est **désactivée** dans l'autre, avec la mention « (demandée) » / « (exclue) » **dans** sa pastille (`groupe-cases-pastilles.md`, état désactivée). La pastille désactivée ne disparaît pas : les deux groupes gardent la même silhouette, l'œil retrouve « lunaire » au même endroit.
- **Un seul** repli des descriptions, après les deux groupes : les mêmes étiquettes, une seule fois.

### États du formulaire

| État | Rendu |
|---|---|
| Génération en cours | bouton « Génération du flow… », `aria-disabled`, couleurs de repos, curseur `progress` (`bouton.md`) ; les champs restent tels quels ; aucun indicateur de chargement ailleurs |
| Incident réseau | `alerte-formulaire.md` **erreur**, en tête du formulaire : « Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie. » + bouton secondaire « Réessayer » (largeur du contenu) ; la saisie est gardée |
| Étiquette retirée de la liste | `alerte-formulaire.md` **information** (ce n'est pas une faute de la personne, comme en 9a), en tête du formulaire : « L'étiquette « vrille » n'est plus disponible. Vérifie tes étiquettes, puis génère de nouveau ton flow. » ; le repli des étiquettes est **ouvert** (on y vérifie), la pastille « vrille » a disparu, le reste est gardé |
| Étiquettes non chargées | le repli est remplacé par une note **information** (`groupe-cases-pastilles.md`, « Note » : `infoSurface`, icône info, `size.sm`) : « Les étiquettes n'ont pas pu être chargées : tu peux générer un flow sans étiquette. » (*proposé*) ; le bouton reste actif |

## 3. Résultat : le flow

### Ordre du contenu

1. lien de retour « Catalogue » ;
2. `h1` « Ton flow » (reçoit le focus à l'affichage) ;
3. résumé « 3 transitions, de Throne à Folded Leaf. » ;
4. si le même flow est ressorti : alerte **information** « Le même flow est ressorti : avec ces critères, le catalogue offre peu de choix. » ;
5. récapitulatif des critères (`recapitulatif-criteres.md`) ;
6. actions : « Générer un autre flow » (primaire), « Modifier les critères » (secondaire) ;
7. alerte d'incident réseau éventuelle (pendant « Générer un autre flow »), sous les actions ;
8. rappel du spotter (note de sécurité) ;
9. le fil du flow (`fil-du-flow.md`) : « Départ : Throne », puis la liste ordonnée des étapes.

### 320 px

```
┌──────────────────────────────┐
│ ‹ Catalogue                  │
│ Ton flow                     │  h1
│ 3 transitions, de Throne à   │  size.lg, Figtree 600, text
│ Folded Leaf.                 │
│ ┌──────────────────────────┐ │  récapitulatif : surfaceHover, radius.sm
│ │ Critères du flow         │ │  *proposé* ; size.sm semi-gras
│ │ Nombre de transitions   3│ │
│ │ ● Difficulté base, au    │ │
│ │   plus        ● Avancé   │ │
│ │ ● Difficulté flyer, au   │ │
│ │   plus        ● Avancé   │ │
│ └──────────────────────────┘ │
│ [   Générer un autre flow  ] │  primaire
│ [   Modifier les critères  ] │  secondaire
│                              │  spacing.lg
│ ⚠ Ce flow est tiré au hasard │  note de sécurité : sunSurface, icône spot sunStrong
│   : il peut contenir des …   │
│                              │  spacing.lg
│ ⤒ Départ : Throne            │  station de départ (lever de soleil)
│ ┊ [Base]◑ Débutant           │
│ ┊ [Flyer]◔ Découverte        │
│ ┊ ┌────────────────────────┐ │  carte d'étape
│ ┊ │ Étape 1 · Throne ⤳ Star│ │
│ ┊ │ [Base]◑ Débutant       │ │
│ ┊ │ [Flyer]◑ Débutant      │ │
│ ┊ └────────────────────────┘ │
│ ○ Vers Star                  │  station intermédiaire
│ ┊ [Base]◕ … [Flyer]◕ …       │
│ ┊ ┌────────────────────────┐ │
│ ┊ │ Étape 2 · Ninja Star   │ │
│ ┊ │ ⟲ washing machine      │ │  boucle sunStrong + mot, sans pilule
│ ┊ │ [Base]● Avancé …       │ │
│ ┊ │ ▸ Description          │ │  repli fermé (UX-8)
│ ┊ └────────────────────────┘ │
│ ○ Vers Star (même pose)      │
│ ┊ …                          │
│ ┊ ┌────────────────────────┐ │
│ ┊ │ Étape 3 · Star ⤳ Folded│ │
│ ┊ │ Leaf …  (lunaire)      │ │
│ ┊ └────────────────────────┘ │
│ ⤓ Vers Folded Leaf           │  station d'arrivée finale (coucher de soleil)
│   [Base]◕ … (inversion)(lunaire)
└──────────────────────────────┘
```

### Grand écran (≥ 64em)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ‹ Catalogue                                                                          │
│ ┌ colonne de pilotage (1fr, collante) ┐   ┌ colonne du fil (2fr) ──────────────────┐ │
│ │ Ton flow                            │   │ ⚠ Ce flow est tiré au hasard : …       │ │
│ │ 3 transitions, de Throne à Folded   │   │                                        │ │
│ │ Leaf.                               │   │ ⤒ Départ : Throne  [Base]◑ [Flyer]◔    │ │
│ │ ┌ Critères du flow ───────────────┐ │   │ ┊ ┌ Étape 1 · Throne ⤳ Star ─────────┐ │ │
│ │ │ …                               │ │   │ ┊ │ [Base]◑ Débutant [Flyer]◑ Débutant│ │ │
│ │ └─────────────────────────────────┘ │   │ ┊ └──────────────────────────────────┘ │ │
│ │ [Générer un autre flow]             │   │ ○ Vers Star  [Base]◕ [Flyer]◕          │ │
│ │ [Modifier les critères]             │   │ ┊ …                                    │ │
│ └─────────────────────────────────────┘   └────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| Élément | Tokens, rendu |
|---|---|
| Page résultat (`.flow-result`) | 320 px à 64em : une colonne, écart `spacing.lg`. ≥ 64em : grille `minmax(0, 1fr) minmax(0, 2fr)`, écart de colonnes `spacing.xl`, largeur `sizes.contentMaxWidth` |
| Colonne de pilotage (`.flow-result__aside`) | `display: grid`, écart `spacing.md` ; ≥ 64em **et** hauteur ≥ 40em : `position: sticky`, `top: spacing.lg`, `align-self: start` (sous 40em de haut, un écran zoomé, elle défile normalement pour ne jamais masquer de contenu) |
| `h1` « Ton flow » | `size.xl`, Unbounded 600 (titre de page) ; marge nulle |
| Résumé | `p`, **`size.lg`**, `weight.semibold`, `text`, interligne `tight` : c'est la phrase qu'on retient |
| Actions (`.flow-result__actions`) | empilées pleine largeur (48 px) sous 40em ; en ligne, largeur du contenu de 40em à 64em ; **empilées pleine largeur de la colonne** à ≥ 64em (la colonne fait ~330 px) |
| Rappel du spotter | `.safety-note` existante (`sunSurface`, icône `spot` en `sunStrong`, `size.sm`, `radius.md`, padding `spacing.md`), texte de la décision 10, **au-dessus du fil**, sans variante ; marge nulle (l'écart de la grille suffit) |
| Fil du flow | `fil-du-flow.md` |

### Même flow ressorti

Alerte **information** (`alerte-formulaire.md`) entre le résumé et le récapitulatif : elle explique le résumé qu'on vient de lire, avant les critères qui en sont la cause. Pas de `danger` : ce n'est pas une erreur. Elle disparaît au tirage suivant s'il donne un autre flow.

### « Générer un autre flow » en cours

Le flow affiché reste en place, à pleine opacité (on peut continuer à le lire) ; seul le bouton passe à « Génération du flow… » (`aria-disabled`, curseur `progress`). Au nouveau flow : le `h1` reprend le focus et le fil est remplacé d'un coup, sans animation.

## 4. Résultat : aucun flow

Le panneau remplace le formulaire, sous le lien de retour et le `h1` « Générer un flow » (le titre ne promet pas un flow qui n'existe pas). Détail : `panneau-sans-flow.md`.

```
Critères trop restrictifs :                 Catalogue insuffisant :
┌──────────────────────────────┐            ┌──────────────────────────────┐
│ (i)                          │            │ (i)                          │
│ Critères trop restrictifs :  │  h2        │ Le catalogue ne permet pas   │  h2
│ impossible de générer un     │            │ encore de générer un flow.   │
│ flow.                        │            │ Il manque encore des poses ou│  p
│ ┌ Critères du flow ────────┐ │            │ des transitions pour former  │
│ │ Nombre de transitions   2│ │            │ un enchaînement.             │
│ │ … Sans ces étiquettes    │ │            │ [    Voir le catalogue     ] │  secondaire
│ │   vrille                 │ │            └──────────────────────────────┘
│ └──────────────────────────┘ │
│ Pour élargir le choix,       │
│ essaie :                     │
│ • moins de transitions ;     │
│ • des plafonds de difficulté │
│   plus hauts ;               │
│ • moins d'étiquettes exclues.│
│ [   Modifier les critères  ] │  primaire : la seule suite utile
└──────────────────────────────┘
```

## Tokens utilisés et contrastes

| Couple | Aube | Nuit |
|---|---|---|
| `text` sur `background` / `surface` (titres, résumé, étapes) | 14,7 / 16,2 | 15,6 / 14,4 |
| `textMuted` sur `background` / `surface` (introduction, aides, « Départ : », « washing machine », « (même pose) ») | 6,3 / 7,0 | 7,9 / 7,3 |
| `text` / `textMuted` sur `surfaceHover` (récapitulatif) | 13,5 / 5,8 | 12,6 / 6,4 |
| `textMuted` sur `disabledSurface` (pastille désactivée « (demandée) ») | 5,8 | 6,4 |
| `primary` sur `background` / `surface` (noms de poses en lien, résumés de repli) | 6,4 / 7,1 | 8,9 / 8,1 |
| `text` sur `sunSurface` (rappel du spotter) | 13,9 | 11,1 |
| `text` sur `infoSurface` / `dangerSurface` (alertes) | 13,4 / 14,4 | 12,5 / ≥ 12 |
| `base` / `flyer` sur leurs surfaces (pastilles de rôle, tuiles cochées) | 5,4 / 4,7 | 7,6 / 7,9 |
| `text` sur `tagSurface` (pilules) | 14,1 | 12,2 |
| `text` sur `selectedSurface` (pastille de compte, cases cochées) | 13,2 | 11,8 |
| **Composants et icônes (3:1)** : `border` sur `surface` / `background` (liste, repli, pastilles) | 3,4 / 3,06 | 3,4 / 3,7 |
| `selected` sur `selectedSurface` / `surface` | 7,8 / ≥ 3 | 8,6 / ≥ 3 |
| `sunStrong` sur `background` / `surface` (icônes de station, trajectoire, boucle, spot) | 4,7 / 5,2 | 11,3 / 10,4 |
| `sunStrong` sur `sunSurface` (icône spot) | 4,4 | 8,0 |
| `focus` sur `background` / `surface` | 5,2 / 5,7 | 9,9 / 9,1 |

Tous ces couples sont déjà vérifiés par `contrast.test.ts` ; aucun nouveau couple n'est introduit. Le **rail** pointillé (`sunStrong`) est décoratif : l'ordre est porté par la liste ordonnée et les mots « Étape 1 », « Départ », « Vers ».

## Accessibilité visuelle

- **Rien ne repose sur la couleur seule** : rôle écrit (« Base » / « Flyer »), niveau écrit à côté de la phase ; départ et arrivées dits par « Départ : » et « Vers » (les icônes lever / station / coucher ne sont que des renforts) ; washing machine dite par le mot « washing machine » et « (même pose) » ; case désactivée dite par « (demandée) » / « (exclue) » en plus du contour tireté ; étiquettes choisies comptées en toutes lettres dans le résumé du repli.
- **Hiérarchie de titres** : `h1` « Ton flow » ; `h2` « Critères du flow » (*proposé*) ; `h2` par étape (« Étape 1 · Pop to Bird »). Le départ n'est pas un titre : c'est la première ligne du fil.
- **Focus** : anneau `focus` 3 px décalé de 2 px partout ; autour du résumé entier du repli des étiquettes (`radius.md`) ; autour de chaque pastille ; pas d'anneau sur une pastille désactivée (elle ne reçoit pas le focus).
- **Cibles** : liste déroulante, tuiles, résumé du repli, boutons 48 px ; pastilles, liens de pose, résumés de description 44 px ; un nom de pose court (« Star ») garde 44 × 44 (règle `::after` existante de `.transition__other-pose-link`).
- **320 px et zoom 400 %** : tout s'empile ; noms longs et étiquettes passent à la ligne (`overflow-wrap: anywhere`) ; le rail reste à gauche, la colonne de contenu fait 260 px ; aucun défilement horizontal (1.4.10). La colonne de pilotage n'est collante que si l'écran fait au moins 40em de haut.
- **Couleurs forcées** : cartes d'étape, récapitulatif, repli des étiquettes, note de sécurité et panneau sans flow gardent un contour `CanvasText` ; le rail passe en `CanvasText` (il reste une aide de lecture) ; pastille désactivée en `GrayText` ; liens en `LinkText`.
- **Mouvement** : aucune animation (ni apparition du flow, ni ouverture des replis).

## Check-list d'implémentation

- [ ] Aucune nouvelle variable CSS ; aucune valeur en dur (stylelint). Grandeurs composées : `calc(2 * var(--afj-size-tile-min-width) + var(--afj-spacing-sm))` (liste déroulante), `var(--afj-size-icon)` (colonne du rail), `calc(var(--afj-size-icon) / 2 - var(--afj-size-border-width))` (position du rail), `calc(var(--afj-size-touch-target) / 2)` (fin du rail).
- [ ] Icône `station` ajoutée à `Icon.tsx` (cercle de 20, trait 2, point central plein ; `aria-hidden`) ; `rise`, `set`, `trajectory`, `loop`, `spot`, `chevronDown` réutilisées.
- [ ] Nouvelles classes : `.generator`, `.generator__count-field`, `.criteria-fold` (+ `__summary`, `__count`, `__content`), `.tag-choice__box--disabled`, `.tag-choice__state`, `.flow-result` (+ `__aside`, `__summary`, `__actions`, `__route`), `.criteria-recap`, `.flow-route`, `.flow-station` (+ `--start`, `--end`), `.flow-step` (+ `__card`, `__title`, `__number`, `__washing-machine`, `__description`), `.no-flow` (+ `__tips`).
- [ ] Catalogue : « Générer un flow » premier des actions, secondaire, sans icône, pour tout le monde (visiteur compris).
- [ ] Une seule action primaire par état : « Générer un flow » (formulaire), « Générer un autre flow » (flow), « Modifier les critères » (critères trop restrictifs) ; aucune pour le catalogue insuffisant.
- [ ] Préselection : « 3 », « Débutant » / « Débutant » cochés, repli fermé sans compte.
- [ ] Pastille désactivée : `disabled` natif, mention « (demandée) » / « (exclue) » visible dans la pastille et dans le nom accessible.
- [ ] Alertes : erreur pour l'incident réseau (« Réessayer »), information pour l'étiquette retirée, le même flow ressorti et les étiquettes non chargées.
- [ ] Résultat : `h1` focalisable (`tabIndex={-1}`) ; colonne de pilotage collante seulement sous `(width >= 64em) and (height >= 40em)`.
- [ ] Captures `npm run screenshots` (320 px, 1280 px) : formulaire, repli ouvert, flow de 3 étapes avec washing machine, même flow ressorti, critères trop restrictifs, catalogue insuffisant.

## Questions pour le porteur du produit (et l'`ux-expert`)

1. **Alterner formulaire et résultat** (recommandé) plutôt que les mettre côte à côte en grand écran ?
2. **Colonne de pilotage collante** en grand écran (recommandé : les actions restent sous la main pendant la lecture d'un flow de 10 étapes) ?
3. **Le fil** : poses en « stations » sur un rail pointillé, transitions en cartes, lever de soleil au départ et coucher à l'arrivée (recommandé : reprend les bornes de flow et la trajectoire déjà connues) ?
4. **Libellés proposés** : `h1` « Générer un flow » ; titre « Critères du flow » ; compte « 1 choisie » / « 3 choisies » dans le résumé du repli ; résumé de la description « Description » ; note « Les étiquettes n'ont pas pu être chargées : tu peux générer un flow sans étiquette. » ; lien de retour « Catalogue ».
5. **Nom accessible d'une transition sans nom** : « Bird → Folded Leaf » (libellé des scénarios) ou « de Bird vers Folded Leaf » (convention de la page d'une pose) ? À l'écran, la trajectoire pointillée dans les deux cas.
6. **Bouton du catalogue sans icône** (recommandé, sobriété) ou avec la trajectoire pointillée pour l'annoncer ?
