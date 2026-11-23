# Écrans de la story 10 « Photos des poses »

**Statut : proposition du 2026-11-20, revue le même jour par le porteur du produit** (photo principale seule en haut, autres photos en bas de page ; vignette gardée à l'essai ; recommandations par défaut retenues). Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `../principes.md`, section « Les photos des poses »). Scénarios `@web` (en `@wip`) : `specs/features/catalogue/consulter-les-photos-des-poses.feature`, `ajouter-des-photos-a-une-pose.feature`. Décisions : `docs/domain/decouverte.md`, « Story 10 » (R16 à R19) ; stockage et tailles : [ADR 0039](../../adr/0039-photos-des-poses-stockage-diffusion-et-traitement.md) ; parcours, états et libellés : `ux-expert` (validés). Maquette statique (clair / sombre, 320 px et grand écran) : `../maquettes/10-photos-des-poses.html`.

Composants : `galerie-photos.md`, `dialogue-agrandissement.md`, `champ-photo.md`, `case-confirmation.md`, `barre-progression.md` (nouveaux) ; `carte-pose.md` (vignette). Libellés notés « proposé » : absents des recommandations validées, à confirmer par l'`ux-expert`.

## Choix visuels structurants

1. **Une photo est toujours entière.** Toute photo est contenue (`object-fit: contain`) dans son cadre ; le reste est le **passe-partout** `photoMat`, un gris froid neutre. Ni recadrage, ni flou d'arrière-plan, ni ombre, ni filtre.
2. **Les photos restent hors du ciel.** Le ciel garde le nom ; les photos ouvrent le corps de la page. Le ciel reste le seul moment spectaculaire.
3. **Un cadre par usage** : vignette carrée de 80 px (catalogue), principale à ses proportions jusqu'à 560 px de haut, autres en cellules carrées, agrandie dans un dialogue.4. **La gestion se lit comme ailleurs** : pied pointillé `divider`, boutons secondaires, confirmations sur place, aucun rouge plein.
5. **La photo principale est le soleil de la pose** : repère en pilule `sunSurface` avec l'icône soleil, pour les validateurs seulement.
6. **La principale en haut, les autres en bas** (porteur du produit, 2026-11-20) : seule la photo principale ouvre le corps de la page ; un lien « Voir les 2 autres photos » descend vers la section « Autres photos de Bird », dernière de la page, après les transitions. La page d'une pose reste d'abord une fiche (caractéristiques, transitions), pas une galerie.

## Tokens (nouveaux)

| Token | Aube | Nuit | Rôle |
|---|---|---|---|
| `colors.photoMat` | `#E9E6EF` | `#2A2833` | passe-partout des photos ; texte dessus : `text` 13,2 / 12,0:1, `textMuted` 5,7 / 6,1:1 |
| `colors.scrim` | `#211C3BB8` | `#05040ECC` | voile du dialogue (`::backdrop`), décoratif |
| `sizes.thumbnail` | 80 | | vignette carrée du catalogue (192 px générés : nette à 2×) |
| `sizes.photoMaxHeight` | 560 | | hauteur maximale de la photo principale et de l'aperçu |
| `sizes.progress` | 8 | | épaisseur de la barre de progression |

Paires ajoutées à `contrast.test.ts` : texte `text`/`photoMat`, `textMuted`/`photoMat` ; contrôles `primary`/`surfaceHover` (remplissage de la barre), `textMuted`/`photoMat` (icône photo).

**Fond de la vignette générée (ADR 0039)** : **retenu le 2026-11-20**, des marges **transparentes** (WebP avec alpha) ; le site peint `photoMat` derrière (suit le thème). À reporter dans l'ADR 0039.

**Vignette à l'essai** : le porteur du produit la trouve « bizarre » sur la maquette (dessins de remplacement) ; elle est **gardée pour l'instant** et sera jugée avec de vraies photos, sur les captures de la story (`npm run screenshots`). Si elle est abandonnée : ni token à retirer d'urgence (`sizes.thumbnail` deviendrait inutilisé), ni changement de la ligne du haut de la carte.

## 1. Catalogue : vignette sur la carte

Dans la ligne du haut de la carte (`carte-pose.md`, « Vignette »), après le nom : carré `sizes.thumbnail` (80), rayon `radius.sm`, passe-partout `photoMat`, `alt=""`. Pose sans photo : rien.

```
320 px                                   Grand écran (3 colonnes, inchangé)
┌────────────────────────────┐           ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Bird            ┌────────┐ │           │ Bird   ┌────────┐│ │ Throne ┌────────┐│ │ Reverse Bird     │
│ ‾‾‾‾            │▒[4:3 ]▒│ │           │        │▒[4:3 ]▒││ │        │▒[2:3]▒▒││ │ ‾‾‾‾‾‾‾‾‾‾‾‾     │
│                 └────────┘ │           │        └────────┘│ │        └────────┘│ │ [Base]◑ Débutant │
│ [Base]◔ Découverte         │           │ [Base]◔ …        │ │ [Base]◔ …        │ │ …                │
│ [Flyer]◑ Débutant          │           └──────────────────┘ └──────────────────┘ └──────────────────┘
│ ⤒ Peut commencer… (Oui)    │
│ …                          │
└────────────────────────────┘
```

À 320 px, la carte (288 px) laisse ≈ 140 px au nom : « Hand-to-Hand (L-base) » passe sur trois lignes, sans débordement (`overflow-wrap: anywhere`, règle existante). La vignette s'aligne en haut ; la ligne du haut est aussi haute que le plus grand des deux.

## 2. Page d'une pose (`/poses/:id`)

### Ordre du contenu

1. **Ciel** (inchangé) ;
2. **corps**, en tête : **section « Photos de <pose> »** (`section.pose-photos`) : la **photo principale seule**, précédée de la note de sécurité, suivie du lien « Voir les 2 autres photos » quand il y en a d'autres ; présente si la pose a une photo, ou si la personne est validateur ou administrateur ; absente sinon, sans vide ;
3. bloc des étiquettes de la pose (story 9a) ;
4. actions « Proposer une transition depuis … » / « Proposer une modification » ;
5. légende de l'échelle (et note de sécurité quand la pose n'a pas de photo), sections de transitions ;
6. **section « Autres photos de <pose> »** (`section.pose-other-photos`, cible du lien), **dernière de la page**, quand la pose a au moins 2 photos.

Détail par situation (visiteur, validateur ; 0, 1, 2 à 5 photos) : `galerie-photos.md`, « Ce qui apparaît, et où ».

### Visiteur, Bird avec 3 photos (320 px)

```
┌────────────────────────────────┐
│ ciel (inchangé)                │
│ ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿ │
└────────────────────────────────┘
Photos de Bird                          h2, Unbounded 500, size.lg
┌────────────────────────────────┐      note de sécurité (sunSurface, icône spot sunStrong)
│(!) Tu restes juge de tes       │
│    limites. Les chutes arrivent│
│    surtout pendant les         │
│    transitions : apprends-les  │
│    avec un spotter.            │
└────────────────────────────────┘      spacing.md
┌────────────────────────────────┐      photo principale, 4:3, entière
│                                │
│        Bird vue de profil      │
│                            (🔍)│      pastille loupe 44 px
└────────────────────────────────┘
Photo : Léa Martin                      size.sm, textMuted ; spacing.xs au-dessus
Voir les 2 autres photos ⌄              lien interne, primary souligné, semibold, 44 px
┌────────────────────────────────┐
│ ▸ Ce que veulent dire les      │      bloc des étiquettes (9a), inchangé
│   étiquettes de la pose        │
…  actions, légende de l'échelle (sans note de sécurité), transitions depuis / vers Bird
                                        spacing.lg (écart du corps)
Autres photos de Bird                   h2, dernière section de la page (id="autres-photos")
┌──────────────┐ ┌──────────────┐      cellules carrées, photo contenue
│▒▒▒┌──────┐▒▒▒│ │▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
│▒▒▒│ 3:4  │▒▒▒│ │┌────────────┐│
│▒▒▒│      │▒▒▒│ ││    4:3     ││
│▒▒▒└──────┘(🔍)│ │└────────────┘(🔍)│
└──────────────┘ └──────────────┘
Photo : Hugo      Photo : Lulu Acro
Bernard
```

Libellé du lien : « Voir l'autre photo » (2 photos), « Voir les 2 autres photos » à « Voir les 4 autres photos ». Une pose à **une** photo : ni lien ni section du bas. Le saut est immédiat (pas de défilement animé) ; l'agrandissement parcourt toujours **toutes** les photos (« Photo 2 sur 3 de Bird » depuis la première cellule du bas).

### Grand écran (≥ 64em)

Les deux sections occupent toute la largeur du corps (`grid-column: 1 / -1`). En haut : la photo principale (2 fractions) et, **à côté**, la note de sécurité (1 fraction), alignées en haut ; le lien sous la photo, dans sa colonne. En bas, après les transitions (qui restent côte à côte) : la grille des autres photos sur **4 colonnes**.

```
Photos de Bird
┌──────────────────────────────────────────────┐   ┌──────────────────────────┐
│                                              │   │(!) Tu restes juge de tes │
│              Bird vue de profil              │   │    limites. Les chutes…  │
│                                          (🔍)│   └──────────────────────────┘
└──────────────────────────────────────────────┘
Photo : Léa Martin
Voir les 2 autres photos ⌄
…
Transitions depuis Bird            Transitions vers Bird
…                                  …
Autres photos de Bird
┌──────────┐ ┌──────────┐
│▒[3:4 ]▒▒▒│ │[  4:3   ]│      (2 autres photos sur 4 colonnes : la rangée reste à gauche)
└──────────┘ └──────────┘
```

Entre 40em et 64em : comme le téléphone (note au-dessus de la photo, grille du bas sur 2 colonnes), la photo principale pleine largeur (jusqu'à 560 px de haut).

### Visiteur, pose sans photo

Aucune section, ni en haut ni en bas : le corps commence par le bloc des étiquettes, ou par les actions ; la note de sécurité reste sous la légende.

### Validateur

Pose sans photo : titre, « Reverse Bird n'a pas encore de photo. » (`textMuted`), « Ajouter une photo » (lien-bouton secondaire, icône plus, 44 px, largeur du contenu).

**En haut**, sous la photo principale : le crédit, le repère **« Photo principale (vignette du catalogue) »** (pilule `sunSurface`, icône soleil), le **pied de gestion de la photo** (pointillé : « Modifier », « Retirer »), puis le lien « Voir les … autres photos ».

**En bas** (section « Autres photos de Bird ») : chaque autre photo avec son crédit et son pied (« Choisir comme photo principale », « Modifier », « Retirer ») ; puis le **pied de la section** (pointillé) : « Ajouter une photo » et « 3 photos sur 5 » (toutes les photos comptent) ; à 5 : « Bird a déjà 5 photos, le maximum. Retire une photo pour en ajouter une autre. » en `textMuted`, sans bouton.

**Une seule photo** : pas de lien ni de section du bas ; le pied de la section ferme la section du haut, juste sous le pied de la photo principale (« Ajouter une photo », « 1 photo sur 5 »). Proposé parce que c'est l'endroit où le validateur vient de regarder la seule photo, et qu'une section du bas qui ne contiendrait qu'un bouton serait à la fois loin et vide. Règle générale : **le pied de la section suit la dernière photo présentée**.

```
320 px, Bird, 1 photo                     320 px, Bird, 5 photos (haut, puis bas de page)
Photos de Bird                            Photos de Bird
(note de sécurité)                        (note de sécurité)
┌──────────────────────────┐              ┌──────────────────────────┐
│   Bird vue de profil (🔍)│              │   Bird vue de profil (🔍)│
└──────────────────────────┘              └──────────────────────────┘
Photo : Léa Martin                        Photo : Léa Martin
(☀ Photo principale (vignette…))          (☀ Photo principale (vignette…))
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄              ┌────────────────────────┐ confirmation sur place
[ Modifier ] [ Retirer ]                  │ Retirer cette photo de │
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  pied de     │ Bird ?                 │
[ + Ajouter une photo ]       section     │ La photo suivante      │
1 photo sur 5                             │ deviendra la photo     │
                                          │ principale et la       │
                                          │ vignette du catalogue. │
                                          │ [  Retirer la photo  ] │ secondaire, sans rouge
                                          │ [      Annuler       ] │
                                          └────────────────────────┘
                                          Voir les 4 autres photos ⌄
                                          … étiquettes, actions, légende, transitions
                                          Autres photos de Bird
                                          ┌──────────────────────────┐ 1 colonne < 40em
                                          │▒▒▒[ Bird vue de face ]▒▒▒│
                                          └──────────────────────────┘
                                          Photo : Hugo Bernard
                                          ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
                                          [ Choisir comme photo principale ]
                                          [ Modifier ] [ Retirer ]
                                          … (photo 3 : « Modifier la photo » à la place du pied)
                                          … (photos 4 et 5)
                                          ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ pied de section
                                          Bird a déjà 5 photos, le maximum.
                                          Retire une photo pour en ajouter
                                          une autre.
```

Grille du validateur (section du bas) : 1 colonne sous 40em, 2 de 40 à 64em, 3 au-delà (retenu le 2026-11-20). Les zones de modification et de retrait restent dans la cellule de leur photo, sous elle ; leurs boutons passent en ligne quand la zone dépasse 22em. Choisir une autre photo principale la fait monter en haut ; l'ancienne descend en tête de la grille du bas.

Après un ajout : retour en haut de la page de la pose, annonce « Photo ajoutée à Throne. » (`annonce-statut.md`) ; aucun bandeau de succès (la photo est la preuve).

## 3. Page « Ajouter une photo de Throne » (`/poses/:id/ajouter-une-photo`)

Mise en page des formulaires de proposition : colonne `sizes.formWideMaxWidth` (640, pour l'aperçu), sur le fond de page à 320 px, dans un panneau `surface` (contour `divider`, rayon `lg`, padding `xl`) à partir de 40em. Écart entre blocs `spacing.lg`.

```
320 px, vide                              320 px, photo choisie
‹ Throne                                  ‹ Throne                       lien-retour.md (proposé : vers la pose)
Ajouter une photo de Throne               Ajouter une photo de Throne    h1
Tous les champs sont obligatoires.        Tous les champs sont…          introduction (proposée), textMuted
                                          
Photo                                     Photo
JPEG, PNG, WebP ou HEIC, au moins         JPEG, PNG, WebP ou HEIC…        aide (proposée)
800 pixels sur le plus petit côté.        ┌──────────────────────────┐
[ (▣) Choisir une photo ]                 │▒▒▒▒▒▒┌────────┐▒▒▒▒▒▒▒▒▒▒│   aperçu entier, photoMat
                                          │▒▒▒▒▒▒│ Throne │▒▒▒▒▒▒▒▒▒▒│   ≤ 560 px de haut
Texte alternatif                          │▒▒▒▒▒▒│  2:3   │▒▒▒▒▒▒▒▒▒▒│
┌──────────────────────────┐              │▒▒▒▒▒▒└────────┘▒▒▒▒▒▒▒▒▒▒│
│                          │              └──────────────────────────┘
└──────────────────────────┘              throne-profil.jpg · 2,8 Mo ·
Décris la pose pour qui ne voit pas       2000 × 3000 pixels
la photo : ce que font la base et le      [ Changer de photo ]
flyer. Inutile d'écrire « Photo de ».     
Si la pose a plusieurs photos, précise    Texte alternatif …
l'angle (vue de côté, détail des prises). 
Exemple : Bird : la base, allongée sur
le dos, a les pieds sur les hanches du
flyer, face au sol à l'horizontale,
bras écartés.
                               0 / 200
Crédit
[                          ]
Le nom de la personne qui a pris la
photo, présenté sous elle : « Photo :
Léa Martin ». Si tu l'as prise toi-même,
écris ton nom.
                               0 / 100
┌──────────────────────────┐
│ ☐ Je confirme que l'auteur│               case-confirmation.md
│   de la photo a autorisé  │
│   … reconnaissable.       │
└──────────────────────────┘
AcroFunJam garde ta confirmation avec
la photo (ton compte et la date).
[      Ajouter la photo      ]              primaire, pleine largeur < 40em
[          Annuler           ]              secondaire
```

### Erreurs

Alerte de formulaire (`alerte-formulaire.md`) en tête du formulaire pour les incidents (injoignable, session expirée) ; erreurs de champ sous chaque champ (`champ.md`) : photo (contour 2 px `danger` sur le bouton ou l'aperçu, voir `champ-photo.md`), texte alternatif, crédit, case des droits (contour 2 px `danger` de la tuile). La saisie est toujours gardée, case comprise.

### Pendant l'envoi

Au-dessus des actions, la **barre de progression** (`barre-progression.md`) : « Envoi de la photo » + « 42 % », puis « Préparation de la photo… » (indéterminée). Le bouton primaire devient « Envoi de la photo… » (`aria-disabled`, mêmes couleurs) ; « Annuler » devient « Annuler l'envoi » (secondaire). Les champs restent affichés tels quels (ni grisés ni masqués).

### Abandon

« Annuler » avec une saisie : les actions sont **remplacées** par une zone de confirmation (fond `background` dans le panneau `surface` à partir de 40em, fond `surface` + contour `divider` à 320 px ; rayon `radius.md`, padding `spacing.md`) : « Abandonner cette photo ? Ta saisie sera perdue. » (`semibold`), puis « Abandonner » et « Continuer l'ajout », **deux secondaires de poids égal** (`bouton.md`, « Choix de poids égal »), empilés sous 40em.

### Grand écran

Panneau de 640 px centré ; actions en ligne (largeur du contenu) ; l'aperçu garde toute la largeur de la colonne, plafonné à 560 px de haut (un portrait 2:3 fait alors ≈ 373 px de large, centré sur le passe-partout).

## 4. Agrandissement (dialogue)

`dialogue-agrandissement.md`. Téléphone : plein écran, `surface` ; en-tête « Photo 2 sur 3 de Bird » + « Fermer » (44 px, icône croix) ; scène `photoMat` qui prend toute la hauteur restante, photo entière ; « Photo : Hugo Bernard » ; « Photo précédente » et « Photo suivante » empilées, la seconde désactivée sur la dernière photo (et inversement). Le dialogue parcourt toutes les photos, quelle que soit la section d'où on l'ouvre. Grand écran : panneau `radius.lg` centré, `contentMaxWidth`, hauteur de la fenêtre moins `2 × spacing.xl`, sur le voile `scrim` ; pied en ligne (crédit à gauche, boutons à droite).

## Accessibilité visuelle

| Couple | Aube | Nuit |
|---|---|---|
| `textMuted` (crédit, repère « 2 photos sur 5 », phrase du maximum) sur `background` / `surface` | 6,3 / 7,0:1 | 7,9 / 7,3:1 |
| `primary` (lien « Voir les 2 autres photos ») sur `background` | 6,4:1 | 8,9:1 |
| `text` sur `sunSurface` (repère « Photo principale ») | 13,9:1 | 11,1:1 |
| `text` / `textMuted` sur `photoMat` (aperçu indisponible) | 13,2 / 5,7:1 | 12,0 / 6,1:1 |
| `primary` sur `surfaceHover` (remplissage de la barre) | 5,9:1 | 7,1:1 |
| `border` (pastille loupe, boutons, tuile) sur `surface` | 3,4:1 | 3,4:1 |
| `danger` (contours et messages d'erreur) sur `surface` / `background` | 6,6 / 5,9:1 | ≥ 7,9 / 9,3:1 |
| `selected` sur `selectedSurface` (case cochée) | 7,8:1 | 8,6:1 |
| `focus` (anneau autour d'une photo, sur le fond de page) | 5,2:1 | 9,9:1 |

Rien ne repose sur la couleur seule : photo principale = repère écrit ; nombre de photos = phrase écrite ; progression = pourcentage et libellé écrits ; erreur = icône + texte + contour 2 px ; case cochée = coche + contour 2 px.

## Check-list visuelle pour l'implémentation

- Variables CSS nouvelles : `--afj-color-photo-mat`, `--afj-color-scrim`, `--afj-size-thumbnail`, `--afj-size-photo-max-height`, `--afj-size-progress` (produites par `toCssVariables`, sans changement de code).
- Classes proposées : `.pose-card__thumbnail` ; `.pose-photos`, `.pose-photos__lead`, `.pose-photos__more` (lien vers le bas), `.pose-other-photos` (section du bas), `.pose-photos__grid`, `.pose-photos__grid--manage`, `.pose-photos__manage`, `.pose-photos__count`, `.pose-photos__empty` ; `.pose-photo`, `.pose-photo--main`, `.pose-photo__enlarge`, `.pose-photo__zoom`, `.pose-photo__credit`, `.pose-photo__main-mark`, `.pose-photo__actions`, `.pose-photo__zone` ; `.photo-viewer` (+ `__header`, `__stage`, `__footer`, `__nav`) ; `.photo-field` (+ `__choose`, `__preview`, `__summary`, `__unavailable`) ; `.confirm-box` ; `.progress`.
- `img` : `width` / `height` de l'API, `object-fit: contain`, fond `photoMat`. Jamais `object-fit: cover`.
- Un seul primaire au repos sur la page d'une pose ; la page d'ajout : « Ajouter la photo ».
- 320 px et zoom 400 % : nom de fichier, crédit de 100 caractères et libellés passent à la ligne ; aucun défilement horizontal (1.4.10) ; la grille du validateur est à 1 colonne.
- `forced-colors: active` : contours `CanvasText` (photos, pastille loupe, repère, zones, dialogue, tuile) ; les images restent affichées.
- Aucune animation, sauf le segment de la barre indéterminée, figé sous `prefers-reduced-motion: reduce`.
- Icônes nouvelles (`Icon.tsx`) : `zoom` (loupe), `close` (croix), `chevronRight`, `photo` (cadre, soleil sur l'horizon), `sun` (soleil, repère « Photo principale »).

## Décisions du 2026-11-20 (porteur du produit)

1. **Photo principale seule en haut**, autres photos dans « Autres photos de Bird » en bas de page, atteintes par « Voir les 2 autres photos » / « Voir l'autre photo » ; rien en bas pour une pose à une photo.
2. **Note de sécurité** déplacée dans la section de la photo principale quand la pose a une photo (avant la photo sur téléphone, à côté sur grand écran), sans répétition sous la légende.
3. **Vignette** gardée à l'essai, à juger avec de vraies photos ; marges **transparentes** dans la vignette générée (à reporter dans l'ADR 0039).
4. **Dialogue** : « Photo précédente » / « Photo suivante » toujours présents, désactivés aux extrémités ; pas de bouclage.
5. **Grille du validateur** (section du bas) à 1 / 2 / 3 colonnes.

## Questions

1. **Pied de la section pour une pose à une photo** : sous le pied de la photo principale, en haut (proposé), plutôt qu'une section du bas réduite à un bouton ?
2. **Libellés proposés** : « Voir l'autre photo » / « Voir les 2 autres photos » (formulation du porteur, à confirmer par l'`ux-expert` avec le nom accessible) ; « 1 photo sur 5 » ; aide du champ Photo « JPEG, PNG, WebP ou HEIC, au moins 800 pixels sur le plus petit côté. » ; « Agrandir la photo 2 de Bird » ; « Modifier la photo » (titre de zone) ; « Enregistrer la photo » ; « Enregistrement… » ; « Retrait… » ; introduction « Tous les champs sont obligatoires. » ; aperçu indisponible « Ton navigateur ne sait pas afficher cette photo HEIC. AcroFunJam la vérifiera après l'envoi. » ; lien retour « Throne ».
