# Écrans de la story 9b « Générer un flow sur mobile »

**Statut : proposition du 2026-11-19, à valider.** Direction « Soleil et Lune » ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md), `../principes.md`). Navigation : [ADR 0038](../../adr/0038-application-mobile-du-generateur-de-flow.md) (pile, en-tête « AcroFunJam », écrans critères puis flow). Règles et décisions : `docs/domain/decouverte.md`, « Story 9b » (M1 à M9, Q212 à Q222). Scénarios `@mobile` : `specs/features/generation-de-flow/*.feature`. Maquette statique (360 dp, clair / sombre, police ×1,6) : `../maquettes/9b-generer-un-flow-mobile.html`.

Le mobile reprend **l'identité et les composants du site** (`9-generer-un-flow.md`, `../composants/fil-du-flow.md`, `recapitulatif-criteres.md`, `panneau-sans-flow.md`, `repli-criteres-etiquettes.md`) avec trois adaptations au tapis :

1. **lecture à 2-3 m** : numéro d'étape, nom de transition et nom de pose en grand ; le reste garde les tailles du site ;
2. **actions sous le pouce** : une barre basse fixe porte l'action principale de chaque écran ; les retours d'une génération (échec, « Revenir au flow précédent ») s'affichent **juste au-dessus d'elle**, là où le doigt vient de toucher ;
3. **police du système** suivie jusqu'à ×2 pour le texte, plafonnée pour les très grands titres (token `typography.maxFontScale`, ci-dessous).

Les libellés notés « *proposé* » ne figurent pas dans les décisions validées.

## Token ajouté : `typography.maxFontScale`

`{ text: 2, title: 1.25, display: 1 }`, passé à `maxFontSizeMultiplier` de chaque `Text` selon son niveau. Ignoré par le web (le CSS n'en produit aucune variable).

| Niveau | Tailles | Multiplicateur max | Taille max |
|---|---|---|---|
| `text` | `xs` à `lg` (12 à 20) | 2 | 24 à 40 |
| `title` | `xl` 28 (titres d'écran, nom de transition) | 1,25 | 35 |
| `display` | `xxl` 40, `display` 64 (nom de pose, numéro d'étape) | 1 | 40, 64 |

**Pourquoi un token** : sans plafond, un nom de pose en Unbounded 40 passerait à 80 dp et « Candlestick » se couperait en plein mot dans les 300 dp de la colonne ; chaque écran mobile aurait alors besoin de ces trois nombres, qui ne doivent pas être écrits en dur. Les titres plafonnés restent **au-dessus** du texte courant agrandi ×2 (32 dp) : la hiérarchie tient et la contrainte « police respectée jusqu'à ×2 » vaut pour tout le texte de lecture.

Aucun autre token. Cibles : **`sizes.control` (48)** pour tous les contrôles de l'application (`touchTarget`, 44, reste le minimum du web) ; un contrôle visuellement plus petit (« Description ») complète sa zone par `hitSlop`.

## Règles communes aux deux écrans

| Sujet | Règle |
|---|---|
| Thème | `useColorScheme()` : `colors` ou `colorsDark` ; barre d'état `dark-content` à l'aube, `light-content` la nuit ; pas de bascule dans l'application |
| En-tête (pile) | fond `background`, filet bas `borderWidth` `divider` (pas d'ombre) ; titre : logo (`sizes.logo`) + « AcroFunJam » Unbounded 600 `size.lg` `text`, `accessibilityRole="header"` ; même en-tête sur les deux écrans. Écran du flow : flèche de retour native seule (sans texte), nom accessible « Revenir aux critères » (*proposé*) |
| Défilement | `ScrollView` / `FlatList`, padding `spacing.md` horizontal, `spacing.lg` en haut ; en bas : hauteur de la barre basse + hauteur du dock s'il est affiché + `spacing.lg` (rien n'est jamais caché derrière la barre) |
| Barre basse | composant `BarreActions` (ci-dessous) |
| Dock | composant `MessageDock` (ci-dessous), entre le contenu et la barre |
| Polices | `typography.fontFamilies` (une famille par graisse, pas de `fontWeight`) ; `maxFontSizeMultiplier` selon `maxFontScale` |
| Mouvement | aucune animation, sauf l'apparition du dock (fondu 150 ms, supprimé si « Réduire les animations » est actif, `AccessibilityInfo.isReduceMotionEnabled`) |

## 1. Écran « Critères » (`(generateur)/index`)

Ouverture sans flow gardé (M1). Préselection : 3, « Débutant » / « Débutant », aucune étiquette.

```
┌──────────────────────────────┐ 360 dp
│ ◓ AcroFunJam                 │ en-tête, 56 dp
├──────────────────────────────┤
│ Générer un flow              │ h1 Unbounded 600 xl (title)
│ Choisis la longueur et la    │ size.md textMuted
│ difficulté : AcroFunJam tire │
│ au hasard un flow parmi les  │
│ poses et les transitions du  │
│ catalogue.                   │
│                              │ spacing.lg
│ Nombre de transitions        │ libellé md semibold
│ De 1 à 10. Un flow de 3      │ aide sm textMuted
│ transitions enchaîne 4 poses.│
│ (−)    3    (+)              │ compteur : 48 + 64 + 48
│                              │ spacing.lg
│ Aucune pose ni transition du │ aide commune
│ flow ne dépassera ce niveau. │
│ ● Difficulté base, au plus   │ legend + point terre
│ [◔ Découverte][◑ Débutant ▌] │ tuiles 2 × 2 (48 dp)
│ [◕ Intermédiaire][● Avancé ] │
│ ● Difficulté flyer, au plus  │
│ [◔ Découverte][◑ Débutant ▌] │
│ [◕ Intermédiaire][● Avancé ] │
│                              │ spacing.lg
│ [Étiquettes (facultatives) ⌄]│ repli 48 dp
├──────────────────────────────┤
│ [      Générer un flow     ] │ barre basse : primaire pleine largeur
└──────────────────────────────┘
```

| Élément | Composant, tokens |
|---|---|
| Titre, introduction | `h1` : `fontFamilies.display`, `size.xl`, `text`, interligne `tight`, `title` ; introduction `size.md`, `textMuted`, `text` ; écart `spacing.sm` |
| Formulaire | colonne, écart `spacing.lg` entre les blocs |
| « Nombre de transitions » | `Compteur` (ci-dessous) ; libellé `size.md` `bodySemibold`, aide `size.sm` `textMuted` entre libellé et compteur, écart `spacing.sm` |
| Plafonds | `groupe-tuiles-radio.md`, variante Phases, tons `base` / `flyer` ; section Mobile de ce composant ; sur mobile la phase (`sizes.moonLarge`) est **à gauche** du niveau, écart `spacing.sm`, tuile de 48 dp (la phase au-dessus doublerait la hauteur des deux groupes) ; **colonnes** : 2 si `(largeur de l'écran − 2 × spacing.md − spacing.sm) / 2 ≥ sizes.tileMinWidth × fontScale`, sinon **1 (liste verticale)** ; à 360 dp, la liste apparaît dès que la police dépasse ×1,05 |
| Étiquettes | `RepliEtiquettes` (ci-dessous) |
| Barre basse | une action : « Générer un flow », primaire, pleine largeur |

### Composant `Compteur` (− / +)

```
 ┌──┐            ┌──┐
 │ −│     3      │ +│      48 × 48, radius.pill ; valeur Unbounded 600 xl, largeur min 64, centrée
 └──┘            └──┘
```

| État | Bouton − / + | Valeur |
|---|---|---|
| Repos | fond `surface`, contour `borderWidth` `border` (3,4:1), icône `minus` / `plus` `sizes.icon` `text` | `text` |
| Pressé | fond `surfaceHover`, contour `text` | — |
| Focus (clavier externe, accès par contacteur) | contour `borderWidthStrong` `focus` | — |
| **Désactivé** (− à 1, + à 10) | fond `disabledSurface`, contour **tireté** `borderWidth` `border`, icône `textMuted` (5,8:1 / 6,4:1) ; `accessibilityState={{ disabled: true }}` | — |

Accessibilité : la rangée est **un** élément réglable (`accessibilityRole="adjustable"`, nom « Nombre de transitions », `accessibilityValue={{ min: 1, max: 10, now: 3, text: '3 transitions' }}`, actions `increment` / `decrement`) ; les deux boutons restent touchables à l'écran et gardent leurs noms « Diminuer le nombre de transitions » / « Augmenter le nombre de transitions » (*proposés*, `core/presentation`) pour Maestro et l'accès par contacteur. La valeur ne déclenche **aucun** tirage (M7).

### Composant `RepliEtiquettes`

Reprend `repli-criteres-etiquettes.md` : `Pressable` 48 dp, fond `surface`, contour `border`, `radius.md`, `accessibilityState={{ expanded }}`, compte « 1 choisie » en marque `selectedSurface` / contour `selected` dans le résumé. Contenu : les deux groupes de `groupe-cases-pastilles.md` (pastilles de **48 dp** de haut, `flexWrap`, écart `spacing.sm`), « (demandée) » / « (exclue) » dans la pastille désactivée (fond `disabledSurface`, contour tireté, `textMuted`), puis « Ce que veulent dire les étiquettes ». Ouvert, il reste ouvert au retour depuis le flow.

### États de l'écran « Critères »

| État | Rendu |
|---|---|
| Génération en cours | bouton de la barre « Génération du flow… », couleurs de repos, `accessibilityState={{ busy: true, disabled: true }}` ; pas d'indicateur tournant ; le formulaire reste visible |
| Injoignable | **dock erreur** au-dessus de la barre : « Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie. » ; la saisie est gardée ; le bouton « Générer un flow », juste dessous, sert de réessai (pas de bouton « Réessayer » en double, voir questions) ; le dock disparaît au tirage suivant |
| Étiquette retirée | **dock information** : « L'étiquette « vrille » n'est plus disponible. Vérifie tes étiquettes, puis génère de nouveau ton flow. » ; le repli des étiquettes s'ouvre, la pastille a disparu |
| Étiquettes non chargées | le repli est remplacé par une note information (`infoSurface`, icône info `info`, `size.sm` `text`) : « Les étiquettes n'ont pas pu être chargées : tu peux générer un flow sans étiquette. » (*proposé*, comme le site) ; « Générer un flow » reste actif |
| Critères trop restrictifs, catalogue insuffisant | voir § 3 : le panneau remplace le formulaire **sur cet écran** (pas de route « flow » sans flow) |

## 2. Écran « Flow » (`(generateur)/flow`)

Ordre de lecture : `h1` « Ton flow », résumé, alerte « même flow » éventuelle, **rappel du spotter**, fil (départ, étapes), récapitulatif des critères. Le récapitulatif passe **en fin d'écran** (le site le met avant les actions) : sur le tapis, l'étape 1 doit venir vite ; le résumé dit déjà la longueur et les bornes, et « Modifier les critères » montre les critères complets.

```
┌──────────────────────────────┐
│ ‹  ◓ AcroFunJam              │
├──────────────────────────────┤
│ Ton flow                     │ h1 xl (title)
│ 3 transitions, de Throne à   │ size.lg bodySemibold text
│ Folded Leaf.                 │
│ ┌──────────────────────────┐ │ rappel du spotter : sunSurface, radius.md, padding md
│ │(!) Ce flow est tiré au   │ │ icône spot sunStrong ; size.md text ; jamais replié
│ │hasard : il peut contenir │ │
│ │des transitions que ton … │ │
│ └──────────────────────────┘ │
│ ⤒ Départ :                   │ size.md semibold textMuted
│ ┊ Throne                     │ nom de pose : Unbounded 600 xxl 40 (display)
│ ┊ [BASE]◑ Débutant           │ pastilles de rôle
│ ┊ [FLYER]◑ Débutant          │
│ ┊ ┌────────────────────────┐ │ carte d'étape : surface, divider, radius.md
│ ┊ │ Étape 1                │ │ « Étape » sm semibold textMuted + « 1 » display 64 sunStrong
│ ┊ │ Throne ⤳ Star          │ │ nom de transition Unbounded 500 xl 28 (title)
│ ┊ │ [BASE]◑ … [FLYER]◑ …   │ │
│ ┊ │ ▸ Description          │ │ 48 dp
│ ┊ └────────────────────────┘ │
│ ○ Vers                       │
│ ┊ Star                       │ xxl 40
│ ┊ …                          │
│ ┊ ┌ Étape 2 · Ninja Star ──┐ │
│ ┊ │ ⟲ washing machine      │ │
│ ┊ └────────────────────────┘ │
│ ○ Vers                       │
│ ┊ Star                       │
│ ┊ (même pose)                │ size.md textMuted
│ …                            │
│ ⤓ Vers                       │
│   Folded Leaf                │
│   (inversion) (lunaire)      │
│ ┌ Critères du flow ────────┐ │ récapitulatif, fin d'écran
│ └──────────────────────────┘ │
├──────────────────────────────┤ dock (au besoin) puis barre
│ [Modifier les ][Générer un ] │ secondaire à gauche, primaire à droite
│ [ critères    ][autre flow ] │ écart spacing.lg
└──────────────────────────────┘
```

| Élément | Tokens, rendu |
|---|---|
| `h1` « Ton flow » | comme le titre de l'écran critères ; reçoit le focus du lecteur d'écran à chaque nouveau flow (`AccessibilityInfo.setAccessibilityFocus`), et la liste revient en haut |
| Résumé | `size.lg`, `bodySemibold`, `text`, interligne `tight`, `text` |
| Même flow ressorti | `alerte-formulaire.md` information **dans le contenu**, sous le résumé (comme le site) : `infoSurface`, barre d'accent `sizes.accentBar` `info`, icône info, `size.md` `text`, `radius.md` ; tout tirage réussi ramenant en haut, elle est vue juste après le tirage |
| Rappel du spotter | note de sécurité : `sunSurface`, icône `spot` `sizes.icon` `sunStrong` (4,4:1 / 8,0:1), texte `size.md` `text` (13,9:1 / 11,1:1), `radius.md`, padding `spacing.md` ; texte de la story 9 inchangé ; **au-dessus du départ**, jamais repliable (M2, AY-3) |
| Fil | `fil-du-flow.md` adapté (ci-dessous) |
| Récapitulatif | `recapitulatif-criteres.md` inchangé (`surfaceHover`, `radius.sm`, `size.sm`) ; marge haute `spacing.xl` |

### Fil du flow, mobile

Grille de deux colonnes comme le site : **rail** (`sizes.icon`, 20) + contenu, écart `spacing.sm` ; à 360 dp le contenu fait 300 dp. Rail : `View` à bordure gauche `borderWidthStrong` pointillée `sunStrong`, décorative (`importantForAccessibility="no"`).

| Élément | Site | Mobile |
|---|---|---|
| « Départ : » / « Vers » | `sm` sur la ligne du nom | **ligne propre** au-dessus du nom, `size.md`, `bodySemibold`, `textMuted` ; l'icône (rise / station / set, `sizes.icon`, `sunStrong`) est alignée sur elle |
| Nom de pose | lien Unbounded `md` | **texte simple** (Q213), `fontFamilies.display`, **`size.xxl` (40)**, `text`, interligne `tight`, interlettrage −0,04 em (−1,6 dp), `display` (40 dp fixes) ; un nom long passe à la ligne entre les mots |
| « (même pose) » | après le lien | ligne propre, `size.md`, `textMuted` |
| Détails de pose | pastilles de rôle, étiquettes | inchangés (`pastille-role.md`, `pilule-etiquette.md`), `flexWrap`, écart `spacing.sm` ; padding bas `spacing.md` |
| Carte d'étape | `surface`, `divider`, `radius.md`, padding `md` | inchangée ; marge basse `spacing.md` |
| Titre de l'étape | « Étape 1 · » sm + nom md | ligne 1 : « Étape » `size.sm` `bodySemibold` `textMuted` puis le **numéro** en `fontFamilies.displayBold` **`size.display` (64)**, `sunStrong` (5,2:1 / 10,4:1 sur `surface`), interligne `display`, alignés sur la ligne de base ; ligne 2 : nom de transition `fontFamilies.display` **`size.xl` (28)**, `text`, `title`. Un seul en-tête accessible : `accessibilityRole="header"`, `accessibilityLabel="Étape 1 · Pop to Bird"` |
| Transition sans nom | « Bird ⤳ Folded Leaf » | même dessin (trajectoire `sizes.trajectoryWidth` × `trajectoryHeight`, `sunStrong`) dans la ligne 2 ; nom accessible « Bird → Folded Leaf » |
| Washing machine | boucle + mot | inchangée : icône `loop` + « washing machine » `size.sm` `bodySemibold` `textMuted` |
| Description | `details` fermé | `Pressable` « Description » (*proposé*), `size.md` `bodySemibold` `primary`, chevron, **48 dp** ; `accessibilityState={{ expanded }}` ; contenu `size.md` `text` ; lisible hors ligne (M3) |

Pourquoi ces tailles : à 2-3 m, la personne cherche « où en est-on » (le numéro, 64 dp), « que fait-on » (la transition, 28 dp) et « où arrive-t-on » (la pose, 40 dp) ; difficultés et étiquettes se lisent avant de commencer, de près, aux tailles du site.

### Composant `BarreActions` (barre basse fixe)

| Élément | Tokens |
|---|---|
| Barre | fond `surface`, filet haut `borderWidth` `divider` ; padding `spacing.sm` en haut, `spacing.md` sur les côtés, en bas `max(spacing.sm, marge de sécurité basse)` (`useSafeAreaInsets`) |
| Boutons | `bouton.md` (pilule, `minHeight: sizes.control`, `size.md` `bodySemibold`, padding `spacing.sm` × `spacing.md`) ; libellé sur deux lignes au plus, centré |
| Flow : disposition | « **Modifier les critères** » secondaire **à gauche**, « **Générer un autre flow** » primaire **à droite**, `flex: 1` chacun, **écart `spacing.lg` (24)** : la distance et la différence plein / contour les séparent sans la couleur |
| Empilement | si `(largeur − 2 × spacing.md − spacing.lg) / 2 < sizes.tileMinWidth × fontScale` (même règle que les tuiles, donc dès ×1,05 à 360 dp) : boutons pleine largeur l'un sous l'autre, écart `spacing.md`, « Modifier les critères » au-dessus, « Générer un autre flow » en bas (sous le pouce) ; l'ordre de lecture reste gauche → droite |
| En cours | « Générer un autre flow » devient « Génération du flow… » (`busy`) ; le flow affiché reste lisible, à pleine opacité ; « Modifier les critères » reste actif |
| Accessibilité | la barre suit le contenu dans l'ordre de lecture ; jamais masquée par le clavier (pas de champ texte dans ces écrans) |

### Composant `MessageDock` (au-dessus de la barre)

Un seul message à la fois, posé **au-dessus de la barre** (jamais sur elle), marges `spacing.md` sur les côtés, `spacing.sm` dessous ; le contenu défilant reçoit un padding bas égal à sa hauteur.

| Variante | Fond, accent | Contenu | Durée |
|---|---|---|---|
| **Erreur** (injoignable) | `dangerSurface`, barre d'accent `sizes.accentBar` `danger`, icône erreur `danger` | « Impossible de générer le flow. Vérifie ta connexion Internet, puis réessaie. » `size.md` `text` (14,4:1) | jusqu'au tirage suivant ou à « Modifier les critères » |
| **Information** (étiquette retirée) | `infoSurface`, accent et icône `info` | texte du site | jusqu'au tirage suivant |
| **Éphémère** (« Revenir au flow précédent », M9, Q223) | `infoSurface`, accent `info`, sans icône | message + action, voir ci-dessous | voir ci-dessous |

Rayon `radius.md` ; padding `spacing.md` (`spacing.sm` à droite du bouton d'action) ; pas d'ombre (la barre d'accent et le fond suffisent). `accessibilityLiveRegion="polite"` (Android) et `AccessibilityInfo.announceForAccessibility` (iOS) à l'apparition ; le focus n'est **pas** déplacé (il va au `h1` du nouveau flow).

**Injoignable sur l'écran du flow (M6)** : le flow affiché ne bouge pas (ni défilement, ni opacité), le dock erreur apparaît au-dessus de la barre ; aucun message éphémère.

## 3. Aucun flow (écran « Critères »)

`panneau-sans-flow.md`, sous le `h1` « Générer un flow », **à la place** du formulaire ; le titre du panneau reçoit le focus.

| Variante | Panneau | Barre basse |
|---|---|---|
| Critères trop restrictifs | icône info `sizes.iconLarge`, titre Unbounded 500 `size.lg` (`text`), récapitulatif des critères, « Pour élargir le choix, essaie : », pistes adaptées (puces `size.md`) | « Modifier les critères », **primaire**, pleine largeur : rouvre le formulaire prérempli |
| Catalogue insuffisant | titre et « Il manque encore des poses ou des transitions pour former un enchaînement. », **sans** « Voir le catalogue » (Q213) | « Modifier les critères », **secondaire** (aucune suite vraiment utile : pas de primaire) |

Le panneau garde `surface`, contour `divider`, `radius.lg`, padding `spacing.lg`.

## Q223 : message éphémère « Revenir au flow précédent » (proposition à valider)

- **Texte** : « Nouveau flow généré. » (`size.md`, `bodySemibold`, `text`) et le bouton **« Revenir au flow précédent »** (`size.md`, `bodySemibold`, `primary`, sans contour, 48 dp, aligné à droite sous le message ; pressé : fond `surface`, texte `primaryActive`). Nom accessible du dock : « Nouveau flow généré. Revenir au flow précédent, bouton. ». Le message dit ce qui s'est passé sans reproche (un toucher par erreur n'est pas une faute) et le bouton dit exactement ce qu'il rétablit.
- **Durée : 10 secondes**, passées par `AccessibilityInfo.getRecommendedTimeoutMillis(10000)` sur Android (réglage « Délai pour agir ») ; **sans délai quand un lecteur d'écran est actif** (`isScreenReaderEnabled`) : il reste jusqu'au tirage suivant, à « Modifier les critères » ou au retour (WCAG 2.2.1). 10 s : assez pour qu'une personne debout sur le tapis s'aperçoive qu'elle a touché le bouton et se baisse vers le téléphone, assez court pour ne pas encombrer le flow pendant la pratique.
- **Disparition** : délai écoulé, « Revenir au flow précédent » touché (le flow d'avant revient en haut, focus sur `h1`, pas de nouveau message, ni de retour vers l'autre), « Modifier les critères », nouveau tirage. Jamais après un même flow ressorti ni un tirage échoué (M9).
- **Lecteur d'écran** : annonce polie ; l'action est aussi offerte comme **action personnalisée du `h1`** « Ton flow » (`accessibilityActions: [{ name: 'revenir', label: 'Revenir au flow précédent' }]`) tant que le message est affiché, pour ne pas avoir à parcourir tout le flow jusqu'au dock.
- **Contrastes** : `text` sur `infoSurface` 13,4 / 12,5 ; `primary` sur `infoSurface` **5,9 / 7,0** (nouveau couple, calculé, à ajouter à `contrast.test.ts`) ; accent `info` sur `infoSurface` 4,7 / 7,9.

## Contrastes utilisés

Tous déjà vérifiés par `contrast.test.ts` (voir `9-generer-un-flow.md`), sauf `primary` sur `infoSurface` (5,9:1 aube, 7,0:1 nuit), à ajouter au test. `sunStrong` (numéro d'étape, texte de 64 dp) sur `surface` : 5,2 / 10,4 (seuil 3:1 des grands textes, et même 4,5:1 atteint).

## Accessibilité

- **Rien par la couleur seule** : rôle et niveau écrits ; « Départ : », « Vers », « Étape » écrits ; washing machine dite par le mot ; désactivé = contour tireté + `textMuted` + état accessible ; erreur = icône + texte + barre d'accent.
- **Cibles** : tous les contrôles à 48 dp (`sizes.control`), écart ≥ `spacing.sm` entre deux cibles, `spacing.lg` entre les deux actions de la barre.
- **Police ×2** : `maxFontScale` ; tuiles et barre passent en une colonne ; le dock grandit vers le haut ; aucun texte tronqué (`numberOfLines` jamais utilisé sur un libellé).
- **Écran allumé** (ADR 0038) : aucun signe visuel.
- **Couleurs forcées / contraste élevé** (Android « Texte à contraste élevé », iOS « Augmenter le contraste ») : les contours `divider` des cartes et du panneau passent à `border` si `AccessibilityInfo.isHighTextContrastEnabled` / `isDarkerSystemColorsEnabled` (*proposé*).

## Check-list d'implémentation

- [ ] `maxFontSizeMultiplier` sur chaque `Text` selon `typography.maxFontScale`.
- [ ] En-tête « AcroFunJam » avec logo, retour sans texte sur le flow.
- [ ] `Compteur` réglable, − désactivé à 1, + à 10 ; plafonds en tuiles radio, 2 colonnes ou liste selon la règle `tileMinWidth × fontScale`.
- [ ] Barre basse fixe : critères (1 primaire), flow (secondaire à gauche, primaire à droite, écart `spacing.lg`, empilement selon la même règle), aucun flow (« Modifier les critères »).
- [ ] Dock : erreur, information, éphémère (10 s, délai recommandé Android, pas de délai avec lecteur d'écran, action personnalisée du `h1`).
- [ ] Fil : numéro 64 `sunStrong`, transition 28, pose 40 en texte simple, rappel du spotter au-dessus du départ.
- [ ] Récapitulatif des critères en fin d'écran du flow.
- [ ] `contrast.test.ts` : couple `primary` / `infoSurface`.
- [ ] Captures (émulateur, 360 dp, clair et sombre, police ×1 et ×2) : critères, étiquettes ouvertes, flow avec washing machine, message éphémère, trop restrictifs, catalogue insuffisant, injoignable.

## Questions

1. **Récapitulatif des critères en fin d'écran** plutôt qu'avant le rappel du spotter (recommandé : l'étape 1 arrive plus vite sur le tapis) ?
2. **Pas de bouton « Réessayer »** dans le dock injoignable, le bouton de la barre juste dessous faisant le réessai (recommandé : une action en double sur un petit écran) ? Le pas Maestro « réessaie » toucherait alors « Générer un flow » ou « Générer un autre flow ».
3. **Aucun flow sur l'écran « Critères »** (recommandé, comme le site) plutôt que sur l'écran du flow ?
4. **Catalogue insuffisant** : « Modifier les critères » en secondaire suffit-il comme seule sortie, faute de catalogue mobile ?
5. **Q223** : texte « Nouveau flow généré. » + « Revenir au flow précédent », 10 s, pas de délai avec lecteur d'écran ?
6. **Libellés proposés** : « Revenir aux critères » (retour de l'en-tête), « Diminuer / Augmenter le nombre de transitions », « Description ».
