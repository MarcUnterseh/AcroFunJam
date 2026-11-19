# Écrans de la story 9a « Étiqueter les poses »

**Statut : proposition du 2026-11-18, à valider.** Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `../principes.md`). Scénarios `@web` (en `@wip`) : `specs/features/catalogue/etiquettes-applicables-aux-poses.feature`, `consulter-les-etiquettes-des-poses.feature`, `etiqueter-une-pose-publiee.feature`, `specs/features/contribution/etiqueter-une-pose.feature`. Décisions : `docs/domain/decouverte.md`, « Story 9a » ; parcours, états et libellés : recommandations de l'`ux-expert` validées le 2026-11-18. Maquette statique (clair / sombre, 320 px et grand écran) : `../maquettes/9a-etiquettes-des-poses.html`.

**Aucun nouveau token.** Les étiquettes d'une pose réutilisent les formes de la story 8 : pilule « pierre » pour lire, case en pastille pour choisir, mot dans une phrase pour comparer (`principes.md`, « Étiquettes »). Une pose et ses transitions portent des étiquettes **indépendantes** : même pilule, on les distingue par **la place** (ciel de la pose / élément de transition) et **les mots** (« Ce que veulent dire les étiquettes de la pose » / « … ces étiquettes »), jamais par une couleur.

Composants mis à jour : `pilule-etiquette.md` (variante « sur le ciel »), `carte-pose.md` (ligne « Étiquettes »), `repli-descriptions-etiquettes.md` (usage « page d'une pose »), `zone-etiqueter.md` (variante « pose », avertissement de modification en attente), `groupe-cases-pastilles.md` (formulaires de pose et de modification), `element-etiquette.md` (« S'applique à », compteur, refus de changement), `carte-proposition.md`, `carte-modification.md`, `recapitulatif-ajustements.md`. Les libellés notés « proposé » ne figurent pas dans les recommandations validées : ils servent la maquette et restent à confirmer par l'`ux-expert`.

## 1. Page d'une pose (`/poses/:id`)

### Ordre du contenu

1. **Ciel** (`.pose-hero`) : lien « Catalogue », nom, pastilles de rôle, bornes de flow, **ligne « Étiquettes »** (si la pose en porte) ;
2. **corps** (`.pose-page__body`), en tête : **bloc des étiquettes de la pose** (`.pose-tags`), présent si la pose porte des étiquettes **ou** si la personne est validateur ou administrateur (et qu'au moins une étiquette s'applique aux poses) ; absent sinon, sans vide réservé ;
3. actions « Proposer une transition depuis … » / « Proposer une modification » (inchangées) ;
4. légende de l'échelle, note de sécurité, sections de transitions (inchangées).

### Ciel : ligne « Étiquettes »

Troisième groupe du `dl.pose-card__details`, après les bornes de flow : `<div class="tag-line"><dt>Étiquettes</dt><dd><ul role="list">…</ul></dd></div>` (un `div` de regroupement est permis dans un `dl`). Il hérite ainsi de l'écart `spacing.md` du `dl` et, sur grand écran, de sa largeur limitée qui le tient à l'écart de l'astre.

```
┌────────────────────────────────┐  ciel, radius.lg
│ ‹ Catalogue               ( ☀ )│  astre dans le coin, au-dessus du titre
│ Folded                         │  h1, Unbounded 700, size.xxl
│ Leaf                           │
│ [Base]◑ Débutant               │  pastilles de rôle, opaques
│ [Flyer]◔ Découverte            │
│ ⤒ Peut commencer… (Oui)        │  bornes de flow
│ ⤓ Peut terminer… (Oui)         │
│ Étiquettes (inversion)(lunaire)│  dt skyText semi-gras + pilules pierre opaques
│ ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿ │  horizon
└────────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| Terme (`dt`) « Étiquettes » | `size.sm`, `weight.semibold`, **`skyText`** (et non `textMuted` : voir « Lisibilité sur le ciel ») |
| Pilules | `pilule-etiquette.md`, **inchangées** et **opaques** : fond `tagSurface`, contour `tagBorder`, texte `text` ; pas de transparence ni de flou (contraste garanti quel que soit l'arrêt du ciel, comme les pastilles de rôle) |
| Sans étiquette | pas de ligne, pas de vide |

#### Lisibilité sur le ciel (vérifiée sur chaque arrêt)

| Couple | Aube `#FFE1A0` / `#FBC0A4` / `#D3C1F1` / `#A797E6` | Nuit `#2E2670` / `#211C55` / `#151233` |
|---|---|---|
| `skyText` (terme « Étiquettes ») sur le ciel | 12,8 / 10,2 / 9,8 / **6,3** | 11,5 / 13,7 / 16,1 |
| `textMuted` sur le ciel (**refusé**) | 5,5 / **4,4** / **4,2** / **2,7** ✗ | 5,4 / 6,5 / 7,6 |
| `text` sur `tagSurface` (mot de la pilule, pilule opaque) | 14,1 partout | 12,2 partout |
| Forme de la pilule (`tagSurface`) contre le ciel, **décoratif** | 1,1 / 1,4 / 1,5 / 2,2 | 1,1 / 1,05 / 1,2 |
| Contour `tagBorder` contre le ciel, décoratif | 1,3 / 1,0 / 1,0 / 1,5 | 1,5 / 1,7 / 2,0 |

- Le **mot** tient partout (≥ 12:1) parce que la pilule est opaque. Le **terme** tient avec `skyText` (≥ 6,3:1) ; `textMuted` tomberait sous 4,5:1 sur trois arrêts de l'aube (2,7:1 en bas) : il est exclu sur le ciel.
- La **forme** de la pilule se détache peu du ciel (surtout la nuit, comme les pastilles de rôle `baseSurface` / `flyerSurface`) : c'est voulu et sans conséquence, la pilule n'est pas un contrôle (1.4.11 ne s'applique pas) et le mot porte le sens. La ligne est en bas du ciel, sur les arrêts lavande à l'aube, où la pierre ressort nettement (1,5 à 2,2:1).
- Aucun token nouveau : `contrast.test.ts` vérifie déjà `skyText` sur chaque arrêt et `text` sur `tagSurface`. Règle de revue : sur `.pose-hero`, tout texte hors pilule est en `skyText`.
- `forced-colors: active` : le ciel disparaît, la pilule garde son contour `CanvasText` (règle existante).

### Corps : bloc des étiquettes de la pose (`.pose-tags`)

Juste sous le ciel, en tête du corps, pleine largeur de la grille (`grid-column: 1 / -1` à partir de 64em), largeur maximale **`sizes.formWideMaxWidth`** (640, longueur de ligne lisible pour les descriptions). Pas de carte englobante : le bloc est sur le fond de page, comme la légende.

```
Visiteur, pose étiquetée :              Validateur, pose étiquetée :          Validateur, pose sans étiquette :
│ ▸ Ce que veulent dire les      │      │ ▸ Ce que veulent dire les      │    │ [ Étiqueter la pose ]          │
│   étiquettes de la pose        │      │   étiquettes de la pose        │    │                                │
│                                │      │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │    │ [(+) Proposer une transition…] │
│ [(+) Proposer une transition…] │      │ [ Étiqueter la pose ]          │
```

| Élément | Tokens |
|---|---|
| Bloc (`div.pose-tags`) | `display: grid`, écart `spacing.sm` ; `max-inline-size: sizes.formWideMaxWidth` ; à partir de 64em `grid-column: 1 / -1` |
| Repli | `repli-descriptions-etiquettes.md`, résumé « Ce que veulent dire les étiquettes de la pose » ; contenu : les étiquettes **de la pose** ; fond `surfaceHover` (lisible sur `background`) |
| Pied de gestion (`div.pose-tags__manage`) | validateur et administrateur seulement ; **bordure haute pointillée `divider` seulement s'il suit le repli** (`.tag-meanings + .pose-tags__manage`), padding haut `spacing.sm` ; seul (pose sans étiquette) : ni bordure ni padding |
| « Étiqueter la pose » | `bouton.md` **secondaire**, 44 px, largeur du contenu (même à 320 px), aligné à gauche ; nom accessible « Étiqueter la pose Folded Leaf » (texte masqué « Folded Leaf ») |

Le bouton et la page gardent **un seul primaire** au repos (« Proposer une transition depuis … »).

### Zone ouverte « Étiquettes de la pose » (validateur)

Le bouton est **remplacé** par la zone, à la même place (`zone-etiqueter.md`, « Variante pose »). La zone est sur le fond de page : elle prend donc le rendu d'un **élément** (fond `surface`, contour `divider`, rayon `radius.md`) au lieu du fond `background` de la zone d'une transition, qui disparaîtrait ici.

```
│ ▸ Ce que veulent dire les      │
│   étiquettes de la pose        │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ ┌────────────────────────────┐ │  zone : surface, divider, radius.md, padding md
│ │ Étiquettes de la pose      │ │  legend
│ │ (☑ inversion) (☐ lunaire)  │ │  pastilles des seules étiquettes applicables aux poses
│ │ ▸ Ce que veulent dire les  │ │  repli : toutes les étiquettes applicables aux poses
│ │   étiquettes               │ │
│ │ [Enregistrer les étiquettes]│ │  primaire, pleine largeur < 40em
│ │ [         Annuler         ]│ │  secondaire
│ └────────────────────────────┘ │
```

- Après l'enregistrement : la zone se referme, le bouton revient, les pilules du ciel et le repli sont à jour (ou disparaissent) ; annonce de statut « Étiquettes de la pose enregistrées. » ; aucun bandeau de succès.
- Pendant que la zone est ouverte, le repli du bloc (au-dessus) reste en place : il décrit les étiquettes **actuelles**.

### Modification en attente (validateur, à l'ouverture)

La zone s'ouvre avec la legend, l'avertissement **information** (`alerte-formulaire.md`, variante information : ce n'est pas une faute du validateur) et seulement « Annuler ». **Ni pastilles ni « Enregistrer les étiquettes »** (recommandé : des cases qu'on ne peut pas enregistrer se liraient comme une panne).

```
│ ┌────────────────────────────┐ │
│ │ Étiquettes de la pose      │ │  titre de zone (même style que la legend)
│ │ ┃(i) Une modification de   │ │  infoSurface, barre info, icône information
│ │ ┃    Folded Leaf attend    │ │
│ │ ┃    déjà d'être validée.  │ │
│ │ ┃    Décide d'abord de     │ │
│ │ ┃    cette modification,   │ │
│ │ ┃    puis étiquette la pose│ │
│ │ ┃    Propositions à valider│ │  lien text souligné semi-gras, 44 px
│ │ [         Annuler         ]│ │  secondaire
│ └────────────────────────────┘ │
```

### Grand écran (≥ 640 px, puis ≥ 1024 px)

- Ciel : la ligne « Étiquettes » est dans le `dl` dont la largeur est limitée à `100% − sizes.orbLarge − 10%` à partir de 64em (règle existante) : les pilules ne passent jamais sur l'astre.
- Corps : le bloc `.pose-tags` occupe la première rangée de la grille, sur toute la largeur, limité à 640 px ; la zone ouverte aussi. Les actions de la zone sont en ligne (largeur du contenu) à partir de 40em.

## 2. Catalogue : ligne « Étiquettes » sur les cartes

Troisième groupe du `dl` de la carte (`carte-pose.md`), après les bornes de flow, écart `spacing.md` ; **rien** si la pose n'en porte pas (pas de « aucune », pas de vide). Pas de description, pas de repli : on lit la carte d'un coup d'œil, le sens est sur la page de la pose.

```
┌────────────────────────────┐   ┌────────────────────────────┐
│ Straddle Bat               │   │ Throne                     │
│ [Base]◑ Débutant           │   │ [Base]◔ Découverte         │
│ [Flyer]◕ Intermédiaire     │   │ [Flyer]◔ Découverte        │
│ ⤒ Peut commencer… (Oui)    │   │ ⤒ Peut commencer… (Oui)    │
│ ⤓ Peut terminer… (Oui)     │   │ ⤓ Peut terminer… (Oui)     │
│ Étiquettes (inversion)     │   │ ────────────────────────── │  pas de ligne
│            (lunaire)       │   │ Proposer une modification  │
│ ────────────────────────── │   └────────────────────────────┘
│ Proposer une modification  │
└────────────────────────────┘
```

Grille 1, 2 puis 3 colonnes (inchangée) : les liens « Proposer une modification » restent alignés en bas (la ligne d'étiquettes allonge la carte, la marge `auto` absorbe l'écart). Survol de la carte (`surfaceHover`) : `text` sur `tagSurface` ne change pas (la pilule est opaque).

## 3. Page « Étiquettes » (`/etiquettes`)

Introduction (validée) : « Les étiquettes décrivent les poses et les transitions. Le futur générateur de flow s'en servira. »

### Élément d'étiquette : ligne « S'applique à »

Pour **tous** (visiteur compris), juste sous le nom : « S'applique aux poses » / « S'applique aux transitions » / « S'applique aux poses et aux transitions ». Pour les validateurs, le compteur devient « Portée par 1 pose et 2 transitions » (selon le champ d'application). Détail : `element-etiquette.md`.

```
┌──────────────────────────────┐
│ lunaire                      │  h2, Unbounded 500, size.lg
│ S'applique aux poses et aux  │  size.sm, semibold, textMuted
│ transitions                  │
│ Pratique thérapeutique : le  │  description, size.md, text
│ flyer, détendu et passif, …  │
│ Portée par 1 pose et         │  validateur : size.sm, textMuted
│ 2 transitions                │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│ [ Modifier ] [ Retirer ]     │
└──────────────────────────────┘
```

### Ajout : groupe « S'applique à »

Dans le panneau « Ajouter une étiquette », **après la description**, avant le bouton : `groupe-tuiles-radio.md`, variante **neutre** (cochée = `selected` / `selectedSurface`, comme Oui / Non), **aucune tuile cochée** à l'ouverture. Trois tuiles « Aux poses », « Aux transitions », « Aux poses et aux transitions ». Colonnes : une colonne sous 39,5em de conteneur, **trois** à partir de 39,5em (variante `tile-group__tiles--scope`, pas la quatrième colonne vide des niveaux).

```
│ Description                  │
│ [                          ] │
│                    0 / 200   │
│                              │  spacing.lg
│ S'applique à                 │  legend
│ (!) Choisis à quoi s'applique│  erreur à l'envoi : danger, semi-gras, icône
│     l'étiquette.             │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  tuiles : bordure 2 px danger tant que l'erreur est là
│ ┃ ○ Aux poses              ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ ┃ ○ Aux transitions        ┃ │
│ ┃ ○ Aux poses et aux       ┃ │
│ ┃   transitions            ┃ │
│ [  Ajouter l'étiquette     ] │
```

Modification en place : le même groupe, la valeur actuelle cochée, entre Description et les actions (une colonne : la zone fait moins de 39,5em).

### Refus de changement ou de retrait : liste des porteurs

Alerte **erreur** (`alerte-formulaire.md`) dans l'élément, en tête de la zone de modification (la saisie est gardée) ou à la place de la confirmation de retrait. Sous-titres de liste dans cet ordre, chacun seulement s'il a des éléments : **« Poses du catalogue »** (le nom de la pose est le lien vers sa page), **« Transitions du catalogue »** (lien « Voir Bird » vers la page de la pose de départ, story 8), **« Propositions en attente »** (texte sans lien).

```
│ ┃(!) « lunaire » ne peut pas   │  proposé
│ ┃    être retirée : ces        │
│ ┃    éléments la portent.      │
│ ┃    Poses du catalogue        │  size.sm, semibold
│ ┃    • Folded Leaf             │  lien text souligné semi-gras, 44 px
│ ┃    • Straddle Bat            │
│ ┃    Transitions du catalogue  │
│ ┃    • de Bird vers Folded     │
│ ┃      Leaf         Voir Bird  │
│ ┃    Propositions en attente   │
│ ┃    • Modification de Throne  │
│ [ Fermer ]                     │
```

Refus de changement (proposé) : « « lunaire » ne peut pas cesser de s'appliquer aux poses : ces éléments la portent. », puis les seules listes concernées (poses, propositions de pose ou de modification).

## 4. Formulaire « Proposer une pose »

Introduction (validée) : « Les étiquettes sont facultatives ; les autres champs sont obligatoires. » (remplace « Tous les champs sont obligatoires. »). Groupe **après les questions de flow**, avant le bouton, `spacing.lg` avant et après :

```
│ Peut-on terminer un flow sur   │
│ cette pose ?                   │
│ [○ Oui      ] [○ Non      ]    │
│                                │  spacing.lg
│ Étiquettes (facultatives)      │  legend
│ Choisis celles qui décrivent   │  aide (validée)
│ la pose.                       │
│ (☐ inversion) (☐ lunaire)      │  pastilles des étiquettes applicables aux poses
│ ▸ Ce que veulent dire les      │  repli
│   étiquettes                   │
│                                │  spacing.lg
│ [      Proposer la pose      ] │
```

- Aucune étiquette applicable aux poses : groupe absent, introduction d'origine « Tous les champs sont obligatoires. » (recommandé, pour ne pas parler d'un champ invisible).
- Étiquette qui cesse de s'appliquer pendant la saisie : alerte globale **information**, « L'étiquette « vrille » ne s'applique plus aux poses. Vérifie tes étiquettes, puis envoie de nouveau ta pose. » ; la pastille disparaît, le reste de la saisie est gardé.

## 5. Formulaire « Proposer une modification »

Groupe après les questions de flow, avant le message : legend **« Étiquettes »** (sans « (facultatives) » : tout est prérempli), marque « Modifiée » dans la legend dès que l'ensemble coché diffère de l'actuel (un autre ordre n'existe pas ici : ce sont des cases), rappel **« Actuellement : lunaire »** (« Actuellement : aucune » si la pose n'en porte pas) entre la legend et les pastilles, comme les autres groupes. Pas d'aide supplémentaire.

```
│ Étiquettes [Modifiée]          │  legend + marque-modifiee.md
│ Actuellement : lunaire         │  size.sm, textMuted
│ (☑ inversion) (☑ lunaire)      │  cochées = nouvelle valeur
│ ▸ Ce que veulent dire les      │
│   étiquettes                   │
```

## 6. File de validation et « Mes propositions »

- Cartes de proposition de pose et de modification : ligne « Étiquettes » dans le `dl` de la pose (comme le catalogue), avec **« aucune »** écrit dans la file (`pilule-etiquette.md`, « aucune »).
- Récapitulatif du validateur et « Ajustements apportés » : ligne « Étiquettes », « ~~aucune~~ → inversion », « ~~inversion, lunaire~~ → lunaire » (`recapitulatif-ajustements.md`) ; « Ce qui change dans la pose » d'une modification : même ligne.
- Zone d'ajustement : `groupe-cases-pastilles.md` avec le rappel « Proposées : … » (story 8), étiquettes applicables aux poses seulement.

## Accessibilité visuelle

| Couple | Aube | Nuit |
|---|---|---|
| `skyText` (terme « Étiquettes » du ciel) sur chaque arrêt | ≥ 6,3:1 | ≥ 11,5:1 |
| `text` sur `tagSurface` (pilules, ciel compris) | 14,1:1 | 12,2:1 |
| `textMuted` (« S'applique à… », « Portée par… », « Actuellement : … ») sur `surface` / `background` | 7,0 / 6,3:1 | 7,3 / 7,9:1 |
| `primary` (résumé du repli) sur `background` | 6,4:1 | 8,9:1 |
| `border` (pastille, tuile au repos) sur `surface` | 3,4:1 | 3,4:1 |
| `danger` (bordure des tuiles en erreur, message) sur `surface` | 6,6:1 | ≥ 7,9:1 |
| `selected` sur `selectedSurface` (tuile, pastille cochée) | 7,8:1 | 8,6:1 |
| `text` / `info` sur `infoSurface` (avertissement) | 13,4 / 4,7:1 | 12,5 / 7,9:1 |

Rien ne repose sur la couleur seule : étiquette = mot ; pose / transition = place et mots ; champ d'application = phrase écrite ; erreur = icône + texte + bordure 2 px ; coché = coche + bordure 2 px + graisse ; modifié = mot « Modifiée ».

## Check-list visuelle pour l'implémentation

- Aucune nouvelle variable CSS. Nouvelles classes proposées : `.pose-tags`, `.pose-tags__manage`, `.pose-tagging-zone` (variante de `.tagging-zone` : `surface` + contour `divider` + `radius.md`), `.tag__scope`, `.tile-group__tiles--scope`.
- `.pose-hero .tag-line__term { color: var(--afj-color-sky-text) }` ; la ligne dans le `dl.pose-card__details` (div de regroupement).
- Pilules toujours opaques, y compris sur le ciel ; pas de `backdrop-filter`.
- Un seul primaire au repos sur la page d'une pose.
- 320 px et zoom 400 % : pilules et pastilles passent à la ligne ; « Aux poses et aux transitions » sur deux lignes dans sa tuile ; listes de porteurs sur plusieurs lignes ; aucun défilement horizontal (1.4.10).
- `forced-colors: active` : pilules et zone avec contour `CanvasText` (règles story 8), tuiles comme `groupe-tuiles-radio.md`.
- Aucune animation.

## Questions

1. **Modification en attente** : cacher les pastilles dans la zone (recommandé) ou les montrer désactivées ?
2. **Formulaire de pose sans étiquette applicable** : revenir à « Tous les champs sont obligatoires. » (recommandé) ?
3. **Ordre du panneau d'ajout** : « S'applique à » après la description (recommandé : on dit ce qu'est l'étiquette avant de dire où elle sert) ou entre le nom et la description ?
4. **Libellés proposés** : « ne peut pas cesser de s'appliquer aux poses : ces éléments la portent. », « ne peut pas être retirée : ces éléments la portent. », sous-titre « Poses du catalogue ».
