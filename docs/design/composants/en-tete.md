# En-tête du site

> **Direction « Soleil et Lune »** ([ADR 0031](../../adr/0031-direction-visuelle-soleil-et-lune.md)) : Marque : le **logo** (demi-cercle de terre `base` qui porte un soleil `sun`, décoratif) puis « AcroFunJam » en Unbounded. Fond `background`, filet `divider`. Personne connectée : **avatar** à l'initiale de l'adresse (36 px, `sunSurface`, `aria-hidden`), boutons discrets. Sur écran étroit (< 40em), l'adresse est **masquée visuellement seulement** : elle reste dans le nom accessible de la zone « Compte » (« Compte connecté : … »). Ce qui suit reste valable pour la structure, les libellés et l'accessibilité ; les valeurs visuelles sont celles de `principes.md`.

Élément `<header>` commun à toutes les pages : la marque (lien vers le catalogue), la navigation de contribution (`<nav aria-label="Contribution">`, story 4, validateurs et administrateurs seulement) et la zone de compte (`<nav aria-label="Compte">`). Trois états de session : **en attente**, **visiteur**, **connecté**.

Ordre du DOM (= ordre de tabulation) : marque, navigation de contribution, zone de compte.

## Tokens communs

- Fond `surface`, ligne basse `borderWidth` `divider` (décorative).
- Padding horizontal `spacing.md` (mobile), `spacing.lg` (≥ `breakpoints.md`) ; contenu centré sur `sizes.contentMaxWidth`.
- Marque « AcroFunJam » : `size.lg`, `weight.bold`, `text`, lien sans soulignement (exception justifiée : c'est un logo textuel), zone cliquable ≥ 44 px ; survol soulignement ; focus anneau `focus`, rayon `radius.sm`.
- Boutons : `bouton.md`, hauteur `sizes.touchTarget` (44) dans l'en-tête pour rester compact, écart `spacing.sm`.

## Disposition

**Mobile (< 640 px)** : deux rangées, pour que les libellés complets tiennent dès 320 px.

```
┌────────────────────────────────────┐
│ AcroFunJam                         │  rangée 1 : marque, 44 px
│               [Se connecter] [S'inscrire] │  rangée 2 : zone de compte, 44 px, alignée à droite
└────────────────────────────────────┘
```

Padding vertical `spacing.sm`, écart entre rangées `spacing.xs`.

**Grand écran (≥ 640 px)** : une rangée, marque à gauche, zone de compte à droite ; padding vertical `spacing.sm`, soit 60 px de haut (8 + 44 + 8).

```
┌──────────────────────────────────────────────────────────────────┐
│ AcroFunJam                            [Se connecter] [S'inscrire] │
└──────────────────────────────────────────────────────────────────┘
```

## États de la zone de compte

| État | Contenu | Variantes |
|---|---|---|
| **En attente** (vérification de la session) | vide ; `aria-busy="true"` sur la `nav` | — |
| **Visiteur** | « Se connecter » puis « S'inscrire » (liens vers les pages dédiées) | secondaire, puis **primaire** (l'inscription est l'invitation principale) |
| **Connecté** | adresse e-mail puis « Se déconnecter » | adresse : `size.sm`, `textMuted` ; bouton secondaire |

### Pas de clignotement

- La zone de compte a une **hauteur fixe** (`sizes.touchTarget`) dans les trois états : rien ne bouge en dessous quand l'état change.
- En attente, on n'affiche **ni** les boutons visiteur **ni** un squelette animé : la zone reste vide (fond `surface`), ce qui évite d'afficher « Se connecter » une fraction de seconde à une personne connectée.
- Si la vérification dépasse 1 seconde (à confirmer par l'`ux-expert`), un texte statique « Vérification de la session… » en `size.sm` `textMuted` apparaît, sans animation.

### Adresse longue

- L'adresse occupe l'espace libre (`flex: 1`, `min-width: 0`), alignée à droite près du bouton, sur une ligne, **tronquée par une ellipse** (`text-overflow: ellipsis`).
- L'adresse complète reste accessible : attribut `title` pour la souris et texte complet dans le DOM (la troncature est purement visuelle, le lecteur d'écran lit tout).
- Texte masqué visuellement devant l'adresse : « Compte connecté : » (tournure épicène, décision 4 de `principes.md`), pour que l'adresse ne soit pas lue hors contexte.
- Le bouton « Se déconnecter » ne se réduit jamais (`flex-shrink: 0`).

```
Mobile, connecté :
│ AcroFunJam                         │
│ alice.dupont-longnom@exa… [Se déconnecter] │

Grand écran, connecté :
│ AcroFunJam          alice.dupont-longnom@example.org [Se déconnecter] │
```

En grand écran, l'adresse est limitée à `sizes.accountLabelMaxWidth` (320 px) avant troncature.

### Pendant la déconnexion

Bouton « Se déconnecter » à l'état « en cours » (« Déconnexion… »), puis passage direct à l'état visiteur.

## Navigation de contribution (story 4)

Une `nav` distincte de « Compte » (nom proposé : **« Contribution »** ; la story 5 n'y ajoute **pas** « Mes propositions » (décision Q23 du 2026-11-09 : entrée sur le catalogue, refonte de l'en-tête à concevoir avant la prochaine entrée de navigation)). Elle n'existe que pour une personne connectée qui est validateur ou administrateur : **absente** (pas masquée, pas grisée) pour un visiteur, un utilisateur, et tant que la session est en attente.

Contenu en story 4 : un seul lien, « Propositions à valider », vers `/propositions-a-valider`, suivi de la pastille du nombre de propositions en attente (`pastille-compteur.md`).

### Lien « Propositions à valider »

```
┌────────────────────────────────┐
│ Propositions à valider  (3)    │   44 px, style bouton secondaire
└────────────────────────────────┘
```

| Élément | Tokens |
|---|---|
| Lien | apparence du **bouton secondaire** de l'en-tête (`bouton.md`) : fond transparent, bordure `borderWidth` `border` (3,2:1 sur `surface`), rayon `radius.md`, hauteur `sizes.touchTarget` (44), padding horizontal `spacing.md` ; `display: inline-flex`, `align-items: center`, écart `spacing.sm` entre libellé et pastille ; jamais réduit (`flex-shrink: 0`) |
| Libellé | `size.md`, `weight.semibold`, `text` (14,6:1 sur `surface`) ; sur une ligne |
| Pastille | `pastille-compteur.md`, après le libellé |

Le rôle reste celui d'un lien (navigation) ; l'apparence de bouton l'aligne sur « Se déconnecter » et garantit une cible de 44 px.

| État | Rendu |
|---|---|
| Repos | ci-dessus |
| Survol (pointeur fin) | fond `surfaceHover` |
| Focus (`:focus-visible`) | anneau `focus` 3 px décalé de 2 px autour du lien entier (pastille comprise), rayon `radius.md` |
| Pressé | fond `divider` |
| Page courante (`aria-current="page"`) | **soulignement 2 px (`borderWidthStrong`) du libellé seul** (règle existante `[aria-current='page']`), sans changement de couleur ; s'ajoute au survol et au focus sans les remplacer |

### Nom accessible et libellé court

Le nom accessible est toujours complet : « Propositions à valider (3 en attente) », « Propositions à valider (plus de 99 en attente) », « Propositions à valider » quand la pastille est absente.

Balisage proposé (un seul lien, aucun `aria-label`, pour que le nom suive le texte) :

```
<a>
  <span class="validation-link__long">Propositions à valider</span>      visible ≥ 64em, masqué visuellement sinon
  <span class="validation-link__short" aria-hidden="true">À valider</span> visible < 64em, display: none sinon
  <span class="badge" aria-hidden="true">3</span>
  <span class="visually-hidden"> (3 en attente)</span>
</a>
```

- Sous `breakpoints.lg` (1024 px), le libellé **visible** est « À valider » : il est contenu dans le nom accessible (critère 2.5.3 « Étiquette dans le nom » respecté pour la commande vocale « clique sur À valider »).
- La page porte le `h1` complet « Propositions à valider » : le libellé court n'est jamais la seule indication.

### Disposition

**Mobile (< 640 px)** : la navigation de contribution prend place **dans la rangée 1, à droite de la marque**, dans l'espace aujourd'hui vide. L'en-tête garde ses deux rangées et sa hauteur (8 + 44 + 4 + 44 + 8 = 108 px) : **rien ne bouge** sous l'en-tête quand le lien apparaît après la vérification de session. L'en-tête est une boîte flexible qui passe à la ligne (`flex-wrap`, écart `spacing.xs` vertical / `spacing.md` horizontal ; lien de contribution poussé à droite par `margin-inline-start: auto` ; zone de compte sur toute la largeur, `flex-basis: 100%`) : quand le texte grandit (zoom, grande police), le lien passe sous la marque au lieu de la recouvrir.

```
┌────────────────────────────────────┐
│ AcroFunJam          [À valider (3)]│  rangée 1 : marque + contribution, 44 px
│ bruno@exa…        [Se déconnecter] │  rangée 2 : compte, 44 px
└────────────────────────────────────┘
```

À 320 px : marque ~120 px + écart `spacing.md` + lien ~130 px (« 99+ » compris) = ~266 px pour 288 px utiles. Si le texte est agrandi (réglage du navigateur), la rangée 1 passe à la ligne (`flex-wrap: wrap`, écart `spacing.xs`) et le lien se place sous la marque, aligné à droite : aucun défilement horizontal.

Réalisation : la grille mobile actuelle (`.site-header__inner`, une colonne) devient deux colonnes `minmax(0, 1fr) auto` ; marque en colonne 1, contribution en colonne 2, compte sur toute la largeur en rangée 2 (`grid-column: 1 / -1`).

**Grand écran (≥ 640 px)** : une rangée. Marque, puis contribution (marge à gauche `spacing.lg`), puis compte poussé à droite (`margin-inline-start: auto`) ; l'adresse e-mail reste l'élément qui se tronque.

```
640–1023 px :
│ AcroFunJam  [À valider (3)]          bruno@example.org [Se déconnecter] │

≥ 1024 px :
│ AcroFunJam  [Propositions à valider (3)]      bruno@example.org [Se déconnecter] │
```

À 640 px : marque 120 + 24 + lien ~130 + compte (« Se déconnecter » ~140) laissent ~170 px à l'adresse. Avec le libellé long dès 640 px, l'adresse tomberait à quelques caractères : d'où le libellé court jusqu'à 1024 px.

### Pas de clignotement

- Le lien n'apparaît qu'une fois la session connue et le rôle confirmé ; pendant l'attente, rien n'est affiché à sa place (ni squelette, ni lien grisé).
- La pastille apparaît quand le nombre est reçu ; le lien s'élargit alors vers la gauche (mobile, aligné à droite) ou vers la droite (grand écran), sans décaler le contenu de la page.
- Le nombre se met à jour après une décision sans animation.
