# Écrans de la story 8 « Étiquettes »

**Statut : proposition du 2026-11-13, à valider.** Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `../principes.md`). Scénarios : `specs/features/catalogue/gerer-la-liste-des-etiquettes.feature`, `specs/features/contribution/etiqueter-une-transition.feature`, `specs/features/catalogue/etiqueter-une-transition-publiee.feature`, `specs/features/catalogue/consulter-les-etiquettes-des-transitions.feature` (`@web`). Décisions : `docs/domain/decouverte.md`, « Story 8 » ; parcours, états et libellés : recommandations de l'`ux-expert` validées le 2026-11-13. Maquette statique (clair / sombre, 320 px et grand écran) : `../maquettes/8-etiquettes.html`.

Composants nouveaux : `pilule-etiquette.md`, `groupe-cases-pastilles.md`, `repli-descriptions-etiquettes.md`, `zone-etiqueter.md`, `element-etiquette.md`. Mis à jour : `element-transition.md`, `carte-transition.md`, `recapitulatif-ajustements.md`. Vocabulaire (Q161) : `marque-modifiee.md` (anciennement « étiquette « Modifiée » »), « mot de la pastille » (`pastille-role.md`).

**Nouveaux tokens** : `tagSurface` (« pierre »), `tagBorder` (contour décoratif), clair et sombre. Aucune nouvelle taille, aucun nouvel espacement, aucune nouvelle icône (`chevronDown`, `info`, `error`, `chevronLeft` existent). Les libellés notés « proposé » ne figurent pas dans les recommandations de l'`ux-expert` : ils servent la maquette et restent à valider.

## 1. Page « Étiquettes » (`/etiquettes`)

Gabarit des pages de lecture (écrans 4, 5, 7) : colonne alignée à gauche, largeur maximale ≈ 690 px (`sizes.formWideMaxWidth` + 2 × `spacing.lg` + 2 × `sizes.borderWidth`), sans carte englobante. **Pas d'en-tête du ciel** (un seul moment spectaculaire : la page d'une pose).

### Ordre du contenu

1. lien de retour « Catalogue » (`lien-retour.md`) ;
2. `h1` « Étiquettes » (Unbounded 600, `size.xl`) ;
3. introduction (proposée) : « Les étiquettes disent comment se pratique une transition. Le futur générateur de flow s'en servira. », `textMuted` ;
4. validateur, administrateur : panneau **« Ajouter une étiquette »** ;
5. liste des étiquettes (`element-etiquette.md`), ordre du catalogue.

### Mobile (< 640 px), visiteur

```
┌────────────────────────────────┐
│ ◒ AcroFunJam    [Se connecter] │  en-tête inchangé
├────────────────────────────────┤
│ ‹ Catalogue                    │  44 px
│ Étiquettes                     │  h1
│ Les étiquettes disent comment  │  intro, textMuted
│ se pratique une transition. …  │
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │ dynamique                  │ │  h2, Unbounded 500
│ │ Le passage se fait avec de │ │
│ │ l'élan : base et flyer …   │ │
│ └────────────────────────────┘ │
│                                │  spacing.sm
│ ┌────────────────────────────┐ │
│ │ icarien                    │ │
│ │ …                          │ │
└────────────────────────────────┘
```

### Validateur : panneau « Ajouter une étiquette »

```
│ ┌────────────────────────────┐ │  panneau : surface, divider, radius.lg, padding lg
│ │ Ajouter une étiquette      │ │  h2, Unbounded 500, size.lg
│ │ Nom                        │ │
│ │ [                        ] │ │  champ, 48 px
│ │                     0 / 30 │ │  compteur, toujours visible
│ │ Description                │ │
│ │ [                        ] │ │  zone de texte, 3 lignes
│ │ Une phrase, idéalement     │ │  aide (proposée, charte)
│ │ avec un exemple.   0 / 200 │ │
│ │ [  Ajouter l'étiquette   ] │ │  primaire, pleine largeur (mobile)
│ └────────────────────────────┘ │
│                                │  spacing.xl
│ Les étiquettes                 │  h2 de liste (proposé, visible pour les validateurs seulement)
│ ┌────────────────────────────┐ │
│ │ lunaire                    │ │
│ │ Pratique thérapeutique : … │ │
│ │ Portée par 2 transitions   │ │  size.sm, textMuted
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │
│ │ [Modifier] [Retirer]       │ │
│ └────────────────────────────┘ │
```

| Élément | Tokens |
|---|---|
| Panneau d'ajout | fond `surface`, contour `divider`, rayon `radius.lg`, padding `spacing.lg` (`spacing.xl` ≥ `breakpoints.md`) ; `display: grid`, écart `spacing.lg` entre champs |
| Compteurs | sous le champ, à droite, `size.sm`, `textMuted` ; dépassement : `danger`, semi-gras, icône erreur |
| Nom déjà pris | erreur sous « Nom » (`champ.md`) : « Une étiquette de ce nom existe déjà dans la liste. » (proposé) ; la saisie est gardée |
| Bouton | « Ajouter l'étiquette » (proposé), **le seul primaire de la page au repos** ; pleine largeur sous `breakpoints.md`, largeur du contenu au-delà |
| Liste | marge haute `spacing.xl` ; `h2` « Les étiquettes » `size.lg` (proposé) |

Après un ajout réussi : les champs se vident, l'étiquette apparaît à sa place dans la liste, annonce de statut « Étiquette « vrille » ajoutée. » (proposé). Pas de panneau de succès.

### Grand écran (≥ 640 px)

Même colonne ; le panneau d'ajout garde ses champs pleine largeur de la colonne (≈ 640 px), bouton à gauche, largeur du contenu ; boutons « Modifier » / « Retirer » en ligne. Pas de grille à plusieurs colonnes : les modifications en place ont besoin de la largeur, et un glossaire se lit de haut en bas.

### États de modification (en place)

Voir `element-etiquette.md` : modification (champs avec compteurs, « Enregistrer » / « Annuler »), confirmation du retrait (« Retirer « vrille » de la liste ? », « Retirer l'étiquette » / « Annuler »), retrait impossible (alerte erreur listant les transitions du catalogue avec un lien vers la page de leur pose, puis les propositions en attente). **Une seule** zone ouverte à la fois est recommandée (`ux-expert`).

## 2. Formulaire « Proposer une transition » : groupe « Étiquettes »

Ordre (écran 7) : poses, nom, aide des difficultés, Difficulté base, Difficulté flyer, **Étiquettes (facultatives)**, Description, actions. `spacing.lg` avant et après le groupe, comme entre les autres groupes.

```
│ Difficulté flyer               │
│ [◔ Découverte][◑ Débutant   ]  │
│ …                              │
│                                │  spacing.lg
│ Étiquettes (facultatives)      │  legend
│ Choisis celles qui décrivent   │  aide (proposée)
│ le passage.                    │
│ (☐ dynamique) (☐ icarien)      │  pastilles 44 px, fond surface
│ (☐ inversion) (☐ lunaire)      │
│ (☐ pop) (☐ vrille) (☐ whip)    │
│ ▸ Ce que veulent dire les      │  repli, fermé
│   étiquettes                   │
│                                │  spacing.lg
│ Description (facultative)      │
```

« pop » cochée :

```
│ (☑ dynamique) (☐ icarien)      │  dynamique cochée d'office : même rendu coché
│ (☐ inversion) (☐ lunaire)      │
│ (☑ pop) (☐ vrille) (☐ whip)    │
│ ┌────────────────────────────┐ │
│ │(i) « dynamique » est       │ │  note infoSurface (proposée)
│ │    ajoutée : « pop »,      │ │
│ │    « whip » et « icarien » │ │
│ │    sont toujours dynamiques│ │
│ └────────────────────────────┘ │
```

En grand écran (carte du formulaire, 640 px) : quatre pastilles environ par ligne ; rien d'autre ne change.

**Étiquette retirée pendant la saisie** : alerte globale du formulaire (`alerte-formulaire.md`, variante **information** : ce n'est pas une faute de la personne), « L'étiquette « vrille » ne fait plus partie de la liste des étiquettes. Vérifie tes étiquettes, puis envoie de nouveau ta transition. » (proposé) ; la pastille « vrille » a disparu, le reste de la saisie est gardé.

## 3. Page d'une pose : transitions étiquetées

Éléments de transition (`element-transition.md`) dans « Transitions depuis … » et « Transitions vers … » :

```
│ ┌────────────────────────────┐ │  élément : surface, divider, radius.md
│ │ Pop to Bird                │ │  h3
│ │ Vers Bird                  │ │
│ │ [Base]◑ Intermédiaire      │ │  pastilles de rôle
│ │ [Flyer]◑ Intermédiaire     │ │
│ │ Étiquettes (dynamique)(pop)│ │  pilules pierre, lecture seule
│ │ Décollage depuis Throne …  │ │  description
│ │ ▾ Ce que veulent dire ces  │ │  repli ouvert
│ │   étiquettes               │ │
│ │ ┌────────────────────────┐ │ │  surfaceHover, radius.sm
│ │ │ dynamique              │ │ │
│ │ │ Le passage se fait …   │ │ │
│ │ │ pop                    │ │ │
│ │ │ La base propulse le …  │ │ │
│ │ └────────────────────────┘ │ │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │  validateur seulement
│ │ [ Étiqueter ]              │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ Bird ⤳ Folded Leaf         │ │  sans étiquette : pas de ligne, pas de repli
│ │ Vers Folded Leaf           │ │
│ │ [Base]◑ Débutant …         │ │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │
│ │ [ Étiqueter ]              │ │  présent même sans étiquette
│ └────────────────────────────┘ │
```

Zone « Étiqueter » ouverte : `zone-etiqueter.md`. Grand écran : sections côte à côte à partir de 64em (inchangé) ; la zone ouverte reste dans la largeur de sa section (≈ 300 à 500 px) : les pastilles passent à la ligne.

## 4. File de validation et « Mes propositions »

- **Entrée de gestion** : sur « Propositions à valider », lien-bouton **secondaire** « Gérer les étiquettes » sous l'introduction, largeur du contenu, marge basse `spacing.lg` (le compteur et les cartes suivent).
- **Carte de transition** (`carte-transition.md`) : ligne « Étiquettes » après les difficultés : pilules, ou « Étiquettes : aucune ».
- **Récapitulatif** du validateur et « Ajustements apportés » du contributeur : ligne « Étiquettes », « aucune → dynamique, pop » / « dynamique, inversion, pop → dynamique, pop » (`recapitulatif-ajustements.md`).

## 5. Catalogue : entrée « Étiquettes »

Lien-bouton **secondaire** « Étiquettes » dans la rangée d'actions de l'en-tête du catalogue, **pour tous** : après « Proposer une pose » et « Mes propositions » pour une personne connectée, seul pour un visiteur. Pas d'entrée dans l'en-tête du site (décision 6).

## Accessibilité visuelle

| Couple | Aube | Nuit |
|---|---|---|
| `text` sur `tagSurface` (pilule) | 14,1:1 | 12,2:1 |
| `textMuted` sur `tagSurface` | 6,1:1 | 6,2:1 |
| `textMuted` (« Étiquettes », « Portée par… », compteurs) sur `surface` / `background` | 7,0 / 6,3:1 | 7,3 / 7,9:1 |
| `border` (pastille au repos) sur `surface` / `background` | 3,4 / 3,06:1 | 3,4 / 3,7:1 |
| `selected` (bordure, coche) sur `selectedSurface` | 7,8:1 | 8,6:1 |
| `text` sur `selectedSurface` (pastille cochée) | 13,2:1 | 11,8:1 |
| `primary` (résumé du repli) sur `surface` / `background` | 7,1 / 6,4:1 | 8,1 / 8,9:1 |
| `text` sur `surfaceHover` (contenu du repli) | 13,5:1 | 12,6:1 |
| `text` / `info` sur `infoSurface` (note « dynamique ») | 13,4 / 4,7:1 | 12,5 / 7,9:1 |
| `text` / `danger` sur `dangerSurface` (retrait impossible) | ≥ 4,5:1 (test) | ≥ 4,5:1 (test) |

`tagBorder` est **décoratif** (1,7:1 sur `surface` à l'aube, 2,0:1 la nuit) : la pilule n'est pas un contrôle et son mot porte le sens. À ajouter à `contrast.test.ts` lors de l'implémentation : `['text', 'tagSurface']`, `['textMuted', 'tagSurface']` dans les paires de texte.

Rien ne repose sur la couleur seule : étiquette = mot ; case cochée = coche + bordure 2 px + graisse ; repli = chevron + état natif ; « aucune » écrit ; ajustement = ordre + flèche + barré + graisse.

## Check-list visuelle pour l'implémentation

- Variables nouvelles : `--afj-color-tag-surface`, `--afj-color-tag-border` (générées par `toCssVariables()`). Aucune autre valeur nouvelle.
- Renommer dans le code (Q161) : `.modified-tag` → `.modified-mark`, `role-pill__tag` → `role-pill__word` (ou équivalent), commentaires renvoyant à `etiquette-modifiee.md` → `marque-modifiee.md` ; puis supprimer `docs/design/composants/etiquette-modifiee.md` (renvoi temporaire).
- Pastilles : `label:has(input:checked)` / `:has(input:focus-visible)`, padding compensé de 1 px à l'état coché.
- Repli : `summary` sans marqueur natif, chevron retourné via `details[open] > summary .icon`, aucune animation.
- 320 px et zoom 400 % : pastilles et pilules passent à la ligne, nom de 30 caractères coupé dans la pilule, alerte de retrait sur plusieurs lignes ; aucun défilement horizontal (1.4.10).
- `forced-colors: active` : pilules et zones avec contour `CanvasText`, pastille cochée en `Highlight`, `summary` en `LinkText`.
- Aucune animation.

## Questions

1. **« Pierre »** pour les pilules d'étiquette (nouveau neutre chaud) plutôt qu'un neutre violet existant (`surfaceHover`, recommandé contre : il se confond avec les boutons discrets) : à valider.
2. **« Portée par N transitions »** : seulement pour les validateurs (recommandé, suit le scénario) ou pour tous ?
3. **Ligne « Étiquettes » dans « Mes propositions »** quand il n'y en a aucune : rien (recommandé, comme la page d'une pose) ou « Étiquettes : aucune » comme dans la file ?
4. **Liste des propositions en attente** dans le refus de retrait : sans lien (recommandé : la file est déjà accessible au validateur) ou lien vers la file ?
