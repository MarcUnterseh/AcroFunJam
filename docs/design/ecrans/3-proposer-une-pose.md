# Écrans de la story 3 « Proposer une pose » et refonte du catalogue

Composants : `../composants/` (nouveaux : `carte-pose.md`, `groupe-tuiles-radio.md`, `panneau-succes.md`, `lien-bouton.md`, `legende-echelle.md`). Principes et tokens : `../principes.md`. Scénarios : `specs/features/contribution/proposer-une-pose.feature`, `specs/features/catalogue/consulter-les-poses.feature`. Structure, textes et comportements : recommandations de l'`ux-expert` validées le 2026-11-03 ; textes marqués « proposé » à confirmer.

Gabarit commun (en-tête, bandeau, `main`, annonce de statut) : `2b-se-connecter-sur-le-site.md`.

## Catalogue (`/`)

### Ordre du contenu

1. En-tête de page : `h1` « Catalogue des poses » + lien-bouton primaire « Proposer une pose » (**personne connectée seulement** ; absent, et non masqué, pour un visiteur ou tant que la session est en attente) ;
2. nombre de poses : « 12 poses, par ordre alphabétique » (« 1 pose, … » au singulier) ;
3. légende de l'échelle puis avertissement de responsabilité (`legende-echelle.md`) ;
4. grille des cartes (`ul` > `li` > `carte-pose.md`).

### Mobile (< 640 px)

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│ alice@exa… [Se déconnecter]    │  en-tête, connecté
├────────────────────────────────┤
│                                │  spacing.lg
│ Catalogue des poses            │  h1
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │   (+) Proposer une pose    │ │  lien-bouton primaire, pleine largeur
│ └────────────────────────────┘ │
│                                │  spacing.lg
│ 12 poses, par ordre            │  size.md, textMuted
│ alphabétique                   │
│                                │  spacing.sm
│ Niveaux de difficulté, du plus │  légende, size.sm
│ accessible au plus exigeant :  │
│ ●○○○ Découverte  ●●○○ Débutant │
│ ●●●○ Intermédiaire ●●●● Avancé │
│ Tu restes juge de tes limites :│  avertissement, size.sm, textMuted
│ pratique à ton niveau et…      │
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │ Bird                       │ │  carte
│ │ Base       Découverte ●○○○ │ │
│ │ Flyer      Découverte ●○○○ │ │
│ │ ────────────────────────── │ │
│ │ Peut commencer un flow ✓Oui│ │
│ │ Peut terminer un flow  ✓Oui│ │
│ └────────────────────────────┘ │
│                                │  spacing.md
│ ┌────────────────────────────┐ │
│ │ Folded Leaf                │ │
│ │ …                          │ │
```

### Grand écran (≥ 640 px, puis ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AcroFunJam                               alice@example.org [Se déconnecter]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ Catalogue des poses                                  [(+) Proposer une pose] │
│ 12 poses, par ordre alphabétique                                             │
│ Niveaux de difficulté, du plus accessible au plus exigeant : ●○○○ Découverte  ●●○○ Débutant  ●●●○ Intermédiaire  ●●●● Avancé │
│ Tu restes juge de tes limites : pratique à ton niveau et prévois un spotter quand tu en as besoin. │
│                                                                              │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐   │
│ │ Bird                 │ │ Folded Leaf          │ │ Hand-to-Hand (L-base)│   │
│ │ Base   Découverte ●○○○│ │ Base   Débutant ●●○○ │ │ Base Intermédiaire ●●●○│ │
│ │ Flyer  Découverte ●○○○│ │ Flyer  Découverte ●○○○│ │ Flyer     Avancé ●●●●│  │
│ │ ──────────────────── │ │ ──────────────────── │ │ ──────────────────── │   │
│ │ Peut commencer… ✓ Oui│ │ Peut commencer… – Non│ │ Peut commencer… ✓ Oui│   │
│ │ Peut terminer…  ✓ Oui│ │ Peut terminer…  ✓ Oui│ │ Peut terminer…  – Non│   │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘   │
```

(Termes abrégés sur la maquette ASCII seulement : ils sont toujours écrits en entier.)

| Zone | Mobile | ≥ `breakpoints.md` (640) | ≥ `breakpoints.lg` (1024) |
|---|---|---|---|
| En-tête de page | `h1` puis lien-bouton pleine largeur, écart `spacing.md` | une rangée : `h1` à gauche, lien-bouton à droite (largeur du contenu), `align-items: center`, `flex-wrap: wrap`, écart `spacing.md` ; `h1` sans marge basse | idem |
| Marge sous l'en-tête de page | `spacing.lg` | `spacing.md` | `spacing.md` |
| Nombre de poses | `size.md`, `textMuted`, marge basse `spacing.sm` | idem | idem |
| Légende + avertissement | marge basse `spacing.lg` | idem | idem |
| Grille (`ul`, puces et marges retirées) | 1 colonne, écart `spacing.md` | **2 colonnes**, écart `spacing.lg` | **3 colonnes**, écart `spacing.lg` |

- Grille : `display: grid`, colonnes de même largeur (`repeat(n, minmax(0, 1fr))`), cartes étirées à la hauteur de la rangée. Media queries `40em` et `64em` (= `breakpoints.md` / 16 et `breakpoints.lg` / 16), à garder alignées avec les tokens.
- Sans lien « Proposer une pose » (visiteur, session en attente), le `h1` garde sa marge basse `spacing.lg` en mobile : pas de vide réservé. En grand écran, l'apparition du lien à droite du titre ne décale rien en dessous (même hauteur de rangée : le lien fait 48 px, le titre 35 px, la rangée prend 48 px dans les deux cas grâce à `min-block-size: sizes.control`).
- Le nombre de poses n'est pas un titre ; s'il est annoncé à chaque rechargement (après « Réessayer »), c'est par l'annonce de statut, pas par une région vivante sur le texte lui-même (comportement : `ux-expert`).

### États

**Chargement** : sous le `h1`, un paragraphe `role="status"` « Chargement du catalogue… », `size.md`, `textMuted`. Pas de squelette animé, pas de compteur, de légende ni de grille tant que les poses ne sont pas reçues (on évite d'afficher une légende puis un message d'erreur). Le lien « Proposer une pose » peut apparaître dès que la session est connue.

**Erreur de chargement** (API injoignable) : zone d'alerte (`alerte-formulaire.md`, variante erreur, hors formulaire) :

```
┃ (!) Impossible de charger le catalogue. Vérifie ta
┃     connexion Internet, puis réessaie.
┃     [ Réessayer ]                 <- bouton secondaire, largeur du contenu
```

- Fond `dangerSurface`, barre `danger`, texte `text` (14,4:1) ; bouton secondaire : bordure `border` 3,1:1 sur `dangerSurface`.
- Pendant le nouvel essai : bouton « en cours » (`bouton.md`), libellé proposé « Chargement… ».
- Ni nombre, ni légende, ni grille. Le lien « Proposer une pose » reste affiché pour une personne connectée.

**Vide** (aucune pose publiée) :

```
│ Catalogue des poses            │  h1 (sans le lien « Proposer une pose » en tête)
│                                │
│ ┌────────────────────────────┐ │
│ │ Le catalogue ne contient   │ │  size.md, text
│ │ encore aucune pose.        │ │
│ │                            │ │  spacing.sm
│ │ Propose la première pose   │ │  connecté seulement
│ │ du catalogue.              │ │
│ │                            │ │  spacing.md
│ │ [(+) Proposer une pose   ] │ │  lien-bouton primaire, connecté seulement
│ └────────────────────────────┘ │
```

- Bloc : fond `surface`, contour `borderWidth` `divider`, rayon `radius.md`, padding `spacing.lg` ; texte aligné à gauche ; lien pleine largeur en mobile, largeur du contenu ensuite.
- Le lien de l'en-tête de page **n'est pas répété** dans l'état vide : un seul « Proposer une pose » par page (à confirmer par l'`ux-expert`).
- Ni nombre (« 0 pose »), ni légende, ni avertissement : il n'y a rien à lire avec.
- Visiteur : seulement la première phrase, dans le même bloc.

## Formulaire « Proposer une pose » (`/proposer-une-pose`)

Gabarit des pages d'identité (`2b-se-connecter-sur-le-site.md`), colonne élargie à **`sizes.formWideMaxWidth` (640)** pour que les quatre tuiles de niveau tiennent sur une ligne en grand écran (`groupe-tuiles-radio.md`, « Colonnes »).

### Mobile (< 640 px)

```
┌────────────────────────────────┐
│ AcroFunJam                     │
│ alice@exa… [Se déconnecter]    │
├────────────────────────────────┤
│ Proposer une pose              │  h1
│                                │  spacing.sm
│ Tous les champs sont           │  introduction, size.md, textMuted (proposé)
│ obligatoires.                  │
│                                │  spacing.lg
│ Nom de la pose                 │  champ (champ.md)
│ ┌────────────────────────────┐ │
│ │ Throne                     │ │
│ └────────────────────────────┘ │
│ Le nom usuel de la pose, par   │  aide, size.sm, textMuted
│ exemple Throne ou High Bird.   │
│ 60 caractères au maximum.      │
│                   54 / 60 caractères │  compteur, à partir de 50 caractères
│                                │  spacing.lg
│ Difficulté base                │  legend
│ ┌─────────────┐ ┌─────────────┐│
│ │○ Découverte │ │◉ Débutant   ││  tuiles 2 × 2 (1 colonne sous 360 px)
│ └─────────────┘ └━━━━━━━━━━━━━┘│
│ ┌─────────────┐ ┌─────────────┐│
│ │○ Intermédiaire│ │○ Avancé   ││
│ └─────────────┘ └─────────────┘│
│                                │  spacing.lg
│ Difficulté flyer               │
│ [2 × 2 tuiles]                 │
│                                │  spacing.lg
│ Commencer : le duo s'installe  │  aide commune aux deux questions
│ dans la pose depuis le sol.    │
│ Terminer : le flyer redescend  │
│ au sol directement et sans     │
│ danger.                        │
│                                │  spacing.md
│ Peut-on commencer un flow sur  │  legend
│ cette pose ?                   │
│ [○ Oui      ] [○ Non      ]    │
│                                │  spacing.md
│ Peut-on terminer un flow sur   │
│ cette pose ?                   │
│ [○ Oui      ] [○ Non      ]    │
│                                │  spacing.lg
│ ┌────────────────────────────┐ │
│ │     Proposer la pose       │ │  bouton primaire, pleine largeur
│ └────────────────────────────┘ │  en cours : « Envoi de la proposition… »
└────────────────────────────────┘
```

### Grand écran (≥ 640 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AcroFunJam                               alice@example.org [Se déconnecter]  │
├──────────────────────────────────────────────────────────────────────────────┤
│          ┌────────────────────────────────────────────────────────┐          │
│          │ Proposer une pose                                      │          │
│          │ Tous les champs sont obligatoires.                     │          │
│          │                                                        │          │
│          │ Nom de la pose                                         │          │
│          │ [                                                    ] │          │
│          │ Le nom usuel de la pose, par exemple Throne ou …       │          │
│          │                                                        │          │
│          │ Difficulté base                                        │          │
│          │ [○ Découverte][◉ Débutant][○ Intermédiaire][○ Avancé]  │          │
│          │ Difficulté flyer                                       │          │
│          │ [◉ Découverte][○ Débutant][○ Intermédiaire][○ Avancé]  │          │
│          │                                                        │          │
│          │ Commencer : … Terminer : …                             │          │
│          │ Peut-on commencer un flow sur cette pose ?             │          │
│          │ [○ Oui       ][○ Non       ]                           │          │
│          │ Peut-on terminer un flow sur cette pose ?              │          │
│          │ [○ Oui       ][○ Non       ]                           │          │
│          │                                                        │          │
│          │ [                  Proposer la pose                  ] │          │
│          └────────────────────────────────────────────────────────┘          │
```

- Carte : largeur `sizes.formWideMaxWidth` + 2 × `spacing.xl` de padding ; fond `surface`, contour `borderWidth` `divider`, rayon `radius.lg`, marge haute `spacing.xl` (comme la 2b).
- Entre 640 et ~750 px de fenêtre, la carte est plus étroite que 640 px de contenu : les tuiles restent en 2 × 2 (requête de conteneur), sans défilement horizontal.
- Bouton primaire pleine largeur de la colonne (comme la 2b).

### Espacements verticaux du formulaire

| Entre | Token |
|---|---|
| `h1` et introduction | `spacing.sm` |
| Introduction (ou alerte) et premier champ | `spacing.lg` |
| Groupes successifs (nom, base, flyer, bloc flow, bouton) | `spacing.lg` |
| Aide commune et 1er groupe Oui / Non ; entre les deux groupes Oui / Non | `spacing.md` |
| Legend et tuiles ; erreur et tuiles | `spacing.sm` |

Le formulaire est plus long que ceux de la 2b : `spacing.lg` (au lieu de `md`) entre groupes rend visible où finit un groupe de tuiles et où commence le suivant.

### Compteur de caractères du nom

- Sous l'aide, aligné à droite (`text-align: end`), `size.sm`, `textMuted`, chiffres à chasse fixe (`font-variant-numeric: tabular-nums`) pour que le texte ne tremble pas à la saisie.
- Absent sous 50 caractères ; il apparaît sans décaler l'aide (il est en dessous).
- Au-delà de 60 : `danger`, `weight.semibold`, précédé de l'icône erreur (texte au-delà de la limite proposé : « 61 / 60 caractères, 1 de trop » ; à confirmer par l'`ux-expert`). Le message d'erreur du champ, lui, n'apparaît qu'à l'envoi.

### Introduction pour un validateur ou un administrateur

Encadré d'information statique à la place de « Tous les champs sont obligatoires. » seul :

```
┃ (i) Ton rôle te permet de publier directement : la pose    ← texte proposé, ux-expert
┃     apparaîtra dans le catalogue dès l'envoi.
```

Mêmes tokens que `bandeau-information.md` (fond `infoSurface`, barre `info`, icône info, texte `text` 13,9:1), **sans** bouton « Fermer », largeur de la colonne, marge basse `spacing.sm` (l'introduction qui suit porte déjà la marge `spacing.lg` avant le premier champ). La mention « Tous les champs sont obligatoires. » suit l'encadré en `textMuted`. Pas d'encadré pour un utilisateur : rien d'inhabituel à lui signaler.

### Erreurs de saisie (avant l'envoi)

- **Pas de résumé des erreurs** en haut du formulaire (même règle que la 2b, `alerte-formulaire.md`) : chaque message s'affiche dans son champ ou son `fieldset`, et le focus va au premier élément en erreur (le champ, ou le premier radio du groupe).
- Champ nom : `champ.md` (bordure 2 px `danger`, icône, message sous l'aide).
- Groupes de tuiles : message entre la `legend` et les tuiles, tuiles en bordure 2 px `danger` (`groupe-tuiles-radio.md`).
- Refus de l'API sur le nom (« Une pose de ce nom existe déjà dans le catalogue. ») : affiché comme une erreur du champ nom.

### Alertes (refus global, en haut du formulaire, sous l'introduction)

| Cas | Variante (`alerte-formulaire.md`) | Contenu | Action |
|---|---|---|---|
| AcroFunJam injoignable | erreur (`dangerSurface`, barre `danger`, icône erreur) | message de l'`ux-expert` | bouton secondaire « Réessayer » |
| Session expirée | **information** (`infoSurface`, barre `info`, icône info) : ce n'est pas une faute de la personne, et sa saisie est conservée | message de l'`ux-expert` | lien « Se connecter », `text` souligné, `semibold` |

- La saisie reste affichée sous l'alerte, telle quelle (tuiles cochées comprises).
- Sur cette page, le bandeau global « session expirée » n'apparaît pas (l'alerte le remplace).

### Pendant l'envoi

Bouton « en cours » (`bouton.md`) : « Envoi de la proposition… », `aria-disabled`, couleurs inchangées. Les champs et tuiles restent dans leur état (pas de grisé).

### Succès

Le formulaire (et l'introduction) est remplacé par le panneau de succès (`panneau-succes.md`) ; le `h1` « Proposer une pose » reste.

```
│ Proposer une pose              │  h1
│                                │  spacing.lg
│ ┃ (✓)                          │
│ ┃ Merci, ta proposition est    │  h2 (utilisateur)
│ ┃ envoyée.                     │  validateur : « La pose « Throne » est publiée. »
│ ┃ Un validateur va l'examiner… │
│                                │  spacing.lg
│ [   Proposer une autre pose  ] │  bouton primaire
│ [      Voir le catalogue     ] │  lien-bouton secondaire
```

En grand écran, le panneau est dans la carte (`successSurface` sur `surface`), padding `spacing.lg` sur les quatre côtés, actions côte à côte sous le panneau. Statut illisible (API plus récente que le site) : titre neutre « Ta proposition est envoyée. », sans texte, mêmes actions.

### Visiteur qui ouvre directement la page

Redirection vers « Se connecter » (comportement) : aucun écran propre ; le formulaire n'apparaît jamais, même une fraction de seconde (pendant la vérification de session, `main` n'affiche que le `h1`).

## Check-list visuelle pour l'implémentation

- Aucune valeur en dur ; nouvelles variables : `--afj-color-selected`, `--afj-color-selected-surface`, `--afj-size-form-wide-max-width`, `--afj-size-tile-min-width`, `--afj-size-icon-large`, `--afj-size-scale-dot`.
- Seuils en `em` dans les media queries (40em, 64em) et requêtes de conteneur (19.5em, 39.5em), commentés avec le token d'origine.
- Tuiles : `label` englobant, radio natif visible, `:has(:checked)` et `:has(:focus-visible)` ; jamais `outline: none` sans l'anneau de la tuile.
- Difficulté jamais codée par la couleur ; échelle à points `aria-hidden`.
- Cible ≥ 44 px partout (tuiles 48, liens-boutons 48, « Réessayer » 44).
- 320 px (zoom 400 % sur 1280 px) : tuiles en une colonne, valeurs des cartes sous leur terme ; zoom 200 % : tuiles 2 × 2 ; aucun défilement horizontal (1.4.10).
- `forced-colors: active` vérifié sur les tuiles (état coché visible) et le lien-bouton primaire.
