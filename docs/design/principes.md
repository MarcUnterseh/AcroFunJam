# Principes visuels d'AcroFunJam

**Statut : proposition du 2026-11-03, à valider par le porteur du produit.** Seule source des valeurs : `front/packages/ui-tokens/src/index.ts`. Ce document explique les rôles et les choix ; il ne duplique pas les valeurs qu'en illustration.

## Intention

AcroFunJam sert des pratiquants d'acroyoga, souvent sur téléphone, parfois **en séance** : écran tenu à bout de bras ou posé au sol, lumière extérieure, mains occupées, attention partagée avec le partenaire. L'interface doit donc être :

- **lisible d'abord** : texte foncé sur fond clair, tailles généreuses, contrastes AA au minimum ;
- **chaleureuse et humaine** : une seule couleur d'accent, terre cuite, qui évoque le soleil des jams en extérieur et le contact entre partenaires ;
- **stable et digne de confiance** : peu d'éléments, des alignements nets, aucun déplacement brutal de mise en page (la confiance entre base et flyer passe aussi par une interface qui ne surprend pas) ;
- **équilibrée** : marges symétriques, une colonne centrale, une hiérarchie typographique à trois niveaux.

Le mouvement s'exprime par la sobriété du rythme (espacements réguliers) plutôt que par des animations : aucune animation n'est nécessaire dans la story 2b.

## Palette

Une couleur d'accent (primaire), des neutres, et trois couleurs de retour (danger, succès, info), chacune avec une surface claire associée. Les noms sont des **rôles**.

| Rôle (token `colors.*`) | Valeur | Usage |
|---|---|---|
| `primary` | `#C2410C` terre cuite | bouton principal, liens |
| `primaryHover` | `#9A3412` | survol du primaire |
| `primaryActive` | `#7C2D12` | primaire pressé |
| `primaryContrast` | `#FFFFFF` | texte sur primaire |
| `background` | `#FFFFFF` | fond de page |
| `surface` | `#F8F9FA` | en-tête, carte de formulaire (grand écran) |
| `surfaceHover` | `#F1F3F5` | survol d'un contrôle neutre |
| `text` | `#212529` | texte courant, titres |
| `textMuted` | `#5C636A` | aide sous un champ, adresse dans l'en-tête |
| `border` | `#868E96` | contour des **contrôles** (champs, bouton secondaire) |
| `divider` | `#DEE2E6` | séparateurs **décoratifs** uniquement |
| `focus` | `#1864AB` | anneau de focus clavier |
| `danger` / `dangerSurface` | `#C92A2A` / `#FFF5F5` | erreurs |
| `success` / `successSurface` | `#237032` / `#EBFBEE` | confirmations |
| `info` / `infoSurface` | `#1864AB` / `#E7F5FF` | informations (session expirée) |
| `disabledSurface` | `#E9ECEF` | fond d'un contrôle désactivé |
| `selected` | `#9A3412` brun terre cuite | bordure 2 px et radio d'un **choix coché** (tuile radio), story 3 |
| `selectedSurface` | `#FFF4E6` | fond d'un choix coché, story 3 |

### Ajouts de la story 3 (proposition du 2026-11-03)

- `selected` / `selectedSurface` : l'état coché d'une tuile reste dans l'identité (terre cuite) sans être confondu avec `danger` : `selected` est nettement plus sombre (luminance 0,094 contre 0,142) et plus brun que rouge. Même valeur que `primaryHover` aujourd'hui, mais rôle distinct : l'un peut évoluer sans l'autre.
- Aucune couleur par niveau de difficulté (ni vert, ni orange, ni rouge) : la difficulté est écrite en toutes lettres, avec une échelle à points de forme (pleins / vides) en renfort décoratif.
- Les cartes du catalogue réutilisent `surface` et `divider` : pas de nouvelle surface.

### Ajustements par rapport aux tokens initiaux

| Token | Avant | Après | Raison |
|---|---|---|---|
| `primary` | `#E8590C` | `#C2410C` | blanc sur `#E8590C` = **3,6:1**, insuffisant pour le libellé d'un bouton (16 px) |
| `textMuted` | `#6C757D` | `#5C636A` | `#6C757D` sur `surface` = **4,45:1**, juste sous le seuil (en-tête sur `surface`) |
| `success` | `#2B8A3E` | `#237032` | `#2B8A3E` sur blanc = **4,4:1** |

Aucun de ces trois tokens n'était utilisé par le code ; `background` et `text` (utilisés par le mobile) sont inchangés.

### Contrastes vérifiés (formule de luminance relative WCAG 2.x)

Texte (seuil 4,5:1) :

| Texte | Fond | Ratio |
|---|---|---|
| `text` | `background` | 15,4:1 |
| `text` | `surface` | 14,6:1 |
| `text` | `surfaceHover` | 13,9:1 |
| `text` | `divider` (bouton secondaire pressé) | 11,9:1 |
| `text` | `dangerSurface` / `infoSurface` | 14,4:1 / 13,9:1 |
| `textMuted` | `background` | 6,1:1 |
| `textMuted` | `surface` | 5,8:1 |
| `textMuted` | `disabledSurface` | 5,1:1 |
| `primaryContrast` | `primary` / `primaryHover` / `primaryActive` | 5,2:1 / 7,3:1 / 9,4:1 |
| `primary` (lien) | `background` / `surface` / `surfaceHover` | 5,2:1 / 4,9:1 / 4,65:1 |
| `primaryHover` (lien survolé) | `background` | 7,3:1 |
| `danger` | `background` / `surface` / `dangerSurface` | 5,5:1 / 5,2:1 / 5,1:1 |
| `success` | `background` / `successSurface` | 6,1:1 / 5,7:1 |
| `info` | `background` / `surface` / `infoSurface` | 6,1:1 / 5,8:1 / 5,5:1 |
| `text` | `selectedSurface` / `successSurface` | 14,2:1 / 14,4:1 |
| `textMuted` | `successSurface` / `infoSurface` / `selectedSurface` | 5,7:1 / 5,5:1 / 5,6:1 |

Composants et éléments graphiques (seuil 3:1) :

| Élément | Fond adjacent | Ratio |
|---|---|---|
| `border` (contour de champ) | `background` / `surface` | 3,3:1 / 3,2:1 |
| `danger` (contour d'un champ invalide) | `background` | 5,5:1 |
| `focus` (anneau, toujours séparé du composant par un écart de fond) | `background` / `surface` | 6,1:1 / 5,8:1 |
| `primary` (fond de bouton) | `background` | 5,2:1 |
| `selected` (bordure de tuile cochée, radio) | `background` / `surface` / `selectedSurface` | 7,3:1 / 6,9:1 / 6,7:1 |
| `border` (tuile au repos, point vide de l'échelle, bouton « Réessayer ») | `background` / `surface` / `dangerSurface` | 3,3:1 / 3,2:1 / 3,1:1 |
| `success` (icône du panneau de succès) | `successSurface` | 5,7:1 |
| `text` (point plein de l'échelle) | `surface` | 14,6:1 |

`divider` (1,3:1 sur blanc) est réservé aux séparateurs décoratifs ; il ne délimite jamais un contrôle.

### Règles d'usage

- **Une seule couleur d'accent.** Le primaire signale *l'action principale* d'un écran (un seul bouton primaire par formulaire) et les liens.
- **Jamais la couleur seule** : une erreur = icône + texte + contour épaissi ; un lien = couleur + soulignement ; un état actif = forme ou texte qui change.
- **Primaire et danger sont proches** (deux teintes chaudes). Pour ne pas les confondre : le danger n'apparaît jamais en fond plein (seulement en texte, icône, contour et barre d'accent sur `dangerSurface`), toujours accompagné de l'icône d'erreur ; le primaire n'apparaît jamais sur `dangerSurface`.
- **Focus distinct du survol** : le survol change la teinte de fond ; le focus ajoute un anneau bleu (`focus`) de `sizes.focusRingWidth` (3 px) décalé de `sizes.focusRingOffset` (2 px). Le bleu, absent du reste de l'interface hors bandeaux d'info, rend le focus repérable sur tous les composants, primaire compris.

## Typographie

**Choix : police système** (`typography.fontFamilyWeb` sur le web, `typography.fontFamily = 'System'` sur mobile).

Justification :
- aucun téléchargement : affichage immédiat sur un réseau mobile faible (salle, parc), pas de saut de texte au chargement ;
- aucune requête vers un tiers (pas de Google Fonts, rien à déclarer au titre du RGPD) ;
- polices conçues pour l'écran de chaque plateforme (San Francisco, Segoe UI, Roboto), avec de bons chiffres et accents ;
- même rendu d'intention sur le web et l'app native.

Alternative si l'on veut une identité plus marquée : **Atkinson Hyperlegible** (licence OFL, conçue pour la lisibilité par le Braille Institute), auto-hébergée, uniquement pour les titres. Voir les questions.

### Échelle

| Niveau | Token taille | Graisse | Interligne | Usage |
|---|---|---|---|---|
| Titre de page (`h1`) | `size.xl` (28) | `bold` | `tight` (1,25) | un par page |
| Titre de bloc / marque | `size.lg` (20) | `bold` | `tight` | titre de la zone d'alerte, nom « AcroFunJam » |
| Texte courant, champs, boutons | `size.md` (16) | `regular` / `semibold` (libellés, boutons) | `normal` (1,5) | tout le reste |
| Texte secondaire | `size.sm` (14) | `regular` | `normal` | aide sous un champ, adresse de l'en-tête |

Rien en dessous de 14 px. Les champs restent à 16 px (évite le zoom automatique d'iOS Safari). Tailles en `rem` côté web (16 px = 1 rem) pour suivre le réglage de taille de texte du navigateur.

## Espacements, rayons, tailles

- **Espacements** (`spacing.*`, base 4) : `xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 32, `xxl` 48 (ajout). Règle : `xs` entre une icône et son texte, `sm` entre un libellé et son champ, `md` entre les champs et entre éléments d'un même groupe, `lg` entre blocs et pour les marges de page en mobile, `xl`/`xxl` pour l'air autour du contenu en grand écran.
- **Rayons** (`radius.*`) : `sm` 4 (anneau de focus des liens, petites étiquettes), `md` 8 (champs, boutons, alertes, bandeaux), `lg` 16 (carte de formulaire en grand écran). Les formes arrondies mais nettes évoquent la souplesse sans infantiliser.
- **Tailles** (`sizes.*`, ajout) : cible tactile minimale `touchTarget` 44 ; hauteur de champ et de bouton `control` 48 ; bordures `borderWidth` 1 / `borderWidthStrong` 2 ; barre d'accent `accentBar` 4 ; icônes `icon` 20 ; colonnes `formMaxWidth` 400 et `contentMaxWidth` 1040. Story 3 : colonne `formWideMaxWidth` 640 (formulaire à tuiles), largeur mini d'une tuile `tileMinWidth` 152, icône de panneau `iconLarge` 32, point de l'échelle de difficulté `scaleDot` 8.
- **Grille du catalogue** : 1 colonne, puis 2 à partir de `breakpoints.md`, 3 à partir de `breakpoints.lg` ; écarts `spacing.md` (mobile) et `spacing.lg`. Le nombre de colonnes n'est pas un token (structure, pas une valeur visuelle).
- **Points de rupture** (`breakpoints.*`, ajout) : `md` 640, `lg` 1024. Mobile d'abord : styles de base pour < 640 px.

## Icônes

Mises en œuvre en 2b : erreur (cercle + point d'exclamation), information (cercle + « i ») ; le bouton du mot de passe est en texte seul (pas d'œil). Story 3 : **coche** et **tiret** (valeurs Oui / Non des cartes, `sizes.icon`), **plus** (lien « Proposer une pose »), **succès** (cercle + coche, `sizes.iconLarge`). SVG en ligne dessinés dans le dépôt (trait 2 px sur une grille de 20, `currentColor`, `aria-hidden="true"` car toujours accompagnés d'un texte), **sans bibliothèque d'icônes** (une bibliothèque demanderait un ADR).

## Mouvement

Pas d'animation dans les stories 2b et 3 (ni apparition du panneau de succès, ni coche animée). Les transitions de couleur au survol, si on en met, durent au plus 150 ms et sont supprimées sous `prefers-reduced-motion: reduce`. Aucun indicateur qui clignote ou tourne en boucle sans respecter ce réglage.

## Traduction des tokens côté web (ADR 0012, implémentée)

Variables CSS générées depuis les tokens, consommées par du CSS simple.

1. `toCssVariables()` (`front/packages/ui-tokens/src/css-variables.ts`) produit `:root { … }` avec les noms `--afj-<groupe>-<nom>` en kebab-case : `--afj-color-*`, `--afj-spacing-*`, `--afj-radius-*`, `--afj-size-*` (objet `sizes`), `--afj-font-family`, `--afj-font-size-*`, `--afj-font-weight-*`, `--afj-line-height-*` (sans unité).
2. Le site l'importe via `virtual:tokens.css` avant `index.css`, qui n'utilise que `var(--afj-…)` ; stylelint interdit couleurs et longueurs en dur.
3. Unités : aujourd'hui toutes les longueurs sont en `px`. **Cible recommandée** : `--afj-font-size-*` en `rem` (valeur / 16) pour suivre la taille de texte choisie dans le navigateur ; bordures, anneau de focus, barre d'accent et rayons restent en `px`.
4. Les points de rupture (`breakpoints.*`) ne sont pas exportés : une variable CSS n'est pas utilisable dans une media query. Le CSS écrit `40em` (= `breakpoints.md` / 16) ; garder les deux alignés (test ou commentaire).

Pourquoi : le site garde du CSS standard (`:hover`, `:focus-visible`, media queries, `prefers-reduced-motion`), sans CSS-in-JS ; le mobile continue d'importer les objets dans `StyleSheet.create`.

## Décisions (validées le 2026-11-03)

1. **Couleur principale** : terre cuite `#C2410C`.
2. **Police** : police système.
3. **Ton** : **tutoiement**, plus proche de l'esprit « jam » (« Saisis ton adresse e-mail. », « Vérifie-les et réessaie. »).
4. **Accord en genre** : tournures épicènes (« Connexion réussie avec l'adresse… », « Compte connecté : … »), ni point médian ni masculin générique.
5. **Marque** : logo textuel « AcroFunJam » seul pour l'instant.
6. **Tokens côté web** : variables CSS générées depuis `@acrofunjam/ui-tokens` (ADR 0012).

## Hors périmètre pour l'instant

Mode sombre, logo, illustrations, photos des poses (emplacement de vignette prévu dans `composants/carte-pose.md`, non implémenté). Les tokens nommés par rôle permettront d'ajouter un thème sombre sans toucher aux écrans.
