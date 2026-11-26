# Principes visuels d'AcroFunJam : « Soleil et Lune »

**Statut : accepté le 2026-11-13 ([ADR 0031](../adr/0031-direction-visuelle-soleil-et-lune.md)).** Seule source des valeurs : `front/packages/ui-tokens/src/index.ts`. Ce document explique les rôles et les choix ; il ne duplique les valeurs que pour les rendre lisibles. Référence visuelle : `maquettes/soleil-lune/` (maquette et captures clair / sombre).

## Intention

L'acroyoga mêle une pratique **solaire** (acrobatique : l'élan, le vol) et une pratique **lunaire** (thérapeutique : le calme, l'écoute). Le thème clair est **l'aube**, le thème sombre **la nuit** ; il suit le réglage du système (`prefers-color-scheme` sur le web, `useColorScheme` sur le mobile), sans bascule dans le produit.

L'interface reste au service des pratiquants, souvent sur téléphone, parfois en séance (écran posé sur le tapis, lumière extérieure) :

- **lisible d'abord** : contrastes AA vérifiés par un test, rien sous 14 px, cibles de 44 px ;
- **les rôles se reconnaissent partout** : la base porte la couleur de la terre, le flyer celle du ciel ;
- **la difficulté se lit comme le ciel** : en phases de lune ;
- **un seul moment spectaculaire** : l'en-tête de la page d'une pose ; tout le reste est sobre, en particulier la file de validation, qui est un écran de travail.

## Palettes

Les noms sont des **rôles**. Mêmes clés en clair (`colors`) et en sombre (`colorsDark`).

| Rôle | Aube (clair) | Nuit (sombre) | Usage |
|---|---|---|---|
| `background` | `#F5F2FA` brume | `#110F24` | fond de page |
| `surface` | `#FFFFFF` | `#1A1733` | cartes, panneaux de formulaire |
| `surfaceHover` / `disabledSurface` | `#EDE8F7` | `#252148` | survol neutre, boutons discrets de l'en-tête, « Non » d'une borne de flow |
| `text` / `badge` | `#211C3B` nuit | `#ECE8F8` | texte, titres ; fond de la pastille de compteur |
| `textMuted` | `#5B5577` | `#ABA4C8` | texte secondaire |
| `border` | `#8F87A8` | `#6F6896` | contour des **contrôles** |
| `divider` | `#DCD5EA` | `#322D57` | séparateurs et contours **décoratifs** |
| `primary` / `primaryHover` / `primaryActive` | `#5B3FC4` / `#47309F` / `#38267E` crépuscule | `#B6A6FF` / `#CDC2FF` / `#E0D9FF` | action principale, liens |
| `primaryContrast` / `badgeContrast` | `#FFFFFF` | `#15122B` | texte sur le primaire, chiffres de la pastille |
| `focus` / `info` | `#1D69AE` | `#8FC1F3` | anneau de focus, information |
| `infoSurface` | `#DFEAFA` | `#13283F` | bandeaux d'information |
| `danger` / `dangerSurface` | `#B42318` / `#FDECEA` | `#FF9C8F` / `#3A1714` | erreurs (jamais en fond plein) |
| `success` / `successSurface` | `#2C6A4C` / `#DCEFE3` | `#82CDA2` / `#163024` | confirmations |
| `selected` / `selectedSurface` | `#47309F` / `#EBE5FB` | `#CDC2FF` / `#2A2456` | choix coché d'un groupe neutre (Oui / Non, cases d'étiquettes), marque « Modifiée » : famille du primaire |
| `base` / `baseSurface` | `#2C6A4C` / `#DCEFE3` terre | `#82CDA2` / `#163024` | rôle **Base** |
| `flyer` / `flyerSurface` | `#1D69AE` / `#DFEAFA` ciel | `#8FC1F3` / `#13283F` | rôle **Flyer** |
| `sun` | `#E8961E` | `#F5C15A` | **décoratif seulement** : logo, astre, éclat du succès |
| `sunStrong` | `#A15C00` | `#F5C15A` | icônes porteuses de sens : bornes de flow, trajectoires, note de sécurité |
| `sunSurface` | `#FFEBC4` | `#3A2E14` | note de sécurité (« spotter »), avatar, « Oui » d'une borne de flow |
| `skyText` | `#211C3B` | `#F3F0FF` | texte sur le ciel de la page d'une pose |
| `tagSurface` | `#F2EFEA` pierre | `#2A2733` | fond de la **pilule d'étiquette** (lecture seule), story 8 |
| `tagBorder` | `#CFC8BD` | `#4D4858` | contour **décoratif** de la pilule d'étiquette (jamais un contrôle) |
| `photoMat` | `#E9E6EF` | `#2A2833` | **passe-partout** des photos (story 10) : fond neutre sur lequel une photo est contenue, jamais recadrée |
| `scrim` | `#211C3B` à 72 % (`#211C3BB8`) | `#05040E` à 80 % (`#05040ECC`) | voile derrière le dialogue d'agrandissement (`::backdrop`) ; décoratif, rien n'est écrit dessus |

Le ciel (`sky` / `skyDark`) : dégradé (aube : `#FFE1A0` → `#FBC0A4` → `#D3C1F1` → `#A797E6` ; nuit : `#2E2670` → `#211C55` → `#151233`), astre (soleil / lune en dégradé radial), halo et opacité du grain. Ce sont les seules couleurs écrites hors palette ; le mobile peut les ignorer.

## Rôles codés par la couleur, le mot toujours écrit

- **Pastille de rôle** (`composants/pastille-role.md`) : le mot de la pastille « Base » (terre) ou « Flyer » (ciel), la phase de lune, le niveau en toutes lettres. Sur les cartes de pose, la page d'une pose, les transitions, la file de validation, « Mes propositions ».
- **Tuiles de difficulté** : cochée = fond et bordure 2 px de la couleur du rôle du groupe ; un point de la couleur du rôle devant la légende.
- La couleur n'est **jamais seule** : le mot « Base » / « Flyer » est écrit, le niveau aussi ; la bordure épaissie marque le choix.

## Vocabulaire : « étiquette » a un seul sens

Depuis la story 8 (Q161), **« étiquette » désigne uniquement l'étiquette métier** d'une transition ou, depuis la story 9a, d'une pose (« pop », « lunaire »…). Les éléments d'interface qui portaient ce nom sont renommés : la **marque « Modifiée »** (`composants/marque-modifiee.md`, anciennement « étiquette « Modifiée » ») et le **mot de la pastille** de rôle (« Base » / « Flyer »). Le code suivra à l'implémentation (`modified-tag`, `role-pill__tag`).

## Étiquettes des transitions (story 8)

Trois formes, qui ne se confondent ni entre elles ni avec les pastilles de rôle :

| Forme | Où | Rendu |
|---|---|---|
| **Pilule d'étiquette** (`composants/pilule-etiquette.md`) | page d'une pose, file de validation, « Mes propositions », page « Étiquettes » | lecture seule : fond `tagSurface` « pierre », contour décoratif `tagBorder`, texte `text` 14 px ; pas de mot de la pastille, pas de couleur de rôle, pas d'icône |
| **Case en pastille** (`composants/groupe-cases-pastilles.md`) | formulaire de transition, zone « Étiqueter », zone d'ajustement | vraie case à cocher, pilule de 44 px ; cochée : coche + bordure 2 px `selected` + fond `selectedSurface` + libellé semi-gras |
| **Mot dans une phrase** | récapitulatif des ajustements | texte simple, « aucune → dynamique, pop » (on compare des mots) |

La pierre est le seul neutre **chaud** de la palette : elle sépare les étiquettes (qualités du mouvement) des rôles (terre, ciel), du choix (famille du primaire) et des boutons discrets (`surfaceHover`, violet froid).

**Story 9a, étiquettes des poses** (`ecrans/9a-etiquettes-des-poses.md`) : les mêmes trois formes, sans nouveau token. Les étiquettes d'une pose et celles de ses transitions sont indépendantes ; on les distingue par **la place** (ciel et tête du corps pour la pose, élément de transition pour la transition) et **les mots** (« … les étiquettes de la pose »), jamais par la couleur. Sur le ciel, la pilule reste opaque et le terme « Étiquettes » est en `skyText` (`textMuted` y tomberait à 2,7:1). Le champ d'application d'une étiquette se dit en toutes lettres (« S'applique aux poses et aux transitions »), jamais par une icône ou une couleur.

## Le fil d'un flow (story 9)

Un flow généré se lit comme une course du soleil : **lever** à la pose de départ, **stations** pour les poses intermédiaires, **coucher** à la dernière pose, reliés par un **rail** pointillé `sunStrong` (la trajectoire, à la verticale) ; chaque transition est une carte entre deux stations. Les icônes et le rail sont des renforts : « Départ : », « Vers » et « Étape 1 · » portent le sens. Une washing machine est dite par la boucle **et le mot** « washing machine », jamais par une pilule d'étiquette. Aucun nouveau token ; nouvelle icône `station`. Détail : `composants/fil-du-flow.md`, écran `ecrans/9-generer-un-flow.md`.

## Les photos des poses (story 10)

Une photo montre une pose **tenue, entière** (charte des photos) : l'interface ne la coupe jamais. Toute photo est **contenue** dans son cadre, et le reste du cadre est le **passe-partout** `photoMat`, un gris froid neutre qui ne teinte pas la photo (ni violet, ni chaud). Une pose verticale (Throne) garde la tête du flyer et les pieds de la base, même dans la vignette carrée du catalogue.

- **Vignette** (`carte-pose.md`) : carré `sizes.thumbnail` (80), rayon `sm`, à côté du nom ; décorative ; rien sans photo.
- **Page d'une pose** (`composants/galerie-photos.md`) : la photo principale seule en tête du corps, hors du ciel (hauteur au plus `sizes.photoMaxHeight`, 560), avec la note de sécurité ; les autres en cellules carrées dans « Autres photos de <pose> », tout en bas de la page ; « Photo : Léa Martin » sous chaque photo en `textMuted`. Le ciel reste le seul moment spectaculaire : aucune photo n'y entre, aucune ombre ni effet sur les photos.
- **Photo principale** : repère « Photo principale (vignette du catalogue) » pour les validateurs, en pilule `sunSurface` avec l'icône **soleil** (la lumière principale de la pose).
- **Agrandissement** (`composants/dialogue-agrandissement.md`) : `<dialog>` sur le voile `scrim`, la photo sur le passe-partout.
- **Ajout** (`composants/champ-photo.md`, `case-confirmation.md`, `barre-progression.md`) : aperçu entier sur le passe-partout, progression de l'envoi en `primary` sur `surfaceHover`.

Détail : `ecrans/10-photos-des-poses.md`.

## Pied de page et pages de lecture (story « Mentions légales et confidentialité »)

Un **pied de page** discret ferme toutes les pages, en bas de la fenêtre même sur une page courte : filet `divider`, texte `sm`, liens soulignés `primary`, « Contact : » en `textMuted` (`composants/pied-de-page.md`). Les **pages légales** sont des pages de lecture : texte sur le fond de page, colonne de 70 caractères (`sizes.readingMaxWidth`) alignée à gauche, hiérarchie par la typographie seule ; un seul encadré, « En bref » sur `surface` (`composants/encadre-en-bref.md`). Aucune nouvelle couleur. Détail : `ecrans/informations-legales.md`.

## Difficulté en phases de lune

| Niveau | Phase |
|---|---|
| Découverte | croissant |
| Débutant | demi-lune |
| Intermédiaire | gibbeuse |
| Avancé | pleine lune |

Les phases sont décoratives (`aria-hidden`), toujours à côté du niveau écrit ; une différence de **forme**, jamais une couleur par niveau (la couleur est celle du rôle). Composant `DifficultyMoon`, `composants/legende-echelle.md`.

## Bornes de flow

« Peut commencer un flow » : **lever** de soleil ; « Peut terminer un flow » : **coucher**, en `sunStrong`, suivis de « Oui » dans une petite pilule `sunSurface`. Quand c'est « Non » : la question barrée, en `textMuted`, et « Non » écrit dans une pilule `surfaceHover`. Les libellés validés ne changent pas ; le barré et la couleur ne sont que des renforts.

## Formes et rayons

Rayons différents selon la hiérarchie (`radius.*`) : `sm` 10 (petites zones dans une carte : récapitulatifs), `md` 16 (champs, tuiles, éléments de transition, alertes, note de sécurité), `lg` 26 (cartes de pose, cartes de proposition, panneaux, en-tête du ciel), `pill` (boutons, pastilles de rôle, pastille de compteur, marque « Modifiée », pilules et cases d'étiquettes, avatar).

Boutons en pilule : primaire plein, secondaire à contour `border`, discret (fond `surfaceHover`, sans contour) dans l'en-tête. Hauteurs : 44 px minimum, 48 px pour les actions principales.

## Icônes

Dessinées dans le dépôt (`Icon.tsx`, `currentColor`, `aria-hidden`) : erreur, information, coche, tiret, plus, flèche, horloge, chevrons, et pour cette direction **lever** / **coucher** (bornes de flow), **trajectoire** en pointillés (une transition est un vol), **boucle** (washing machine), **spot** (note de sécurité), **éclat** de soleil (succès). Story 10 : **loupe** (agrandir), **croix** (fermer), **chevron droit** (photo suivante), **photo** (un cadre où un soleil se lève sur l'horizon : choisir une photo, aperçu indisponible), **soleil** (repère « Photo principale »). Le logo : un demi-cercle de terre qui porte un soleil (`Logo.tsx`). Les **glyphes de pose** ne sont pas livrés : un emplacement est réservé sur la carte.

## Typographie

Deux familles **auto-hébergées** (licence OFL, aucune requête vers un tiers) :

- **Unbounded** (affichage : titres, noms de poses, nom de la marque) : 500, 600, 700 ; pile de repli `"Trebuchet MS", "Segoe UI", system-ui, sans-serif` ;
- **Figtree** (texte) : 400, 600, 700 ; pile de repli `system-ui, -apple-system, "Segoe UI", Roboto, …`.

Web : `@fontsource/unbounded`, `@fontsource/figtree` (servies par le site, `font-display: swap`). Mobile : `expo-font` avec `@expo-google-fonts/*` (fichiers embarqués dans l'app), une famille par graisse (`typography.fontFamilies`).

| Niveau | Taille | Famille, graisse |
|---|---|---|
| Nom d'une pose sous le ciel | `xxl` 40 → `display` 64 (≥ 40em) → `displayLarge` 96 (≥ 64em) | Unbounded 700, interlettrage −0,04em |
| Titre du catalogue | `xl` 28 → `xxl` 40 (≥ 40em) | Unbounded 600 |
| Titre de page (`h1`) | `xl` 28 | Unbounded 600 |
| Nom sur une carte, titre de section | `lg` 20 | Unbounded 600 / 500 |
| Texte, champs, boutons | `md` 16 | Figtree 400 / 600 |
| Texte secondaire | `sm` 14 | Figtree |
| Mot d'une pastille de rôle | `xs` 12 | Figtree 700 (seule exception sous 14 px : un mot répété, toujours lisible à côté du niveau en 14 px) |

Tailles en `rem` côté web.

## Le moment spectaculaire : l'en-tête de la page d'une pose

Le nom de la pose en très grand sous un **ciel** en dégradé ; l'**astre** (soleil à l'aube, lune la nuit) se lève au chargement ; un **grain** léger ; un **horizon** ondulé ferme le ciel. Le lien « Catalogue », le nom, les pastilles de rôle et les bornes de flow sont sur le ciel, en `skyText`.

- Le texte ne passe **jamais sur l'astre** : sur téléphone, l'astre reste dans le coin supérieur droit, au-dessus du titre ; sur grand écran (≥ 64em), le texte s'arrête avant lui.
- `skyText` est vérifié contre **chaque arrêt** du dégradé (≥ 6,3:1 à l'aube, ≥ 11,5:1 la nuit) ; l'anneau de focus prend la couleur `skyText` sur le ciel.
- **Mouvement réduit** : sous `prefers-reduced-motion: reduce`, l'astre est en place, sans animation.
- **Couleurs forcées** : ciel, astre, grain et horizon disparaissent ; le bloc garde un contour `CanvasText`, les liens `LinkText`.

Ailleurs, aucune animation : seul le survol change des teintes et l'ombre d'une carte.

## Contrastes (recalculés par `front/packages/ui-tokens/src/contrast.test.ts`)

Texte (seuil 4,5:1) :

| Texte | Fond | Aube | Nuit |
|---|---|---|---|
| `text` | `background` / `surface` / `surfaceHover` | 14,7 / 16,2 / 13,5 | 15,6 / 14,4 / 12,6 |
| `textMuted` | `background` / `surface` / `surfaceHover` | 6,3 / 7,0 / 5,8 | 7,9 / 7,3 / 6,4 |
| `textMuted` | `sunSurface` | 6,0 | **5,6** |
| `primaryContrast` | `primary` / `primaryHover` / `primaryActive` | 7,1 / 9,6 / 12,0 | 8,6 / 11,1 / 13,5 |
| `primary` (lien) | `background` / `surface` | 6,4 / 7,1 | 8,9 / 8,1 |
| `base` | `baseSurface` | 5,4 | 7,6 |
| `flyer` | `flyerSurface` | **4,7** | 7,9 |
| `surface` (mot de la pastille de rôle) | `base` / `flyer` | 6,4 / 5,7 | 9,2 / 9,1 |
| `text` / `textMuted` | `tagSurface` (pilule d'étiquette) | 14,1 / 6,1 | 12,2 / 6,2 |
| `text` | `baseSurface` / `flyerSurface` / `sunSurface` / `selectedSurface` | 13,5 / 13,4 / 13,9 / 13,2 | 11,8 / 12,5 / 11,1 / 11,8 |
| `danger` | `background` / `dangerSurface` | 5,9 / 5,8 | 9,3 / 7,9 |
| `success` / `info` | `successSurface` / `infoSurface` | 5,4 / **4,7** | 7,6 / 7,9 |
| `badgeContrast` | `badge` | 16,2 | 15,1 |
| `skyText` | chaque arrêt du ciel | 12,8 / 10,2 / 9,8 / 6,4 | 11,5 / 13,7 / 16,1 |
| `text` / `textMuted` | `photoMat` (aperçu indisponible) | 13,2 / 5,7 | 12,0 / 6,1 |

Contrôles et icônes porteuses de sens (seuil 3:1) :

| Élément | Fond | Aube | Nuit |
|---|---|---|---|
| `border` | `background` / `surface` | **3,06** / 3,4 | 3,7 / **3,4** |
| `focus` | `background` / `surface` | 5,2 / 5,7 | 9,9 / 9,1 |
| `sunStrong` | `background` / `surface` / `sunSurface` | 4,7 / 5,2 / 4,4 | 11,3 / 10,4 / 8,0 |
| `selected` | `selectedSurface` | 7,8 | 8,6 |
| `base` / `flyer` | `surface` | 6,4 / 5,7 | 9,2 / 9,1 |
| `primary` (remplissage d'une barre de progression) | `surfaceHover` (piste) | 5,9 | 7,1 |
| `textMuted` (icône photo) | `photoMat` | 5,7 | 6,1 |

`photoMat` et `scrim` sont décoratifs (aucun contrôle ne s'en sert de limite). `sun` à l'aube (2,2:1 sur `background`) est **décoratif** : jamais du texte ni une icône porteuse de sens (le test le vérifie). `divider` ne délimite jamais un contrôle.

## Règles d'usage

- **Une seule action principale** par écran (bouton primaire plein) ; les autres en secondaire.
- **Jamais la couleur seule** : rôle écrit, niveau écrit, « Oui » / « Non » écrits, erreur = icône + texte + contour épaissi, choix coché = bordure 2 px.
- **Danger jamais en fond plein** ; un refus de proposition n'est jamais en `danger`.
- **Focus distinct du survol** : anneau `focus` de 3 px décalé de 2 px, autour de la carte entière pour une carte cliquable, autour de la tuile pour une tuile.
- **Couleurs forcées** : pastilles, notes et cartes gardent un contour ; les décorations disparaissent.

## Espacements, tailles, points de rupture

Espacements (`spacing.*`, base 4) inchangés. Tailles (`sizes.*`) : cible 44, contrôle 48, phases de lune 18 (texte) / 24 (tuile), trajectoire 46 × 20, avatar 36, logo 30, astre 180 / 300, horizon 26, éclat 54, emplacement de glyphe 52, vignette 80, hauteur maximale d'une photo 560, barre de progression 8, mesure de lecture `readingMaxWidth` `'70ch'` (web seulement, en caractères pour suivre la taille de texte). Points de rupture : `md` 640 (40em), `lg` 1024 (64em). Catalogue : 1, 2 puis 3 colonnes ; page d'une pose : sections côte à côte à partir de 64em.

## Traduction côté web (ADR 0012)

`toCssVariables()` produit `:root { … }` (`--afj-color-*`, `--afj-sky-*`, `--afj-spacing-*`, `--afj-radius-*`, `--afj-size-*`, `--afj-font-*`), puis la redéfinition des couleurs et du ciel sous `@media (prefers-color-scheme: dark)`. Le CSS du site n'utilise que ces variables (stylelint interdit couleurs et longueurs en dur).

## Décisions

1. Direction « Soleil et Lune » (ADR 0031), remplace la terre cuite et la police système (décisions du 2026-11-03).
2. Ton : **tutoiement** ; tournures épicènes (inchangé).
3. Marque : logo (terre qui porte un soleil) + « AcroFunJam » en Unbounded.
4. Thème : suit le système, pas de bascule dans le produit.

## Hors périmètre

Glyphes des poses (emplacement réservé), illustrations. Les photos des poses sont entrées avec la story 10.
