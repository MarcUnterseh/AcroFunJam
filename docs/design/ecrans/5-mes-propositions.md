# Écrans de la story 5 « Suivre mes propositions »

Composants : `../composants/` (nouveaux : `statut-proposition.md` (icône horloge comprise), `carte-ma-proposition.md` ; mis à jour : `recapitulatif-ajustements.md` (variante contributeur, liste partagée), `panneau-succes.md` (« Voir mes propositions »), `lien-bouton.md` (« Mes propositions », groupe d'actions du catalogue)). Principes et tokens : `../principes.md`. Scénarios : `specs/features/contribution/suivre-mes-propositions.feature` (`@web`). Structure, textes et comportements : décisions Q19 à Q27 du porteur du produit (2026-11-09, `docs/domain/decouverte.md`, story 5) et avis de l'`ux-expert` retenus.

Gabarit commun (en-tête, bandeau, `main`, annonce de statut) : `2b-se-connecter-sur-le-site.md`. **Aucun nouveau token** pour cette story.

## Entrées

Pas d'entrée dans l'en-tête (Q23 ; refonte de l'en-tête reportée).

### Catalogue (`/`)

« Mes propositions », lien-bouton **secondaire sans icône**, à côté de « Proposer une pose », pour toute personne connectée (utilisatrice, validateur, administrateur). Détail : `../composants/lien-bouton.md`, « Groupe d'actions de l'en-tête de page ».

```
Mobile, connectée :                      Grand écran (≥ 640 px), connectée :
┌────────────────────────────────┐       ┌──────────────────────────────────────────────────────────────────────┐
│ Catalogue des poses            │  h1   │ Catalogue des poses        [(+) Proposer une pose] [Mes propositions] │
│                                │  md   │ 12 poses, par ordre alphabétique                                     │
│ [   (+) Proposer une pose    ] │       │ …                                                                    │
│                                │  sm   └──────────────────────────────────────────────────────────────────────┘
│ [      Mes propositions      ] │
│                                │  lg
│ 12 poses, par ordre            │
│ alphabétique                   │

Catalogue vide, connectée (mobile) :
│ Catalogue des poses            │  h1
│                                │  md
│ [      Mes propositions      ] │  secondaire, seul dans l'en-tête de page
│                                │  lg
│ ┌────────────────────────────┐ │
│ │ Le catalogue ne contient   │ │  bloc vide inchangé
│ │ encore aucune pose.        │ │
│ │ Propose la première pose   │ │
│ │ du catalogue.              │ │
│ │ [(+) Proposer une pose   ] │ │  primaire : le seul de la page
│ └────────────────────────────┘ │
```

- Visiteur : ni « Proposer une pose » ni « Mes propositions », aucun vide réservé.
- Apparition : comme « Proposer une pose » aujourd'hui, quand la réponse du catalogue est reçue (liste ou vide), pour que rien ne bouge pendant le chargement. Erreur de chargement du catalogue : « Mes propositions » seul, qui reste pendant « Réessayer » ; « Proposer une pose » s'insère devant lui quand les poses arrivent (`../composants/lien-bouton.md`). En grand écran, la rangée de l'en-tête de page fait 48 px avec ou sans liens (`min-block-size: sizes.control`) ; en mobile, les liens s'insèrent entre le titre et le nombre, avant que le nombre et les cartes n'apparaissent.

### Confirmation de « Proposer une pose »

Après une proposition **en attente** ou au **statut illisible** : trois actions sous le panneau de succès, « Proposer une autre pose » (primaire), « Voir mes propositions » (secondaire), « Voir le catalogue » (secondaire). Après une **publication directe** : pas de « Voir mes propositions ». Détail et retour à la ligne en grand écran : `../composants/panneau-succes.md`, « Actions selon le résultat ».

```
│ Proposer une pose              │  h1
│ ┃ (✓)                          │
│ ┃ Merci, ta proposition est    │
│ ┃ envoyée.                     │
│ ┃ Un validateur va l'examiner… │
│                                │  spacing.lg
│ [   Proposer une autre pose  ] │  bouton primaire
│ [   Voir mes propositions    ] │  lien-bouton secondaire, écart spacing.sm
│ [      Voir le catalogue     ] │  lien-bouton secondaire
```

## Page « Mes propositions » (`/mes-propositions`)

### Ordre du contenu

1. `h1` « Mes propositions » ;
2. introduction « Retrouve les poses que tu as proposées et ce qu'elles sont devenues. » ;
3. nombre : « 4 propositions, de la plus récente à la plus ancienne » (singulier « 1 proposition, … ») ;
4. liste des cartes (`ul` > `li` > `carte-ma-proposition.md`), **une colonne**, la plus récemment soumise d'abord.

### Colonne

**Même colonne que l'écran 4** (`4-valider-une-proposition.md`, « Colonne ») : alignée à gauche du `main`, largeur maximale `sizes.formWideMaxWidth` + 2 × `spacing.lg` + 2 × `sizes.borderWidth` (≈ 690 px). Les deux pages de suivi des propositions (validateur, contributeur) ont ainsi la même silhouette, et le récapitulatif « proposé → retenu » a la même largeur des deux côtés. Pas de carte englobante ; une seule colonne même en grand écran (lecture chronologique de haut en bas, cartes de hauteurs très variables).

### Mobile (< 640 px)

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│ alice@exa…   [Se déconnecter]  │
├────────────────────────────────┤
│                                │  spacing.lg
│ Mes propositions               │  h1
│                                │  spacing.sm
│ Retrouve les poses que tu as   │  introduction, size.md, textMuted
│ proposées et ce qu'elles sont  │
│ devenues.                      │
│                                │  spacing.sm
│ 4 propositions, de la plus     │  nombre, size.md, textMuted
│ récente à la plus ancienne     │
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │ Hand-to-Hand (L-base)      │ │  h2, nom proposé
│ │ Proposée le 7 novembre 2026│ │  size.sm, textMuted
│ │                            │ │  spacing.md
│ │ (◷) En attente de          │ │  statut, semibold ; horloge textMuted
│ │     validation             │ │
│ │     Elle apparaîtra dans le│ │  conséquence, textMuted
│ │     catalogue une fois     │ │
│ │     acceptée.              │ │
│ │ ────────────────────────── │ │  séparateur de la pose
│ │ Base         Avancé ●●●●   │ │  dl (carte-pose.md)
│ │ Flyer        Avancé ●●●●   │ │
│ │ ────────────────────────── │ │
│ │ Peut commencer un flow     │ │
│ │                     – Non  │ │
│ │ Peut terminer un flow      │ │
│ │                     – Non  │ │
│ └────────────────────────────┘ │
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │ Throne                     │ │  h2, nom RETENU
│ │ Proposée le 3 novembre 2026│ │
│ │                            │ │
│ │ (✓) Acceptée avec          │ │  icône succès, success
│ │     ajustements le         │ │
│ │     5 novembre 2026        │ │
│ │     Elle est publiée dans  │ │
│ │     le catalogue avec ces  │ │
│ │     ajustements.           │ │
│ │                            │ │  spacing.md
│ │ Ajustements apportés       │ │  h3
│ │ Valeur proposée → valeur   │ │  clé de lecture
│ │ retenue                    │ │
│ │ ┌────────────────────────┐ │ │  liste sur background
│ │ │ Nom de la pose         │ │ │
│ │ │ t̶h̶r̶o̶n̶e̶ → Throne        │ │ │
│ │ │ ────────────────────── │ │ │
│ │ │ Difficulté flyer       │ │ │
│ │ │ I̶n̶t̶e̶r̶m̶é̶d̶i̶a̶i̶r̶e̶            │ │ │
│ │ │ → Découverte           │ │ │  deux lignes sous ~360 px
│ │ └────────────────────────┘ │ │
│ │ Les autres valeurs sont    │ │  size.sm, textMuted
│ │ celles que tu as proposées.│ │
│ │                            │ │  spacing.md
│ │ Message d'ajustement       │ │  size.sm, semibold
│ │ Throne se découvre dès la  │ │  size.md, text
│ │ première séance côté flyer.│ │
│ │ ────────────────────────── │ │
│ │ Base       Débutant ●●○○   │ │  pose retenue
│ │ …                          │ │
│ └────────────────────────────┘ │
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │ Front Bird                 │ │
│ │ Proposée le 2 novembre 2026│ │
│ │                            │ │
│ │ (i) Refusée le             │ │  icône information, info
│ │     4 novembre 2026        │ │
│ │     Elle n'est pas publiée │ │  conséquence, textMuted
│ │     dans le catalogue.     │ │
│ │                            │ │  spacing.md
│ │ Motif du refus             │ │  size.sm, semibold
│ │ Doublon de Bird, déjà au   │ │  size.md, text
│ │ catalogue.                 │ │
│ │ ────────────────────────── │ │
│ │ Base     Découverte ●○○○   │ │  pose proposée
│ │ …                          │ │
│ └────────────────────────────┘ │
```

### Grand écran (≥ 640 px)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ AcroFunJam                                         alice@example.org [Se déconnecter] │
├───────────────────────────────────────────────────────────────────────────────────┤
│ Mes propositions                                                                  │
│ Retrouve les poses que tu as proposées et ce qu'elles sont devenues.              │
│ 4 propositions, de la plus récente à la plus ancienne                             │
│                                                                                   │
│ ┌──────────────────────────────────────────────────────────────┐                  │
│ │ Hand-to-Hand (L-base)                                        │                  │
│ │ Proposée le 7 novembre 2026                                  │                  │
│ │                                                              │                  │
│ │ (◷) En attente de validation                                 │                  │
│ │     Elle apparaîtra dans le catalogue une fois acceptée.     │                  │
│ │ ──────────────────────────────────────────────────────────── │                  │
│ │ Base                                             Avancé ●●●● │                  │
│ │ Flyer                                            Avancé ●●●● │                  │
│ │ ──────────────────────────────────────────────────────────── │                  │
│ │ Peut commencer un flow                                – Non  │                  │
│ │ Peut terminer un flow                                 – Non  │                  │
│ └──────────────────────────────────────────────────────────────┘                  │
│                                                                    spacing.lg     │
│ ┌──────────────────────────────────────────────────────────────┐                  │
│ │ Star                                                         │                  │
│ │ Proposée le 1 novembre 2026                                  │                  │
│ │                                                              │                  │
│ │ (✓) Publiée directement                                      │                  │
│ │     Elle est publiée dans le catalogue.                      │                  │
│ │ ──────────────────────────────────────────────────────────── │                  │
│ │ Base                                      Intermédiaire ●●●○ │                  │
│ │ …                                                            │                  │
```

(Termes abrégés sur la maquette ASCII seulement ; `(◷)` figure l'icône horloge, `(✓)` l'icône succès, `(i)` l'icône information.)

| Zone | Mobile | ≥ `breakpoints.md` (640) | ≥ `breakpoints.lg` (1024) |
|---|---|---|---|
| `h1` | marge basse `spacing.sm` | idem | idem |
| Introduction | `size.md`, `regular`, `textMuted` (6,1:1) ; marge basse `spacing.sm` | idem | idem |
| Nombre | `size.md`, `textMuted` ; marge basse `spacing.lg` | idem | idem |
| Liste (`ul`, puces et marges retirées) | 1 colonne, écart `spacing.md` | 1 colonne, écart `spacing.lg` | idem |
| Carte | padding `spacing.md` | padding `spacing.lg` | idem |
| Colonne | 100 % du `main` (padding `spacing.md`) | ≈ 690 px max, alignée à gauche | idem (pas de centrage, pas de 2ᵉ colonne) |

Media query `40em` (= `breakpoints.md` / 16), comme l'écran 4. Aucune règle propre à `breakpoints.lg`. Les classes de mise en page de l'écran 4 (colonne, nombre, liste, conteneur de carte) peuvent être partagées plutôt que dupliquées.

### Rythme vertical d'une carte

| Entre | Token |
|---|---|
| `h2` et « Proposée le … » | `spacing.xs` |
| « Proposée le … » et le statut | `spacing.md` |
| Statut, récapitulatif, message, motif (zone de décision) | `spacing.md` (`gap`) |
| Statut et sa conséquence | `spacing.xs` |
| Libellé (« Message d'ajustement », « Motif du refus ») et texte | `spacing.xs` |
| Zone de décision et `dl` de la pose | `spacing.md` + séparateur `divider` + `spacing.md` |

## États de la page

**Chargement** : sous le `h1`, un paragraphe `role="status"` « Chargement de tes propositions… », `size.md`, `textMuted`. Ni introduction, ni nombre, ni liste, ni squelette.

**Vide** :

```
│ Mes propositions               │  h1
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │ Tu n'as encore proposé     │ │  size.md, weight.semibold, text
│ │ aucune pose.               │ │
│ │                            │ │  spacing.xs
│ │ Les poses que tu proposes  │ │  size.md, regular, textMuted
│ │ apparaissent ici, avec ce  │ │
│ │ qu'elles deviennent.       │ │
│ │                            │ │  spacing.md
│ │ [ (+) Proposer une pose  ] │ │  lien-bouton PRIMAIRE
│ └────────────────────────────┘ │
```

- **Même bloc que l'état vide de l'écran 4** (fond `surface`, contour `borderWidth` `divider`, rayon `radius.md`, padding `spacing.lg`, titre semi-gras, texte `textMuted`, écarts `spacing.xs` puis `spacing.md`), marge haute `spacing.lg` sous le `h1`.
- Seule différence : le lien est **primaire**, avec l'icône **plus**, exactement comme « Proposer une pose » sur le catalogue (même destination, même libellé, même apparence partout) ; il est le seul élément primaire de la page. Pleine largeur en mobile, largeur du contenu ensuite.
- Ni introduction ni nombre (« 0 proposition ») : le bloc dit tout.

**Erreur de chargement** (AcroFunJam injoignable) : `alerte-formulaire.md`, variante **erreur**, hors formulaire, marge haute `spacing.lg` sous le `h1`, comme le catalogue et l'écran 4 :

```
┃ (!) Impossible de charger tes propositions. Vérifie
┃     ta connexion Internet, puis réessaie.
┃     [ Réessayer ]                 <- bouton secondaire ; en cours « Chargement… »
```

Ni introduction, ni nombre, ni liste : un incident ne doit jamais ressembler à une liste vide.

**Site à mettre à jour** : même alerte erreur, « Impossible de charger tes propositions : le site doit être mis à jour. Recharge la page. » avec le bouton secondaire « Recharger la page » au lieu de « Réessayer ».

**Session expirée** au chargement (réponse 401), ou déjà expirée quand la page s'ouvre : la session se termine et la page le signale elle-même, sans le bandeau du site (route à avis de session propre, comme les pages 3 et 4). Sous le `h1`, un bloc durable, sans bouton de fermeture, au style de l'état vide (`catalog-empty validation-empty`) : titre « Ta session a expiré. », texte « Connecte-toi de nouveau pour retrouver tes propositions. », lien-bouton primaire « Se connecter » vers `/connexion?retour=%2Fmes-propositions`, qui ramène ici après la connexion. Annonce polie « Ta session a expiré. Tu peux te reconnecter. » (celle du bandeau). Aucune nouvelle requête de la liste ; relire la session sans navigation (retour sur l'onglet) laisse le bloc en place, et une connexion dans un autre onglet présente la liste. Un visiteur sans expiration connue est envoyé à « Se connecter » (retour ici) ; une personne qui se déconnecte arrive sur le catalogue.

```
│ Mes propositions               │  h1
│ ┌────────────────────────────┐ │
│ │ Ta session a expiré.       │ │  titre du bloc, semibold
│ │ Connecte-toi de nouveau    │ │
│ │ pour retrouver tes         │ │
│ │ propositions.              │ │
│ │ [     Se connecter       ] │ │  primaire
│ └────────────────────────────┘ │
```

**« Réessayer »** : si le chargement réussit, focus sur le `h1` ; s'il échoue de nouveau (injoignable), l'alerte reste et l'échec est annoncé ; sinon (site à mettre à jour, session expirée), le bouton disparaît, rien n'est annoncé comme une panne réseau et le focus va sur le `h1`.

**Visiteur** (accès direct) : redirection vers « Se connecter » ; pendant la vérification de session, `main` n'affiche que le `h1`, jamais une carte.

**Après une déconnexion** : retour au catalogue ; aucune carte ne reste à l'écran.

**Statut inconnu** d'une proposition (API plus récente que le site) : seule la carte concernée affiche « Statut indisponible. Recharge la page. » (`statut-proposition.md`, variante neutre) ; les autres cartes sont normales. Pas d'alerte de page.

## Accessibilité visuelle

| Couple | Ratio |
|---|---|
| `text` sur `surface` (nom, statut, libellés, message, motif, valeurs de la `dl`) | 14,6:1 |
| `textMuted` sur `surface` (date de soumission, conséquence, termes de la `dl`, clé, mention finale) | 5,8:1 |
| `textMuted` sur `background` (introduction, nombre, chargement, valeur proposée barrée) | 6,1:1 |
| `text` sur `background` (valeur retenue) | 15,4:1 |
| Icône horloge et icône du statut inconnu, `textMuted` sur `surface` | 5,8:1 (seuil 3:1) |
| Icône succès, `success` sur `surface` | 5,8:1 |
| Icône information du refus, `info` sur `surface` | 5,8:1 |
| `border` sur `background` (« Mes propositions », « Voir mes propositions », « Voir le catalogue ») | 3,3:1 |
| `primaryContrast` sur `primary` (« Proposer une pose » de l'état vide) | 5,2:1 |
| `text` sur `dangerSurface`, `border` sur `dangerSurface` (alerte et « Réessayer ») | 14,4:1, 3,1:1 |
| `focus` sur `background` / `surface` | 6,1:1 / 5,8:1 |

Focus : la page n'a d'éléments focalisables que dans les états (lien de l'état vide, « Réessayer », « Recharger la page ») et le `h1` (focus programmatique, comme les autres pages). Les cartes n'ont **aucun** élément focalisable ni de titre `tabindex`. Anneau `focus` 3 px décalé de 2 px partout, distinct du survol (fond `surfaceHover` des liens-boutons secondaires).

Rien ne repose sur la couleur seule : statut = mot + forme de l'icône (horloge, coche dans un cercle, « i ») ; refus jamais rouge ; proposé / retenu = ordre + flèche + barré + graisse ; Oui / Non = mot + coche / tiret ; liens-boutons = forme de bouton.

## Check-list visuelle pour l'implémentation

- Aucune valeur en dur, **aucune nouvelle variable CSS** : la story n'ajoute pas de token.
- Nouvelle icône `clock` dans `Icon.tsx` (`statut-proposition.md`) : cercle r 8,5 et `polyline` 10,5.5 / 10,10 / 13.5,12, trait 2, extrémités et jointure arrondies.
- Statut : texte masqué « Statut : » (sauf statut inconnu), icône `aria-hidden`, interligne `tight` du mot pour aligner l'icône ; ton par une classe de variante (neutre, succès, information), jamais `danger`.
- Récapitulatif : `AdjustmentList` extraite et partagée, rendu identique au validateur ; titre « Ajustements apportés » **sans** `tabindex` ni anneau.
- Message et motif : `overflow-wrap: anywhere`, pas de `blockquote` ; pas de `white-space: pre-line` (l'API normalise les retours à la ligne en espaces).
- Catalogue : groupe d'actions de l'en-tête de page (colonne + `spacing.sm` en mobile, rangée + `spacing.md` + `flex-wrap` ensuite) ; « Mes propositions » secondaire, sans icône, aussi sur le catalogue vide.
- Panneau de succès : `flex-wrap: wrap` sur les actions à partir de 40em (sinon débordement à trois liens).
- Cibles ≥ 44 px (liens-boutons 48, « Réessayer » 44).
- 320 px et zoom 400 % : statut long et comparaisons du récapitulatif sur deux lignes, valeurs de la `dl` sous leur terme ; zoom 200 % : aucun défilement horizontal (1.4.10).
- `forced-colors: active` : icônes en `currentColor`, barré du récapitulatif visible, liens-boutons avec bordure (règle existante).
- Aucune animation.
